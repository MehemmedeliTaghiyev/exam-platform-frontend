const DEFAULT_TIMEOUT_MS = 90000;

function readPath(req) {
  const url = new URL(req.url || '/', 'http://localhost');
  const fromQuery = url.searchParams.get('path');
  const qs = new URLSearchParams(url.searchParams);
  qs.delete('path');
  const suffix = qs.toString();
  let pathname;
  if (fromQuery) {
    pathname = `/${String(fromQuery).replace(/^\/+/, '')}`;
  } else {
    const raw = url.pathname.replace(/^\/api\/pipeline\/?/, '/').replace(/^\/pipeline\/?/, '/');
    pathname = raw === '/' || raw === '' ? '/' : (raw.startsWith('/') ? raw : `/${raw}`);
  }
  return suffix ? `${pathname}?${suffix}` : pathname;
}

function allowed(path) {
  const clean = path.split('?')[0];
  return (
    clean === '/order'
    || clean === '/weekly'
    || clean === '/archive'
    || clean === '/weeks'
    || /^\/exams\/[^/]+$/.test(clean)
    || clean === '/attempts'
  );
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return JSON.stringify(req.body);
  }
  if (typeof req.body === 'string') return req.body;
  if (!req.on) return '';
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export async function proxyPipeline(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const base = String(process.env.PIPELINE_API_URL || '').replace(/\/+$/, '');
  if (!base) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      code: 'pipeline_unconfigured',
      error: 'PIPELINE_API_URL is not set. Point it at the DİM pipeline HTTP adapter.',
    }));
    return;
  }

  const path = readPath(req);
  const pathname = path.split('?')[0];
  if (!allowed(pathname)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Unknown pipeline route', path: pathname }));
    return;
  }

  const key = process.env.PIPELINE_API_KEY || '';
  const headers = {
    Accept: 'application/json',
  };
  if (key) {
    headers.Authorization = `Bearer ${key}`;
    headers['X-Pipeline-Key'] = key;
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await readBody(req);
    if (body) headers['Content-Type'] = 'application/json';
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
      method: req.method,
      headers,
      body,
      signal: ctrl.signal,
    });
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(text);
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    res.statusCode = aborted ? 504 : 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: aborted ? 'Pipeline timed out' : String(err?.message || 'Pipeline unreachable'),
    }));
  } finally {
    clearTimeout(timer);
  }
}

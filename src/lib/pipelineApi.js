async function pipelineFetch(path, options = {}) {
  const url = `/pipeline${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.code || 'Pipeline xətası');
    err.code = data.code || `http_${res.status}`;
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export function pipelineUnconfigured(err) {
  return err?.code === 'pipeline_unconfigured' || err?.status === 503;
}

export function fetchPipelineCatalog() {
  return pipelineFetch('/catalog');
}

export function orderPipelineQuiz(body) {
  return pipelineFetch('/order', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchPipelineWeekly(body) {
  return pipelineFetch('/weekly', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchPipelineArchive(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')),
  ).toString();
  return pipelineFetch(`/archive${query ? `?${query}` : ''}`);
}

export function fetchPipelineWeeks(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')),
  ).toString();
  return pipelineFetch(`/weeks${query ? `?${query}` : ''}`);
}

export function fetchPipelineExam(examId, lang = 'az') {
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  return pipelineFetch(`/exams/${encodeURIComponent(examId)}${query}`);
}

export function logPipelineAttempt(body) {
  return pipelineFetch('/attempts', { method: 'POST', body: JSON.stringify(body) });
}

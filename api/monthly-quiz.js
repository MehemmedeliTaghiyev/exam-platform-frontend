import { peekMonthlyQuizRam, seedMonthlyQuizRam } from './monthlyQuizRam.js';

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const month = String(req.query?.month || '').trim();
  if (req.method === 'GET') {
    const hit = peekMonthlyQuizRam(month);
    json(res, 200, { month, source: hit?.length ? 'ram' : 'empty', questions: hit || [] });
    return;
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    const questions = seedMonthlyQuizRam(body.month || month, body.questions);
    json(res, 200, { month: body.month || month, source: 'ram', questions: questions || [] });
    return;
  }
  json(res, 405, { error: 'method' });
}

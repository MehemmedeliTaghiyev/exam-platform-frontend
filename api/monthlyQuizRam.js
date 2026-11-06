const papers = new Map();
const inflight = new Map();

function monthOf(value) {
  return String(value || '').trim() || new Date().toISOString().slice(0, 7);
}

export function peekMonthlyQuizRam(month) {
  return papers.get(monthOf(month)) || null;
}

export function seedMonthlyQuizRam(month, questions) {
  const key = monthOf(month);
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) return peekMonthlyQuizRam(key);
  if (!papers.has(key)) papers.set(key, list);
  return papers.get(key);
}

export async function getMonthlyQuizRam(month, loader) {
  const key = monthOf(month);
  const hit = papers.get(key);
  if (hit?.length) return { questions: hit, source: 'ram' };
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    let questions = [];
    if (typeof loader === 'function') {
      try {
        questions = await loader(key);
      } catch {
        questions = [];
      }
    }
    if (Array.isArray(questions) && questions.length) {
      papers.set(key, questions);
      return { questions, source: 'ram' };
    }
    return { questions: [], source: 'empty' };
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

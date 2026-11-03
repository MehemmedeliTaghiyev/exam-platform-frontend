import { fetchPipelineCatalog, pipelineUnconfigured } from './pipelineApi';

const FALLBACK_CATALOG = '/quiz-catalog.json';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeQuizPack(row, index = 0) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || row.packId || `pack-${index + 1}`).trim();
  const title = String(row.title || row.name || id).trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    subject: String(row.subject || row.fenn || '').trim(),
    grade: String(row.grade || row.sinif || '11').trim(),
    kind: String(row.kind || row.nov || 'Sınaq').trim(),
    durationMinutes: Number(row.durationMinutes || row.duration || 90) || 90,
    totalQuestions: Number(row.totalQuestions || row.questionsCount || 25) || 25,
    driveFileId: String(row.driveFileId || row.driveId || '').trim(),
    pdfUrl: String(row.pdfUrl || row.pdf || row.url || '').trim(),
    latexSource: String(row.latexSource || row.latex || '').trim(),
    questions: Array.isArray(row.questions)
      ? row.questions.map((q, qi) => ({
        text: String(q?.text || q?.latex || q?.questionText || '').trim(),
        options: Array.isArray(q?.options) ? q.options : [],
        index: qi + 1,
      })).filter((q) => q.text)
      : [],
    week: String(row.week || '').trim(),
    status: String(row.status || 'ready').trim(),
  };
}

export function normalizeWeeklyQuiz(row, index = 0) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || `week-${index + 1}`).trim();
  const title = String(row.title || row.name || id).trim();
  if (!id || !title) return null;
  return {
    id,
    week: String(row.week || '').trim(),
    index: Number(row.index || index + 1) || index + 1,
    title,
    packId: String(row.packId || '').trim(),
    status: String(row.status || 'ready').trim(),
  };
}

export function emptyQuizCatalog() {
  return { version: 1, updatedAt: '', source: '', packs: [], weekly: [], connected: false };
}

export function parseQuizCatalog(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const packs = asList(data.packs).map(normalizeQuizPack).filter(Boolean);
  const weekly = asList(data.weekly).map(normalizeWeeklyQuiz).filter(Boolean);
  return {
    version: Number(data.version) || 1,
    updatedAt: String(data.updatedAt || ''),
    source: String(data.source || ''),
    packs,
    weekly,
    connected: packs.length > 0 || weekly.length > 0,
  };
}

export async function loadQuizCatalog() {
  try {
    const fromHost = parseQuizCatalog(await fetchPipelineCatalog());
    if (fromHost.connected) return { ...fromHost, source: fromHost.source || 'pipeline-http' };
  } catch (err) {
    if (!pipelineUnconfigured(err) && err?.status !== 404) {
      /* JSON fallback */
    }
  }
  const urls = [...new Set([
    String(import.meta.env.VITE_QUIZ_CATALOG_URL || '').trim(),
    FALLBACK_CATALOG,
  ].filter(Boolean))];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const catalog = parseQuizCatalog(await res.json());
      if (catalog.connected || url === FALLBACK_CATALOG) return catalog;
    } catch {
      /* next source */
    }
  }
  return emptyQuizCatalog();
}

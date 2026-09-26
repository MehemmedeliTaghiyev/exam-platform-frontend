import API from '../api/axios';
import { localDb } from './localDb';
import { toDateInput, unwrapList } from './utils';

export const AI_FEATURES = [
  { key: 'autoExam', label: 'Avtomatik imtahan' },
  { key: 'pdfExtract', label: 'PDF-dən sual' },
  { key: 'difficulty', label: 'Çətinlik / anlayış' },
];

export function usageDayKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return toDateInput(d);
}

export function normalizeUsageEvent(ev) {
  if (!ev) return null;
  const feature = ev.feature || ev.Feature || ev.key;
  const at = ev.at || ev.At || ev.createdAt || ev.CreatedAt;
  if (!feature || !at) return null;
  return { feature: String(feature), at };
}

export function eventsFromTeacher(teacher) {
  if (!teacher?.id) return [];
  const remote = unwrapList(teacher?.aiUsage || teacher?.AiUsage || teacher?.aiUsageEvents);
  return localDb.mergeAiUsage(teacher.id, remote.map(normalizeUsageEvent).filter(Boolean));
}

export function filterEventsByRange(events, fromKey, toKey) {
  return (events || []).filter((ev) => {
    const day = usageDayKey(ev.at);
    if (!day) return false;
    if (fromKey && day < fromKey) return false;
    if (toKey && day > toKey) return false;
    return true;
  });
}

export function totalsByFeature(events) {
  const totals = Object.fromEntries(AI_FEATURES.map((f) => [f.key, 0]));
  (events || []).forEach((ev) => {
    if (totals[ev.feature] == null) totals[ev.feature] = 0;
    totals[ev.feature] += 1;
  });
  return totals;
}

export function groupUsageByDate(events) {
  const days = new Map();
  (events || []).forEach((ev) => {
    const day = usageDayKey(ev.at);
    if (!day) return;
    if (!days.has(day)) days.set(day, Object.fromEntries(AI_FEATURES.map((f) => [f.key, 0])));
    const row = days.get(day);
    if (row[ev.feature] == null) row[ev.feature] = 0;
    row[ev.feature] += 1;
  });
  return Array.from(days.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, counts]) => ({
      day,
      counts,
      total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    }));
}

export async function recordAiUsage(teacherId, feature) {
  if (!teacherId || !feature) return;
  const event = { feature, at: new Date().toISOString() };
  localDb.addAiUsage(teacherId, event);
  try {
    await API.post(`/Users/${teacherId}/ai-usage`, event, { timeout: 8000 });
  } catch {
    /* local journal is enough until API exists */
  }
}

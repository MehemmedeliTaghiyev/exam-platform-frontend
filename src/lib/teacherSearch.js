import { PREFERENCE_OPTIONS } from './storageCatalog.js';

export function emptyTeacherSearch() {
  return { query: '', region: 'all', subject: 'all' };
}

export function teacherSearchActive({ query = '', region = 'all', subject = 'all' } = {}) {
  return Boolean(String(query || '').trim() || (region && region !== 'all') || (subject && subject !== 'all'));
}

export function directoryRowFromUser(teacher, prev = null) {
  const teaching = String(teacher?.teachingSubject || teacher?.TeachingSubject || '').trim();
  const subjects = [...new Set([
    ...(prev?.subjects || []),
    ...(teacher?.subjects || []),
    ...(teaching ? [teaching] : []),
  ].filter(Boolean))];
  const id = teacher?.id ?? teacher?.Id;
  return {
    id,
    fullName: teacher?.fullName || teacher?.FullName || teacher?.email || teacher?.Email || prev?.fullName || `Müəllim #${id}`,
    position: teacher?.position || teacher?.Position || prev?.position || 'Digər',
    email: teacher?.email || teacher?.Email || prev?.email,
    subjects,
    isAccessEnabled: (teacher?.isAccessEnabled ?? teacher?.IsAccessEnabled) !== false,
  };
}

export function mergeTeacherDirectory(lists = []) {
  const map = new Map();
  lists.flat().forEach((teacher) => {
    const id = teacher?.id ?? teacher?.Id;
    if (id == null) return;
    map.set(String(id), directoryRowFromUser(teacher, map.get(String(id))));
  });
  return Array.from(map.values());
}

export function uniqueRegions(teachers) {
  return [...new Set((teachers || []).map((t) => t.position || 'Digər'))].sort((a, b) =>
    a.localeCompare(b, 'az'),
  );
}

export function uniqueTeacherSubjects(teachers) {
  return [...new Set([
    ...(PREFERENCE_OPTIONS.subjects || []),
    ...(teachers || []).flatMap((t) => t.subjects || []),
  ])].sort((a, b) => a.localeCompare(b, 'az'));
}

export function filterSortTeachers(teachers, {
  query = '',
  region = 'all',
  subject = 'all',
  sortBy = 'rank',
  dir = 'desc',
} = {}) {
  const q = query.trim().toLowerCase();
  let rows = (teachers || []).filter((t) => {
    if (region !== 'all' && String(t.position || 'Digər') !== region) return false;
    if (subject !== 'all' && !(t.subjects || []).includes(subject)) return false;
    if (!q) return true;
    const hay = `${t.fullName} ${t.position} ${(t.subjects || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
  const sign = dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'weekly') cmp = a.weeklyExamCount - b.weeklyExamCount;
    else if (sortBy === 'avg') cmp = a.avgScore - b.avgScore;
    else if (sortBy === 'region') cmp = String(a.position || '').localeCompare(String(b.position || ''), 'az');
    else if (sortBy === 'subject') cmp = String((a.subjects || [])[0] || '').localeCompare(String((b.subjects || [])[0] || ''), 'az');
    else if (sortBy === 'name') cmp = String(a.fullName || '').localeCompare(String(b.fullName || ''), 'az');
    else {
      cmp = a.weeklyExamCount - b.weeklyExamCount;
      if (!cmp) cmp = a.avgScore - b.avgScore;
      if (!cmp) cmp = String(a.fullName || '').localeCompare(String(b.fullName || ''), 'az');
    }
    if (sortBy === 'rank') return -cmp || 0;
    return cmp * sign || String(a.fullName || '').localeCompare(String(b.fullName || ''), 'az');
  });
  if (sortBy === 'rank' && dir === 'asc') rows.reverse();
  return rows;
}

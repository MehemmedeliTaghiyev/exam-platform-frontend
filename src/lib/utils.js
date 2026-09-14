export function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  return data.items || data.data || data.result || data.exams || data.questions || [];
}

export function unwrapItem(data) {
  if (!data) return null;
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  return data;
}

export function normalizeRole(role) {
  if (role === 'Admin' || role === 0 || role === '0') return 'Admin';
  if (role === 'Teacher' || role === 1 || role === '1') return 'Teacher';
  if (role === 'Student' || role === 2 || role === '2') return 'Student';
  return role || 'Student';
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('az-AZ');
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function fullNameOf(person) {
  if (!person) return 'Naməlum';
  const parts = [person.firstName || person.name, person.lastName || person.surname, person.fatherName]
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  return person.fullName || person.email || 'Naməlum';
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

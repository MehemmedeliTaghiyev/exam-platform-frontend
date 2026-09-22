export function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const candidates = [
    data.items,
    data.data,
    data.result,
    data.exams,
    data.questions,
    data.submissions,
    data.users,
    data.$values,
    data.value,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      if (Array.isArray(candidate.$values)) return candidate.$values;
      if (Array.isArray(candidate.items)) return candidate.items;
      if (Array.isArray(candidate.data)) return candidate.data;
    }
  }

  return [];
}

export function unwrapItem(data) {
  if (!data) return null;
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data) && !data.data.$values) {
    return data.data;
  }
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

export function isLetterOption(opt) {
  return /^[A-E]$/i.test(String(opt?.optionText || opt?.text || '').trim());
}

export function isOpenChoiceOption(opt) {
  return /^(açıq|aciq|digər|diger|other)$/i.test(String(opt?.optionText || opt?.text || '').trim());
}

export function optionLetter(opt) {
  const t = String(opt?.optionText || opt?.text || '').trim();
  if (/^[A-E]$/i.test(t)) return t.toUpperCase();
  if (isOpenChoiceOption(opt)) return 'OPEN';
  return t;
}

export function daysUntil(value) {
  const d = parseExamDate(value) || (value ? new Date(value) : null);
  if (!d || Number.isNaN(d.getTime())) return null;
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function toDateInput(value) {
  const d = parseExamDate(value) || (value ? new Date(value) : null);
  if (!d || Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(value) {
  const d = parseExamDate(value) || (value ? new Date(value) : null);
  if (!d || Number.isNaN(d.getTime())) return value ? String(value) : '—';
  return d.toLocaleDateString('az-AZ');
}

export function formatDateTime(value) {
  const d = parseExamDate(value) || (value ? new Date(value) : null);
  if (!d || Number.isNaN(d.getTime())) return value ? String(value) : '—';
  return d.toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatHms(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function durationSecondsBetween(start, end) {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 1000));
}

export function parseExamDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const hasZone = /Z$/i.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw);
  const normalized = hasZone ? raw : `${raw.replace(/\.\d+$/, '')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
  return d;
}

export function isValidExamDate(value) {
  return Boolean(parseExamDate(value));
}

export function resolveExamStatus(exam) {
  if (!exam) return 'Live';
  const start = parseExamDate(exam.startTime || exam.StartTime);
  const end = parseExamDate(exam.endTime || exam.EndTime);
  const now = Date.now();
  const raw = String(exam.status || exam.Status || '').toLowerCase();
  if (raw === 'draft' || raw === '0') return 'Draft';

  if (end && end.getTime() <= now) return 'Finished';
  if (start && start.getTime() > now) return 'Scheduled';
  if (raw === 'live' || raw === '2') return 'Live';
  if ((raw === 'finished' || raw === '3') && (!end || end.getTime() <= now)) return 'Finished';
  if (raw === 'scheduled' || raw === '1') return 'Scheduled';
  return 'Live';
}

export function isExamEnded(exam) {
  return resolveExamStatus(exam) === 'Finished';
}

export function isExamLive(exam) {
  return resolveExamStatus(exam) === 'Live';
}

export function isExamScheduled(exam) {
  return resolveExamStatus(exam) === 'Scheduled';
}

export function isExamDraft(exam) {
  return resolveExamStatus(exam) === 'Draft';
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function fullNameOf(person) {
  if (!person) return 'Naməlum';
  const parts = [person.firstName || person.name, person.lastName || person.surname, person.fatherName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return person.fullName || person.email || 'Naməlum';
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function errorMessage(err, fallback = 'Xəta baş verdi') {
  const status = err?.response?.status;
  const api = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:5000/api');
  if (status === 401 && !err?.response?.data) {
    return 'API şifrə ilə qorunur. SmarterASP-də Temp URL / Directory password-u söndürün, sonra yenidən cəhd edin.';
  }
  if (status === 502 || status === 503 || status === 504 || err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
    return `API-yə qoşulmaq olmadı (${api}). SmarterASP saytında password protection söndürün və backend-in işlədiyini yoxlayın.`;
  }
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data?.message === 'string') {
    return data.detail ? `${data.message} (${data.detail})` : data.message;
  }
  if (typeof data?.title === 'string') return data.title;
  if (typeof err?.message === 'string' && err.message !== 'Network Error') return err.message;
  return fallback;
}

export function resolveFileUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const api = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
  const origin = String(api).replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function examPdfUrl(exam) {
  if (!exam) return '';
  const raw = exam.pdfFileUrl || exam.pdfFilePath || exam.PdfFileUrl || exam.PdfFilePath || '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const path = new URL(raw).pathname;
      if (path.startsWith('/uploads')) return path;
    } catch {
      return raw;
    }
    return raw;
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

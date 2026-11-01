import { PIPELINE_PROXY, parseLang, pipelineErrorMessage } from './contract';

async function pipelineFetch(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body != null) headers['Content-Type'] = 'application/json';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Access-Token'] = token;
  }
  const res = await fetch(`${PIPELINE_PROXY}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(pipelineErrorMessage({ data }));
    err.status = res.status;
    err.data = data;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export function orderTeacherQuiz(input) {
  return pipelineFetch('/order', {
    method: 'POST',
    body: {
      audience: 'teacher',
      subject: input.subject || 'math',
      language: parseLang(input.language),
      grade: String(input.grade || '11'),
      count: Number(input.count) || 10,
      level: input.level || 'medium',
      topics: String(input.topics || '').trim(),
      order: input.order || 'difficulty',
    },
  });
}

export function ensureWeeklyPair(input = {}) {
  return pipelineFetch('/weekly', {
    method: 'POST',
    body: {
      audience: 'weekly',
      subject: input.subject || 'math',
      language: parseLang(input.language),
      grade: String(input.grade || '11'),
      group_id: input.groupId || input.group_id || 'general',
      week: input.week || undefined,
      count: Number(input.count) || 10,
    },
  });
}

export function fetchWeeklyArchive({ week, grade = '11', groupId = 'general', subject = 'math' } = {}) {
  const q = new URLSearchParams({
    week: week || '',
    grade: String(grade),
    group_id: groupId || 'general',
    subject,
  });
  return pipelineFetch(`/archive?${q}`);
}

export function fetchPreviousWeeks({ grade = '11', groupId = 'general', subject = 'math' } = {}) {
  const q = new URLSearchParams({
    grade: String(grade),
    group_id: groupId || 'general',
    subject,
  });
  return pipelineFetch(`/weeks?${q}`);
}

export function fetchPipelineExam(examId, lang = 'az') {
  const q = new URLSearchParams({ lang: parseLang(lang) });
  return pipelineFetch(`/exams/${encodeURIComponent(examId)}?${q}`);
}

export function submitPipelineAttempts({ examId, studentId, groupId, attempts }) {
  return pipelineFetch('/attempts', {
    method: 'POST',
    body: {
      exam_id: examId,
      student_id: String(studentId ?? ''),
      group_id: groupId || 'general',
      source: 'exampulse',
      attempts,
    },
  });
}

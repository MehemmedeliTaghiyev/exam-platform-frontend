import API from '../api/axios';
import { localDb } from './localDb';
import { unwrapList, unwrapItem, uid, percent, resolveExamStatus, examPdfUrl } from './utils';

const FAST = { timeout: 20000 };

async function tryGet(url) {
  const res = await API.get(url, FAST);
  return res.data;
}

function withCounts(exams) {
  const submissions = localDb.getSubmissions();
  return exams.map((exam) => {
    const localCount = submissions.filter((s) => String(s.examId) === String(exam.id)).length;
    return {
      ...exam,
      subjectName: exam.subjectName || exam.subject || exam.SubjectName,
      totalQuestions: exam.totalQuestions ?? exam.questionCount ?? exam.TotalQuestions,
      durationMinutes: exam.durationMinutes ?? exam.DurationMinutes,
      startTime: exam.startTime || exam.StartTime,
      endTime: exam.endTime || exam.EndTime,
      status: resolveExamStatus(exam),
      submissionsCount: Math.max(exam.submissionsCount || 0, localCount),
    };
  });
}

export async function fetchSubjects() {
  try {
    const data = await tryGet('/Subjects');
    const list = unwrapList(data).map((s) => ({
      id: s.id ?? s.subjectId,
      name: s.name || s.title || s.subjectName,
    })).filter((s) => s.id != null && s.name);
    if (list.length) {
      localDb.saveSubjects(list);
      return list;
    }
  } catch {
    /* local */
  }
  return localDb.getSubjects();
}

export async function createSubject(name) {
  const trimmed = name.trim();
  try {
    const res = await API.post('/Subjects', { name: trimmed, Name: trimmed }, FAST);
    const item = unwrapItem(res.data) || {};
    const subject = {
      id: item.id ?? item.subjectId ?? Date.now(),
      name: item.name || item.title || trimmed,
    };
    const existing = localDb.getSubjects();
    if (!existing.some((s) => String(s.id) === String(subject.id))) {
      localDb.saveSubjects([...existing, subject]);
    }
    return subject;
  } catch {
    return localDb.addSubject(trimmed);
  }
}

export async function fetchExams() {
  let remote = [];
  try {
    const data = await tryGet('/Exams');
    remote = unwrapList(data);
  } catch {
    remote = [];
  }

  const local = localDb.getExams();
  const map = new Map();
  [...remote, ...local].forEach((exam) => {
    if (exam?.id != null) map.set(String(exam.id), exam);
  });
  return withCounts(Array.from(map.values()).sort((a, b) => {
    const da = new Date(b.createdAt || 0).getTime();
    const db = new Date(a.createdAt || 0).getTime();
    return da - db;
  }));
}

function toLocalExam(payload, created = {}, source = 'remote') {
  return {
    id: created.id ?? created.examId ?? created.Id ?? uid('exam'),
    title: created.title || created.Title || payload.title,
    subjectId: created.subjectId || created.SubjectId || payload.subjectId,
    subjectName: created.subjectName || created.SubjectName || payload.subjectName,
    totalQuestions: created.totalQuestions || created.TotalQuestions || payload.totalQuestions,
    durationMinutes: created.durationMinutes || created.DurationMinutes || payload.durationMinutes,
    description: created.description || created.Description || payload.description,
    teacherId: payload.teacherId,
    createdAt: created.createdAt || created.CreatedAt || new Date().toISOString(),
    startTime: created.startTime || created.StartTime || payload.startTime,
    endTime: created.endTime || created.EndTime || payload.endTime,
    submissionsCount: created.submissionsCount || 0,
    status: resolveExamStatus({
      ...created,
      startTime: created.startTime || created.StartTime || payload.startTime,
      endTime: created.endTime || created.EndTime || payload.endTime,
      status: created.status || created.Status || payload.status || 'Live',
    }),
    source,
  };
}

export async function createExam(payload) {
  const bodies = [
    {
      title: payload.title,
      description: payload.description,
      totalQuestions: payload.totalQuestions,
      durationMinutes: payload.durationMinutes,
      teacherId: payload.teacherId,
      subjectId: payload.subjectId,
      subjectName: payload.subjectName,
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
    {
      Title: payload.title,
      Description: payload.description,
      TotalQuestions: payload.totalQuestions,
      DurationMinutes: payload.durationMinutes,
      TeacherId: payload.teacherId,
      SubjectId: payload.subjectId,
      SubjectName: payload.subjectName,
      StartTime: payload.startTime,
      EndTime: payload.endTime,
    },
    {
      name: payload.title,
      Name: payload.title,
      subjectId: payload.subjectId,
      SubjectId: payload.subjectId,
      durationMinutes: payload.durationMinutes,
      questionCount: payload.totalQuestions,
    },
  ];

  for (const body of bodies) {
    try {
      const res = await API.post('/Exams', body, FAST);
      const created = unwrapItem(res.data) || res.data || {};
      const exam = toLocalExam(payload, created, 'remote');
      localDb.upsertExam(exam);
      return exam;
    } catch {
      /* try next contract */
    }
  }

  const localExam = toLocalExam(payload, {}, 'local');
  localDb.upsertExam(localExam);
  return localExam;
}

export async function fetchExam(id) {
  let remote = null;
  try {
    const data = await tryGet(`/Exams/${id}`);
    remote = unwrapItem(data);
  } catch {
    remote = null;
  }
  const local = localDb.getExams().find((e) => String(e.id) === String(id)) || null;
  const merged = remote && (remote.title || remote.Title) && local
    ? { ...local, ...remote, title: remote.title || remote.Title || local.title }
    : (withCounts([remote || local].filter(Boolean))[0] || local || remote);
  if (!merged) return merged;
  return {
    ...merged,
    id: merged.id ?? merged.Id ?? id,
    pdfFilePath: merged.pdfFilePath || merged.PdfFilePath || '',
    pdfFileUrl: merged.pdfFileUrl || merged.PdfFileUrl || '',
  };
}

export async function fetchQuestions(examId) {
  const paths = [`/Questions/exam/${examId}`, `/Exams/${examId}/questions`];
  for (const path of paths) {
    try {
      const res = await API.get(path, { timeout: 15000 });
      const list = Array.isArray(res.data) ? res.data : unwrapList(res.data);
      return list.map(normalizeQuestion);
    } catch {
      /* try next */
    }
  }
  return localDb.getQuestions(examId);
}

function normalizeQuestion(q) {
  return {
    ...q,
    id: q.id ?? q.questionId,
    text: q.text || q.questionText || q.title,
    options: (q.options || q.answers || []).map((opt) => ({
      ...opt,
      id: opt.id ?? opt.optionId,
      optionText: opt.optionText || opt.text,
      text: opt.text || opt.optionText,
    })),
  };
}

export async function addQuestion(examId, payload) {
  const urls = [`/Questions/exam/${examId}`, `/Exams/${examId}/questions`];
  const bodies = [
    payload,
    {
      Text: payload.text,
      Points: payload.points ?? 1,
      Type: payload.type ?? 0,
      Options: payload.options,
    },
  ];

  let lastError;
  for (const url of urls) {
    for (const body of bodies) {
      try {
        await API.post(url, body, { timeout: 15000 });
        const list = await fetchQuestions(examId);
        if (list.length) return list[list.length - 1];
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error('Sual serverə yazılmadı.');
}

export async function fetchExamPdfBytes(exam) {
  const examId = exam?.id ?? exam?.Id;
  const path = examPdfUrl(exam);
  const buffers = [];

  if (examId) {
    try {
      const res = await API.get(`/Exams/${examId}/pdf`, { responseType: 'arraybuffer', timeout: 60000 });
      buffers.push(res.data);
    } catch {
      /* try public file */
    }
  }

  const urls = [];
  if (path.startsWith('/uploads')) {
    urls.push(path);
    urls.push(`http://127.0.0.1:5000${path}`);
  } else if (/^https?:\/\//i.test(path)) {
    urls.push(path);
  }

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      buffers.push(await res.arrayBuffer());
    } catch {
      /* next */
    }
  }

  const pdf = buffers.find(isPdfBuffer);
  if (!pdf) throw new Error('PDF tapılmadı');
  return pdf;
}

function isPdfBuffer(buf) {
  if (!buf) return false;
  const bytes = new Uint8Array(buf);
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function uploadExamPdfPack(examId, file, questionCount) {
  const form = new FormData();
  form.append('file', file);
  form.append('questionCount', String(questionCount));
  const res = await API.post(`/Exams/${examId}/pdf-pack`, form, {
    timeout: 60000,
  });
  return unwrapItem(res.data) || res.data;
}

export async function saveAnswerKey(examId, answers) {
  const res = await API.put(`/Questions/exam/${examId}/answer-key`, { answers }, { timeout: 15000 });
  const list = Array.isArray(res.data) ? res.data : unwrapList(res.data);
  return list.map(normalizeQuestion);
}

export async function fetchQuestionDifficulty(examId) {
  try {
    const res = await API.get(`/Questions/exam/${examId}/difficulty`, { timeout: 8000 });
    return unwrapList(res.data);
  } catch {
    return [];
  }
}

export async function fetchExamSubmissions(examId) {
  try {
    const data = await API.get(`/Submissions/exam/${examId}`, { timeout: 8000 }).then((r) => r.data);
    const list = unwrapList(data);
    if (list.length || Array.isArray(data)) return list;
  } catch {
    /* local */
  }
  return localDb.getSubmissions().filter((s) => String(s.examId) === String(examId));
}

export async function fetchExamReview(studentExamId) {
  const res = await API.get(`/Submissions/review/${studentExamId}`, { timeout: 8000 });
  return unwrapItem(res.data) || res.data;
}

export async function fetchExamReviewByExam(examId) {
  const res = await API.get(`/Submissions/exam/${examId}/review`, { timeout: 8000 });
  return unwrapItem(res.data) || res.data;
}

export async function fetchStudentHistory(studentId) {
  const remote = [];
  try {
    const res = await API.get('/Submissions/history/me', { timeout: 8000 });
    remote.push(...unwrapList(res.data).map(normalizeSubmission));
  } catch {
    if (studentId) {
      try {
        const res = await API.get(`/Submissions/history/${studentId}`, { timeout: 8000 });
        remote.push(...unwrapList(res.data).map(normalizeSubmission));
      } catch {
        /* local */
      }
    }
  }

  const local = localDb.getSubmissions()
    .filter((s) => !studentId || String(s.studentId) === String(studentId))
    .map(normalizeSubmission);

  const map = new Map();
  [...remote, ...local].forEach((item) => {
    const key = String(item.studentExamId || item.id || item.examId);
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

export async function saveExamProgress(payload) {
  if (!payload?.studentExamId) return;
  await API.post('/Submissions/progress', {
    studentExamId: Number(payload.studentExamId) || 0,
    examId: payload.examId,
    studentId: payload.studentId,
    answers: payload.answers || [],
  }, { timeout: 8000 });
}

export async function startExam({ examId, studentId }) {
  const res = await API.post('/Submissions', { examId, studentId }, { timeout: 8000 });
  return unwrapItem(res.data) || res.data;
}

export async function submitExam(payload) {
  try {
    const res = await API.post('/Submissions/submit', {
      studentExamId: payload.studentExamId || 0,
      examId: payload.examId,
      studentId: payload.studentId,
      answers: payload.answers || [],
    }, { timeout: 15000 });
    const created = unwrapItem(res.data) || res.data;
    const normalized = normalizeSubmission({
      ...created,
      examId: created.examId || payload.examId,
      studentId: created.studentId || payload.studentId,
      studentName: created.studentName || payload.studentName,
    });
    localDb.addSubmission(normalized);
    return normalized;
  } catch {
    const questions = localDb.getQuestions(payload.examId);
    let correct = 0;
    payload.answers.forEach((a) => {
      const q = questions.find((x) => String(x.id) === String(a.questionId));
      const opt = q?.options?.find((o) => String(o.id) === String(a.selectedOptionId));
      if (opt?.isCorrect) correct += 1;
    });
    const total = questions.length || payload.answers.length || 1;
    const exam = localDb.getExams().find((e) => String(e.id) === String(payload.examId));
    const submission = {
      id: payload.studentExamId || uid('sub'),
      studentExamId: payload.studentExamId,
      examId: payload.examId,
      examTitle: exam?.title,
      studentId: payload.studentId,
      studentName: payload.studentName,
      score: percent(correct, total),
      percent: percent(correct, total),
      correctAnswersCount: correct,
      totalQuestions: total,
      submittedAt: new Date().toISOString(),
      answers: payload.answers,
    };
    localDb.addSubmission(submission);
    return submission;
  }
}

function normalizeSubmission(item) {
  if (!item || typeof item !== 'object') return item;
  const id = item.id ?? item.studentExamId;
  const total = item.totalQuestions || 1;
  const correct = item.correctAnswersCount ?? 0;
  const percentValue = item.percent ?? item.score ?? percent(correct, total);
  const durationSeconds = item.durationSeconds
    ?? (item.startedAt && item.submittedAt
      ? Math.max(0, Math.round((new Date(item.submittedAt) - new Date(item.startedAt)) / 1000))
      : 0);
  return {
    ...item,
    id,
    studentExamId: item.studentExamId ?? item.id,
    score: percentValue,
    percent: Number(percentValue) || 0,
    durationSeconds,
  };
}

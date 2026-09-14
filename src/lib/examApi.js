import API from '../api/axios';
import { localDb } from './localDb';
import { unwrapList, unwrapItem, uid } from './utils';

async function tryGet(url) {
  const res = await API.get(url);
  return res.data;
}

export async function fetchSubjects() {
  try {
    const data = await tryGet('/Subjects');
    const list = unwrapList(data);
    if (list.length) {
      localDb.saveSubjects(list.map((s) => ({ id: s.id, name: s.name || s.title })));
      return localDb.getSubjects();
    }
  } catch {
    /* local */
  }
  return localDb.getSubjects();
}

export async function createSubject(name) {
  try {
    const res = await API.post('/Subjects', { name });
    const item = unwrapItem(res.data) || { id: res.data?.id, name };
    localDb.addSubject(item.name || name);
    return { id: item.id, name: item.name || name };
  } catch {
    return localDb.addSubject(name);
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
  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(b.createdAt || 0).getTime();
    const db = new Date(a.createdAt || 0).getTime();
    return da - db;
  });
}

export async function createExam(payload) {
  const bodies = [
    payload,
    {
      Title: payload.title,
      TotalQuestions: payload.totalQuestions,
      DurationMinutes: payload.durationMinutes,
      TeacherId: payload.teacherId,
      SubjectId: payload.subjectId,
      SubjectName: payload.subjectName,
      Description: payload.description,
    },
  ];

  let lastError;
  for (const body of bodies) {
    try {
      const res = await API.post('/Exams', body);
      const created = unwrapItem(res.data) || res.data;
      const exam = {
        id: created.id ?? created.examId ?? uid('exam'),
        title: created.title || payload.title,
        subjectId: created.subjectId || payload.subjectId,
        subjectName: created.subjectName || payload.subjectName,
        totalQuestions: created.totalQuestions || payload.totalQuestions,
        durationMinutes: created.durationMinutes || payload.durationMinutes,
        description: created.description || payload.description,
        teacherId: payload.teacherId,
        createdAt: created.createdAt || new Date().toISOString(),
        submissionsCount: created.submissionsCount || 0,
        status: created.status || 'Hazırlanır',
        source: 'remote',
      };
      localDb.upsertExam(exam);
      return exam;
    } catch (err) {
      lastError = err;
    }
  }

  const localExam = {
    id: uid('exam'),
    ...payload,
    createdAt: new Date().toISOString(),
    submissionsCount: 0,
    status: 'Hazırlanır',
    source: 'local',
    warning: lastError?.response?.data || lastError?.message,
  };
  localDb.upsertExam(localExam);
  return localExam;
}

export async function fetchExam(id) {
  try {
    const data = await tryGet(`/Exams/${id}`);
    return unwrapItem(data);
  } catch {
    return localDb.getExams().find((e) => String(e.id) === String(id)) || null;
  }
}

export async function fetchQuestions(examId) {
  try {
    const data = await tryGet(`/Questions/exam/${examId}`);
    const list = unwrapList(data);
    if (list.length) return list.map(normalizeQuestion);
  } catch {
    /* local */
  }
  return localDb.getQuestions(examId);
}

function normalizeQuestion(q) {
  return {
    ...q,
    text: q.text || q.questionText || q.title,
    options: (q.options || []).map((opt) => ({
      ...opt,
      optionText: opt.optionText || opt.text,
      text: opt.text || opt.optionText,
    })),
  };
}

export async function addQuestion(examId, payload) {
  try {
    const res = await API.post(`/Questions/exam/${examId}`, payload);
    const created = unwrapItem(res.data) || { ...payload, id: uid('q') };
    const normalized = normalizeQuestion(created);
    localDb.addQuestion(examId, normalized);
    return normalized;
  } catch {
    const local = {
      id: uid('q'),
      text: payload.text,
      points: payload.points ?? 1,
      type: payload.type ?? 0,
      options: payload.options.map((o, i) => ({
        id: uid('opt'),
        optionText: o.optionText,
        text: o.optionText,
        isCorrect: o.isCorrect,
        letter: String.fromCharCode(65 + i),
      })),
    };
    localDb.addQuestion(examId, local);
    return local;
  }
}

export async function fetchExamSubmissions(examId) {
  const paths = [
    `/Submissions/exam/${examId}`,
    `/Exams/${examId}/submissions`,
    `/Exams/${examId}/statistics`,
  ];
  for (const path of paths) {
    try {
      const data = await tryGet(path);
      const list = unwrapList(data);
      if (list.length) return list;
      if (data && !Array.isArray(data) && (data.submissions || data.results)) {
        return unwrapList(data.submissions || data.results);
      }
    } catch {
      /* next */
    }
  }
  return localDb.getSubmissions().filter((s) => String(s.examId) === String(examId));
}

export async function submitExam(payload) {
  try {
    const res = await API.post('/Submissions', payload);
    return unwrapItem(res.data) || res.data;
  } catch {
    const questions = localDb.getQuestions(payload.examId);
    let correct = 0;
    payload.answers.forEach((a) => {
      const q = questions.find((x) => String(x.id) === String(a.questionId));
      const opt = q?.options?.find((o) => String(o.id) === String(a.selectedOptionId));
      if (opt?.isCorrect) correct += 1;
    });
    const total = questions.length || payload.answers.length;
    const exam = localDb.getExams().find((e) => String(e.id) === String(payload.examId));
    const submission = {
      id: uid('sub'),
      examId: payload.examId,
      examTitle: exam?.title,
      studentId: payload.studentId,
      studentName: payload.studentName,
      score: correct,
      correctAnswersCount: correct,
      totalQuestions: total,
      submittedAt: new Date().toISOString(),
      answers: payload.answers,
    };
    localDb.addSubmission(submission);
    return submission;
  }
}

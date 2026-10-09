const FLAG = 'exampulse_practice_role';
const TEACHER_EXAMS = 'exampulse_practice_texams';
const TEACHER_QS = 'exampulse_practice_tqs';
const STUDENT_SUBS = 'exampulse_practice_subs';

export const PRACTICE_TEACHER_ID = 'practice-teacher';
export const PRACTICE_STUDENT_ID = 'practice-student';

export function isPractice() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return Boolean(user?.practice);
  } catch {
    return false;
  }
}

export function practiceRole() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.practiceRole || sessionStorage.getItem(FLAG) || '';
  } catch {
    return sessionStorage.getItem(FLAG) || '';
  }
}

export function setPracticeRole(role) {
  sessionStorage.setItem(FLAG, role);
}

export function clearPractice() {
  sessionStorage.removeItem(FLAG);
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function choice(id, text, correct, map) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const options = letters.map((L) => ({
    id: `${id}-${L}`,
    letter: L,
    text: map[L] || L,
    optionText: map[L] || L,
    isCorrect: L === correct,
  }));
  options.push({
    id: `${id}-OPEN`,
    letter: 'OPEN',
    text: 'Açıq',
    optionText: 'Açıq',
    isCorrect: false,
  });
  return {
    id,
    text,
    type: 'SingleChoice',
    inputKind: 'Choice',
    difficultyLevel: 'orta',
    points: 2,
    correctLetter: correct,
    options,
  };
}

function liveWindow(minutes) {
  const start = new Date(Date.now() - 60 * 1000).toISOString();
  const end = new Date(Date.now() + (minutes || 20) * 60 * 1000).toISOString();
  return { startTime: start, endTime: end, status: 'Live' };
}

export function defaultStudentExams() {
  return [
    {
      id: 'demo-math',
      title: 'Riyaziyyat sınaq',
      description: 'Məşq imtahanı — sərbəst istifadə',
      subjectName: 'Riyaziyyat',
      teacherId: 'demo',
      teacherName: 'ExamPulse',
      visibility: 'public',
      isPublic: true,
      totalQuestions: 4,
      durationMinutes: 20,
      submissionsCount: 0,
      ...liveWindow(20),
    },
    {
      id: 'demo-az',
      title: 'Azərbaycan dili sınaq',
      description: 'Məşq imtahanı — sərbəst istifadə',
      subjectName: 'Azərbaycan dili',
      teacherId: 'demo',
      teacherName: 'ExamPulse',
      visibility: 'public',
      isPublic: true,
      totalQuestions: 4,
      durationMinutes: 15,
      submissionsCount: 0,
      ...liveWindow(15),
    },
  ];
}

export function defaultStudentQuestions(examId) {
  if (examId === 'demo-math') {
    return [
      choice('dm1', '12 + 8 = ?', 'A', { A: '20', B: '18', C: '22', D: '16', E: '24' }),
      choice('dm2', 'Kvadratın sahəsi a²-dirsə, a=5 olanda sahə?', 'C', { A: '10', B: '20', C: '25', D: '30', E: '15' }),
      choice('dm3', '3x = 15 tənliyində x?', 'B', { A: '3', B: '5', C: '6', D: '15', E: '12' }),
      choice('dm4', 'Hansı ədəd sadədir?', 'D', { A: '9', B: '15', C: '21', D: '17', E: '25' }),
    ];
  }
  if (examId === 'demo-az') {
    return [
      choice('da1', '“Kitab” sözünün cəm forması hansıdır?', 'B', { A: 'kitabı', B: 'kitablar', C: 'kitabın', D: 'kitaba', E: 'kitabda' }),
      choice('da2', 'Sifət hansıdır?', 'A', { A: 'gözəl', B: 'qaçmaq', C: 'ev', D: 'və', E: 'beş' }),
      choice('da3', '“Mən məktəbə gedirəm.” cümləsində fel hansıdır?', 'C', { A: 'mən', B: 'məktəbə', C: 'gedirəm', D: '.', E: 'cəmlik' }),
      choice('da4', 'Sinonim cütlük hansıdır?', 'A', { A: 'böyük — iri', B: 'ağ — qara', C: 'yuxarı — aşağı', D: 'gəl — get', E: 'bir — iki' }),
    ];
  }
  return [];
}

export function practiceTeacherExams() {
  return read(TEACHER_EXAMS, []);
}

export function savePracticeTeacherExams(list) {
  write(TEACHER_EXAMS, list);
}

export function practiceQuestions(examId) {
  if (String(examId).startsWith('demo-')) return defaultStudentQuestions(examId);
  if (practiceRole() === 'Student') return [];
  const all = read(TEACHER_QS, {});
  return all[String(examId)] || [];
}

export function savePracticeQuestions(examId, list) {
  const all = read(TEACHER_QS, {});
  all[String(examId)] = list;
  write(TEACHER_QS, all);
}

export function practiceSubmissions() {
  return read(STUDENT_SUBS, []);
}

export function addPracticeSubmission(item) {
  const list = practiceSubmissions();
  list.unshift(item);
  write(STUDENT_SUBS, list);
  return item;
}

export function practiceFetchExams() {
  if (practiceRole() === 'Student') return defaultStudentExams();
  return practiceTeacherExams();
}

export function practiceFetchExam(id) {
  const list = practiceRole() === 'Student' ? defaultStudentExams() : practiceTeacherExams();
  return list.find((e) => String(e.id) === String(id)) || null;
}

export function practiceCreateExam(payload) {
  const exam = {
    id: `pt-${Date.now()}`,
    title: payload.title,
    description: payload.description || '',
    subjectName: payload.subjectName || 'Məşq',
    subjectId: payload.subjectId,
    teacherId: PRACTICE_TEACHER_ID,
    totalQuestions: payload.totalQuestions || 10,
    durationMinutes: payload.durationMinutes || 45,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: payload.isDraft ? 'Draft' : (payload.status || 'Draft'),
    submissionsCount: 0,
    createdAt: new Date().toISOString(),
    source: 'practice',
    visibility: payload.visibility === 'public' || payload.isPublic ? 'public' : 'private',
    isPublic: payload.visibility === 'public' || payload.isPublic === true,
  };
  const list = practiceTeacherExams();
  list.unshift(exam);
  savePracticeTeacherExams(list);
  return exam;
}

export function practiceUpdateExam(id, payload) {
  const list = practiceTeacherExams().map((e) => (
    String(e.id) === String(id) ? { ...e, ...payload, id: e.id, teacherId: PRACTICE_TEACHER_ID, source: 'practice' } : e
  ));
  savePracticeTeacherExams(list);
  return list.find((e) => String(e.id) === String(id));
}

export function practiceDeleteExam(id) {
  savePracticeTeacherExams(practiceTeacherExams().filter((e) => String(e.id) !== String(id)));
}

export function practiceAddQuestion(examId, payload) {
  const list = practiceQuestions(examId);
  const q = {
    ...payload,
    id: payload.id || `pq-${Date.now()}`,
    options: (payload.options || []).map((o, i) => ({
      ...o,
      id: o.id || `pqo-${Date.now()}-${i}`,
      optionText: o.optionText || o.text,
      text: o.text || o.optionText,
    })),
  };
  list.push(q);
  savePracticeQuestions(examId, list);
  return q;
}

export function practiceStartExam(examId) {
  return { id: `psess-${examId}`, studentExamId: `psess-${examId}`, examId };
}

export function practiceSubmitExam(payload) {
  const questions = practiceQuestions(payload.examId);
  let correct = 0;
  const review = questions.map((q, index) => {
    const a = (payload.answers || []).find((x) => String(x.questionId) === String(q.id)) || {};
    const opt = (q.options || []).find((o) => String(o.id) === String(a.selectedOptionId));
    const ok = Boolean(opt?.isCorrect);
    if (ok) correct += 1;
    return {
      questionId: q.id,
      index: index + 1,
      text: q.text,
      isCorrect: ok,
      unanswered: !a.selectedOptionId && !a.textAnswer,
      options: (q.options || []).filter((o) => String(o.letter || o.optionText) !== 'OPEN' && o.optionText !== 'Açıq').map((o) => ({
        id: o.id,
        text: o.text || o.optionText,
        isCorrect: Boolean(o.isCorrect),
        isSelected: String(o.id) === String(a.selectedOptionId),
      })),
    };
  });
  const total = questions.length || 1;
  const exam = practiceFetchExam(payload.examId);
  const pct = Math.round((correct / total) * 100);
  const item = {
    id: `psub-${Date.now()}`,
    examId: payload.examId,
    examTitle: exam?.title,
    studentId: PRACTICE_STUDENT_ID,
    studentExamId: payload.studentExamId || `psess-${payload.examId}`,
    score: pct,
    percent: pct,
    correctAnswersCount: correct,
    wrongAnswersCount: Math.max(questions.length - correct, 0),
    totalQuestions: questions.length,
    submittedAt: new Date().toISOString(),
    status: 'Submitted',
    examEnded: true,
    questions: review,
  };
  addPracticeSubmission(item);
  return item;
}

export function practiceFindReview(id) {
  const list = practiceSubmissions();
  const found = list.find((s) =>
    String(s.studentExamId) === String(id)
    || String(s.examId) === String(id)
    || String(s.id) === String(id)
  );
  if (!found) {
    return { questions: [], result: { correctAnswersCount: 0, percent: 0 }, examEnded: true, leaderboard: [] };
  }
  return { ...found, result: found, questions: found.questions, examEnded: true, leaderboard: [] };
}

export function practiceWeeklyRankingSource() {
  if (practiceRole() !== 'Teacher') {
    return { exams: practiceFetchExams(), students: [], submissions: practiceSubmissions() };
  }
  const start = new Date();
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset - 5);
  const iso = start.toISOString();
  const exam = { id: 'practice-rank-exam', title: 'Həftəlik sınaq', startTime: iso, status: 'Live' };
  const students = [
    { id: 'own-a', fullName: 'Aysel Məmmədova', teacherId: PRACTICE_TEACHER_ID },
    { id: 'own-b', fullName: 'Elvin Quliyev', teacherId: PRACTICE_TEACHER_ID },
    { id: 'pub-a', fullName: 'Nigar Həsənova', teacherId: 'other-teacher' },
    { id: 'pub-b', fullName: 'Rəşad Əliyev', teacherId: 'other-teacher' },
  ];
  const submissions = [
    { examId: exam.id, studentId: 'own-a', studentName: 'Aysel Məmmədova', percent: 92, submittedAt: iso },
    { examId: exam.id, studentId: 'own-b', studentName: 'Elvin Quliyev', percent: 78, submittedAt: iso },
    { examId: exam.id, studentId: 'pub-a', studentName: 'Nigar Həsənova', percent: 88, submittedAt: iso },
    { examId: exam.id, studentId: 'pub-b', studentName: 'Rəşad Əliyev', percent: 71, submittedAt: iso },
  ];
  return { exams: [exam], students, submissions };
}

export function practiceUser(role) {
  if (role === 'Teacher') {
    return {
      practice: true,
      practiceRole: 'Teacher',
      id: PRACTICE_TEACHER_ID,
      role: 'Teacher',
      fullName: 'Məşq müəllimi',
      firstName: 'Məşq',
      lastName: 'Müəllim',
      email: 'practice.teacher@local',
      position: 'Bakı',
    };
  }
  return {
    practice: true,
    practiceRole: 'Student',
    id: PRACTICE_STUDENT_ID,
    role: 'Student',
    fullName: 'Məşq şagirdi',
    email: 'practice.student@local',
    teacherId: 'demo',
  };
}

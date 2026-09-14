const prefix = 'exampulse_';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(prefix + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(prefix + key, JSON.stringify(value));
}

export const localDb = {
  getSubjects() {
    return read('subjects', [
      { id: 1, name: 'Riyaziyyat' },
      { id: 2, name: 'Azərbaycan dili' },
      { id: 3, name: 'İngilis dili' },
      { id: 4, name: 'Fizika' },
    ]);
  },
  saveSubjects(list) {
    write('subjects', list);
  },
  addSubject(name) {
    const list = this.getSubjects();
    const subject = { id: Date.now(), name: name.trim() };
    list.push(subject);
    this.saveSubjects(list);
    return subject;
  },
  getExams() {
    return read('exams', []);
  },
  saveExams(list) {
    write('exams', list);
  },
  upsertExam(exam) {
    const list = this.getExams();
    const idx = list.findIndex((e) => String(e.id) === String(exam.id));
    if (idx >= 0) list[idx] = { ...list[idx], ...exam };
    else list.unshift(exam);
    this.saveExams(list);
    return exam;
  },
  getQuestions(examId) {
    return read(`questions_${examId}`, []);
  },
  saveQuestions(examId, list) {
    write(`questions_${examId}`, list);
  },
  addQuestion(examId, question) {
    const list = this.getQuestions(examId);
    list.push(question);
    this.saveQuestions(examId, list);
    return question;
  },
  getGroups(teacherId) {
    return read(`groups_${teacherId || 'me'}`, []);
  },
  saveGroups(teacherId, list) {
    write(`groups_${teacherId || 'me'}`, list);
  },
  getStudents(teacherId) {
    return read(`students_${teacherId || 'me'}`, []);
  },
  saveStudents(teacherId, list) {
    write(`students_${teacherId || 'me'}`, list);
  },
  getSubmissions() {
    return read('submissions', []);
  },
  saveSubmissions(list) {
    write('submissions', list);
  },
  addSubmission(item) {
    const list = this.getSubmissions();
    list.unshift(item);
    this.saveSubmissions(list);
    return item;
  },
};

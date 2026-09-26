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
  getTeacherAi(id) {
    const map = read('teacher_ai', {});
    return Boolean(map[String(id)]);
  },
  setTeacherAi(id, enabled) {
    const map = read('teacher_ai', {});
    if (enabled) map[String(id)] = true;
    else delete map[String(id)];
    write('teacher_ai', map);
  },
  getAiUsage(teacherId) {
    const all = read('teacher_ai_usage', {});
    const list = all[String(teacherId)] || [];
    return Array.isArray(list) ? list : [];
  },
  addAiUsage(teacherId, event) {
    const all = read('teacher_ai_usage', {});
    const key = String(teacherId);
    const list = Array.isArray(all[key]) ? all[key] : [];
    list.push(event);
    all[key] = list;
    write('teacher_ai_usage', all);
    return list;
  },
  mergeAiUsage(teacherId, events) {
    const local = this.getAiUsage(teacherId);
    const map = new Map();
    [...local, ...(events || [])].forEach((ev) => {
      const stamp = ev?.at || ev?.At || ev?.createdAt;
      const feature = ev?.feature || ev?.Feature;
      if (!feature || !stamp) return;
      map.set(`${feature}|${stamp}`, { feature, at: stamp });
    });
    const merged = Array.from(map.values());
    const all = read('teacher_ai_usage', {});
    all[String(teacherId)] = merged;
    write('teacher_ai_usage', all);
    return merged;
  },
};

import { studentSubscriptions } from './groupSubscriptions';
import { localDb } from './localDb';
import { applicantCode, normalizeDuelCode } from './studentCode';
import { getStudentPhoto } from './studentPhoto';
import { SYLLABUS_BY_SUBJECT } from './syllabus';

export const REPUBLIC_PRICE = 2;
export const REPUBLIC_DURATION_MIN = 60;
export const REPUBLIC_QUESTION_COUNT = 30;
export const REPUBLIC_EVENT = 'exampulse-republic';

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key = monthKey()) {
  const [y, m] = String(key).split('-').map(Number);
  const names = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
  return `${names[(m || 1) - 1]} ${y}`;
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
  window.dispatchEvent(new CustomEvent(REPUBLIC_EVENT));
}

export function republicMonthKey(date) {
  return monthKey(date);
}

export function republicMonthTitle(date) {
  return `Respublika sınağı · ${monthLabel(monthKey(date))}`;
}

export function republicMonthBadge(date) {
  return `${monthLabel(monthKey(date))} - Aylıq sınaq`;
}

export function republicMonthLabel(key) {
  return monthLabel(key || monthKey());
}

function prevMonthKey(date = new Date()) {
  return monthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

export function republicPrevMonthKey(date = new Date()) {
  return prevMonthKey(date);
}

export function lastMonthRepublicWinner(date = new Date()) {
  const month = prevMonthKey(date);
  const row = firstPlaceOfMonth(month);
  if (!row) return null;
  return { ...row, month };
}

export function firstPlaceOfMonth(month) {
  const winners = republicWinners(month);
  if (winners[0]) return winners[0];
  return republicResults(month)[0] || null;
}

export function hasFreeNextRepublic(user, date = new Date()) {
  if (!user?.id) return false;
  const first = firstPlaceOfMonth(prevMonthKey(date));
  return Boolean(first && String(first.userId) === String(user.id));
}

export function canEnterRepublic(user, date = new Date()) {
  return hasPaidRepublic(user, date) || hasFreeNextRepublic(user, date);
}

export function winnerSlotsFor(participantCount) {
  const n = Math.max(0, Number(participantCount) || 0);
  if (n <= 0) return 0;
  if (n < 10) return 1;
  if (n < 25) return 2;
  if (n < 50) return 3;
  return Math.min(12, Math.floor(n / 15));
}

export function monthlyDifficulty(month = monthKey()) {
  const map = read('exampulse_monthly_difficulty', {});
  return map[month] || 'orta';
}

export function setMonthlyDifficulty(level, month = monthKey()) {
  const allowed = ['asan', 'orta', 'çətin'];
  const value = allowed.includes(level) ? level : 'orta';
  const map = read('exampulse_monthly_difficulty', {});
  map[month] = value;
  write('exampulse_monthly_difficulty', map);
  return value;
}

export function difficultyLabelAz(level = monthlyDifficulty()) {
  if (level === 'asan') return 'Asan';
  if (level === 'çətin') return 'Çətin';
  return 'Orta';
}

export function republicQuestions(month = monthKey()) {
  const level = monthlyDifficulty(month);
  const monthIndex = Math.max(0, Number(String(month).split('-')[1] || 1) - 1);
  const pool = [];
  Object.entries(SYLLABUS_BY_SUBJECT).forEach(([subject, topics], sIdx) => {
    const topic = topics[(monthIndex + sIdx) % topics.length];
    pool.push({
      text: `${subject} · ${topic}. Bu mövzuya uyğun qarışıq sınaq sualı (${difficultyLabelAz(level)}).`,
      options: ['A', 'B', 'C', 'D', 'E'],
      correct: 0,
      difficulty: level,
      topic,
      subject,
    });
  });
  if (!pool.length) return [];
  return Array.from({ length: REPUBLIC_QUESTION_COUNT }, (_, index) => {
    const src = pool[index % pool.length];
    return { ...src, id: `m-${month}-${index}` };
  });
}

function paymentsMap() {
  return read('exampulse_republic_pay', {});
}

export function hasPaidRepublic(user, date = new Date()) {
  if (!user?.id) return false;
  const row = paymentsMap()[`${user.id}:${monthKey(date)}`];
  return Boolean(row?.paidAt) && !row?.refunded;
}

export function payRepublic(user, method = 'card') {
  if (!user?.id) return null;
  const key = `${user.id}:${monthKey()}`;
  const map = paymentsMap();
  map[key] = {
    userId: user.id,
    fullName: user.fullName || user.email,
    month: monthKey(),
    amount: method === 'winner-free' ? 0 : REPUBLIC_PRICE,
    method,
    paidAt: new Date().toISOString(),
    refunded: false,
  };
  write('exampulse_republic_pay', map);
  return map[key];
}

function teacherOfStudent(user) {
  const subs = studentSubscriptions(user?.id);
  const sub = subs.find((item) => item.teacherName) || subs[0] || {};
  const teacherId = user?.teacherId ?? user?.TeacherId ?? sub.teacherId ?? null;
  return {
    teacherId,
    teacherName: String(user?.teacherName || user?.TeacherName || sub.teacherName || '').trim(),
    teachingSubject: String(
      user?.teachingSubject
      || sub.teachingSubject
      || localDb.getTeacherSubject(teacherId)
      || '',
    ).trim(),
  };
}

function withCoupon(row, month) {
  const code = applicantCode({ id: row.userId }) || row.coupon || `EP-${String(month).replace('-', '')}-${String(row.userId || 'W').slice(0, 6)}`;
  return {
    ...row,
    month,
    coupon: code,
  };
}

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

function selectedIndexOf(item, answers) {
  if (Number.isFinite(Number(item?.selectedIndex))) return Number(item.selectedIndex);
  const fromAnswers = answers?.[item?.questionId];
  if (Number.isFinite(Number(fromAnswers))) return Number(fromAnswers);
  const fromOpts = (item?.options || []).findIndex((opt) => opt.isSelected);
  return fromOpts >= 0 ? fromOpts : NaN;
}

export function reviewItemFromQuestion(q, index, selectedRaw) {
  const selected = Number(selectedRaw);
  const picked = Number.isFinite(selected);
  const isCorrect = picked && selected === q.correct;
  return {
    questionId: q.id,
    index: index + 1,
    text: q.text,
    subject: q.subject || '',
    topic: q.topic || '',
    isCorrect,
    unanswered: !picked,
    selectedIndex: picked ? selected : null,
    correctIndex: q.correct,
    selectedText: picked ? `${optionLetter(selected)}) ${q.options[selected] ?? ''}` : 'Cavab verilməyib',
    correctText: `${optionLetter(q.correct)}) ${q.options[q.correct] ?? ''}`,
    options: (q.options || []).map((text, oi) => ({
      id: `${q.id}-${oi}`,
      text,
      isCorrect: oi === q.correct,
      isSelected: picked && selected === oi,
    })),
  };
}

export function submitRepublic(user, answers, extra = {}) {
  const questions = republicQuestions();
  const review = questions.map((q, index) => reviewItemFromQuestion(q, index, answers[q.id]));
  const correct = review.filter((item) => item.isCorrect).length;
  const percent = Math.round((correct / questions.length) * 100);
  const teacher = teacherOfStudent(user);
  const at = extra.at || new Date().toISOString();
  const startedAt = extra.startedAt || at;
  const durationSeconds = Math.max(0, Math.round((new Date(at).getTime() - new Date(startedAt).getTime()) / 1000));
  const row = {
    userId: user.id,
    fullName: user.fullName || user.email,
    photo: user.photo || getStudentPhoto(user.id) || '',
    month: monthKey(),
    correct,
    wrong: review.filter((item) => !item.unanswered && !item.isCorrect).length,
    blank: review.filter((item) => item.unanswered).length,
    total: questions.length,
    percent,
    startedAt,
    durationSeconds,
    durationLimit: REPUBLIC_DURATION_MIN * 60,
    at,
    answers,
    review,
    ...teacher,
  };
  const all = read('exampulse_republic_results', []);
  write('exampulse_republic_results', [row, ...all.filter((item) => !(item.userId === row.userId && item.month === row.month))].slice(0, 400));
  return row;
}

export function republicHistoryForUser(userId) {
  return read('exampulse_republic_results', [])
    .filter((row) => String(row.userId) === String(userId))
    .sort((a, b) => String(b.month).localeCompare(String(a.month)) || String(b.at).localeCompare(String(a.at)));
}

export function republicResultFor(userId, month) {
  return republicHistoryForUser(userId).find((row) => row.month === month) || null;
}

export function republicReviewPaper(row) {
  if (!row) return [];
  const questions = republicQuestions(row.month);
  const answers = row.answers || {};
  if (row.review?.length) {
    return row.review.map((item, index) => {
      const source = questions.find((q) => q.id === item.questionId) || questions[index];
      if (!source) return { ...item, index: item.index || index + 1 };
      return reviewItemFromQuestion(source, index, selectedIndexOf(item, answers));
    });
  }
  return questions.map((q, index) => reviewItemFromQuestion(q, index, answers[q.id]));
}

export function republicResults(month = monthKey()) {
  return read('exampulse_republic_results', [])
    .filter((row) => row.month === month)
    .sort((a, b) => b.percent - a.percent || String(a.at).localeCompare(String(b.at)));
}

export function republicWinners(month = monthKey()) {
  const results = republicResults(month);
  const slots = winnerSlotsFor(results.length);
  const auto = results.slice(0, slots).map((row) => withCoupon(row, month));
  const chosen = read('exampulse_republic_winners', {})[month];
  if (Array.isArray(chosen) && chosen.length) {
    const photos = Object.fromEntries(chosen.map((row) => [String(row.userId), row]));
    return auto.map((row) => ({ ...row, ...(photos[String(row.userId)] || {}) }));
  }
  const legacy = read('exampulse_republic_winner', {})[month];
  if (legacy?.userId) {
    return auto.map((row) => (
      String(row.userId) === String(legacy.userId) ? { ...row, ...legacy } : row
    ));
  }
  return auto;
}

export function republicWinner(month = monthKey()) {
  return republicWinners(month)[0] || null;
}

export function patchRepublicWinner(month, winner) {
  const list = republicWinners(month).map((row) => (
    String(row.userId) === String(winner?.userId) ? { ...row, ...winner, month } : row
  ));
  const map = read('exampulse_republic_winners', {});
  map[month] = list;
  write('exampulse_republic_winners', map);
  return list;
}

export function applyRepublicCoupon(user, code) {
  const month = monthKey();
  const winner = republicWinners(month).find((row) => String(row.userId) === String(user?.id));
  if (!winner) throw new Error('Bu kupon sizə aid deyil. Yalnız qalib abituriyent kodu ilə geri alınır.');
  const entered = normalizeDuelCode(code) || String(code || '').trim().toUpperCase();
  const mine = applicantCode(user);
  const allowed = [winner.coupon, mine].filter(Boolean).map((item) => String(item).trim().toUpperCase());
  if (!entered || !allowed.includes(entered)) {
    throw new Error('Abituriyent kodu yanlışdır. Profilindəki kodu yaz.');
  }
  const key = `${user.id}:${month}`;
  const map = paymentsMap();
  const pay = map[key];
  if (!pay) throw new Error('Bu ay ödəniş tapılmadı.');
  if (pay.refunded) throw new Error('Pul artıq geri qaytarılıb.');
  map[key] = { ...pay, refunded: true, refundedAt: new Date().toISOString(), coupon: winner.coupon };
  write('exampulse_republic_pay', map);
  return map[key];
}

export function isRepublicWinner(user, month = monthKey()) {
  return republicWinners(month).some((row) => String(row.userId) === String(user?.id));
}

export function useRepublicTick() {
  return REPUBLIC_EVENT;
}

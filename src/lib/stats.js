import { percent } from './utils';

export function buildExamStats(exam, questions, submissions, difficultyRows = []) {
  const participants = submissions.length;
  const scores = submissions.map((s) => {
    const total = s.totalQuestions || questions.length || 1;
    const gained = s.correctAnswersCount ?? 0;
    const percentValue =
      s.percent != null && s.percent !== ''
        ? Number(s.percent)
        : s.score != null && Number(s.score) <= 100
          ? Number(s.score)
          : percent(gained, total);
    return {
      ...s,
      percent: Number.isNaN(percentValue) ? 0 : percentValue,
      studentName: s.studentName || s.fullName || s.student?.fullName || `Tələbə #${s.studentId || s.id}`,
    };
  });

  const avg = participants
    ? Math.round(scores.reduce((sum, s) => sum + s.percent, 0) / participants)
    : 0;
  const passRate = participants
    ? percent(scores.filter((s) => s.percent >= 50).length, participants)
    : 0;

  const fromApi = (difficultyRows || []).map((q, idx) => ({
    id: q.questionId ?? q.id,
    index: q.index || idx + 1,
    text: q.text,
    asked: q.participants ?? participants,
    wrongCount: q.wrongCount ?? q.difficulty ?? 0,
    difficulty: q.wrongCount ?? q.difficulty ?? 0,
    difficultyLevel: q.difficultyLevel || q.DifficultyLevel || '',
    points: q.points ?? q.Points,
  }));

  const canGrade = submissions.some((s) => (s.answers || s.studentAnswers || []).length);
  const fromAnswers = questions.map((q, idx) => {
    let wrong = 0;
    if (canGrade) {
      submissions.forEach((s) => {
        const answers = s.answers || s.studentAnswers || [];
        const ans = answers.find((a) => String(a.questionId) === String(q.id));
        const selected = ans?.selectedOptionId ?? ans?.optionId;
        const correct = q.options?.find((o) => o.isCorrect);
        const isRight = correct && selected != null && String(selected) === String(correct.id);
        if (!isRight) wrong += 1;
      });
    }
    return {
      id: q.id,
      index: idx + 1,
      text: q.text,
      asked: participants,
      wrongCount: wrong,
      difficulty: wrong,
      difficultyLevel: q.difficultyLevel || q.DifficultyLevel || '',
      points: q.points ?? q.Points,
    };
  });

  const difficulty = fromApi.length ? fromApi : fromAnswers;

  const ranked = scores
    .slice()
    .sort((a, b) => {
      const diff = b.percent - a.percent;
      if (diff !== 0) return diff;
      const aDur = a.durationSeconds ?? durationFallback(a);
      const bDur = b.durationSeconds ?? durationFallback(b);
      return aDur - bDur;
    })
    .map((s, index) => ({ ...s, rank: s.rank || index + 1 }));

  const trend = scores
    .slice()
    .sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0))
    .map((s) => s.percent);

  const analysis = writeAnalysis({ exam, participants, avg, passRate, difficulty });

  return { participants, scores: ranked, avg, passRate, difficulty, trend, analysis };
}

function durationFallback(row) {
  const from = new Date(row.startedAt || 0).getTime();
  const to = new Date(row.submittedAt || 0).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, to - from);
}

function writeAnalysis({ exam, participants, avg, passRate, difficulty }) {
  const title = exam?.title || 'İmtahan';
  const hardest = [...difficulty].sort((a, b) => b.wrongCount - a.wrongCount)[0];
  const easiest = [...difficulty].sort((a, b) => a.wrongCount - b.wrongCount)[0];

  if (!participants) {
    return `${title} üçün hələ nəticə yoxdur. Suallar hazırdırsa, tələbələr imtahana qoşulduqdan sonra iştirakçı sayı, müvəffəqiyyət faizi və sual çətinliyi avtomatik hesablanacaq.`;
  }

  let tone = 'orta səviyyədə mənimsənilmişdir';
  if (avg >= 80) tone = 'yüksək səviyyədə mənimsənilmişdir';
  else if (avg < 50) tone = 'zəif mənimsənilmişdir və əlavə təkrar tələb edir';

  const hardLine = hardest
    ? `Ən çətin sual #${hardest.index} olmuşdur — ${hardest.wrongCount} nəfər səhv edib.`
    : '';
  const easyLine = easiest
    ? `Ən asan sual #${easiest.index} olmuşdur — ${easiest.wrongCount} nəfər səhv edib.`
    : '';

  return `${title} imtahanını ${participants} nəfər vermişdir. Orta uğur ${avg}%, müvəffəqiyyət faizi isə ${passRate}%-dir. Mövzu ümumilikdə ${tone}. ${hardLine} ${easyLine} İnkişaf üçün zəif sualların izahı və oxşar tapşırıqların təkrarı tövsiyə olunur.`;
}

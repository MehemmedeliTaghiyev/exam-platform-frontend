import { percent } from './utils';

export function buildExamStats(exam, questions, submissions) {
  const participants = submissions.length;
  const scores = submissions.map((s) => {
    const total = s.totalQuestions || questions.length || 1;
    const gained = s.score ?? s.correctAnswersCount ?? 0;
    return {
      ...s,
      percent: s.percent ?? percent(gained, total),
      studentName: s.studentName || s.fullName || s.student?.fullName || `Tələbə #${s.studentId || s.id}`,
    };
  });

  const avg = participants
    ? Math.round(scores.reduce((sum, s) => sum + s.percent, 0) / participants)
    : 0;
  const passRate = participants
    ? percent(scores.filter((s) => s.percent >= 50).length, participants)
    : 0;

  const difficulty = questions.map((q, idx) => {
    let asked = 0;
    let wrong = 0;
    submissions.forEach((s) => {
      const answers = s.answers || s.studentAnswers || [];
      const ans = answers.find((a) => String(a.questionId) === String(q.id));
      if (!ans) return;
      asked += 1;
      const selected = ans.selectedOptionId ?? ans.optionId;
      const correct = q.options?.find((o) => o.isCorrect);
      if (correct && String(selected) !== String(correct.id)) wrong += 1;
      else if (ans.isCorrect === false) wrong += 1;
    });
    const hard = asked ? percent(wrong, asked) : 0;
    return {
      id: q.id,
      index: idx + 1,
      text: q.text,
      difficulty: hard,
      asked,
    };
  });

  const trend = scores
    .slice()
    .sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0))
    .map((s) => s.percent);

  const analysis = writeAnalysis({ exam, participants, avg, passRate, difficulty });

  return { participants, scores, avg, passRate, difficulty, trend, analysis };
}

function writeAnalysis({ exam, participants, avg, passRate, difficulty }) {
  const title = exam?.title || 'İmtahan';
  const hardest = [...difficulty].sort((a, b) => b.difficulty - a.difficulty)[0];
  const easiest = [...difficulty].sort((a, b) => a.difficulty - b.difficulty)[0];

  if (!participants) {
    return `${title} üçün hələ nəticə yoxdur. Suallar hazırdırsa, tələbələr imtahana qoşulduqdan sonra iştirakçı sayı, müvəffəqiyyət faizi və sual çətinliyi avtomatik hesablanacaq.`;
  }

  let tone = 'orta səviyyədə mənimsənilmişdir';
  if (avg >= 80) tone = 'yüksək səviyyədə mənimsənilmişdir';
  else if (avg < 50) tone = 'zəif mənimsənilmişdir və əlavə təkrar tələb edir';

  const hardLine = hardest
    ? `Ən çətin sual #${hardest.index} olmuşdur (səhv faizi ${hardest.difficulty}%).`
    : '';
  const easyLine = easiest
    ? `Ən asan sual #${easiest.index} olmuşdur (səhv faizi ${easiest.difficulty}%).`
    : '';

  return `${title} imtahanını ${participants} nəfər vermişdir. Orta uğur ${avg}%, müvəffəqiyyət faizi isə ${passRate}%-dir. Mövzu ümumilikdə ${tone}. ${hardLine} ${easyLine} İnkişaf üçün zəif sualların izahı və oxşar tapşırıqların təkrarı tövsiyə olunur.`;
}

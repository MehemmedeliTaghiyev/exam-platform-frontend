export const WEAK_MARK = '[[WEAK:';

export function isWeakExam(exam) {
  return String(exam?.description || exam?.Description || '').includes(WEAK_MARK);
}

export function weakPeriodKey(exam) {
  const match = String(exam?.description || exam?.Description || '').match(/\[\[WEAK:([^\]]+)\]\]/);
  return match ? match[1] : '';
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];

function azMonth(date) {
  const name = MONTHS[date.getMonth()] || '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${date.getFullYear()}`;
}

function azDay(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function localDayKey(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isoWeekKey(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function periodBounds(mode, customFrom, customTo, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (mode === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const key = `monthly:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { start, end, key, label: azMonth(start) };
  }
  if (mode === 'custom') {
    const start = customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(now);
    const stop = customTo ? new Date(`${customTo}T23:59:59`) : end;
    if (!customFrom) start.setHours(0, 0, 0, 0);
    const key = `custom:${localDayKey(start)}:${localDayKey(stop)}`;
    const label = `${azDay(start)} – ${azDay(stop)}`;
    return { start, end: stop, key, label };
  }
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  start.setHours(0, 0, 0, 0);
  return { start, end, key: `weekly:${isoWeekKey(start)}`, label: 'Bu həftə' };
}

export function inWindow(value, start, end) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time > 0 && time >= start.getTime() && time <= end.getTime();
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function optionLabel(option) {
  return cleanText(option?.text || option?.optionText || option?.Text || '');
}

function rememberWrong(bucket, label) {
  const text = cleanText(label);
  if (!text || /^açıq$/i.test(text)) return;
  bucket.set(text, (bucket.get(text) || 0) + 1);
}

function ensureRow(map, source) {
  const text = cleanText(source.text);
  if (!text) return null;
  const key = text.toLowerCase();
  if (!map.has(key)) {
    map.set(key, {
      key,
      text,
      subjectName: source.subjectName || '',
      wrong: 0,
      asked: 0,
      wrongChoices: new Map(),
      options: source.options || [],
      type: source.type || 'SingleChoice',
      inputKind: source.inputKind || 'Choice',
      points: source.points || 1,
      imageUrl: source.imageUrl || '',
      difficultyLevel: source.difficultyLevel || '',
      correctText: source.correctText || '',
    });
  }
  const row = map.get(key);
  if ((!row.options || !row.options.length) && source.options?.length) row.options = source.options;
  if (!row.correctText && source.correctText) row.correctText = source.correctText;
  if (!row.imageUrl && source.imageUrl) row.imageUrl = source.imageUrl;
  return row;
}

export function noteAttempt(map, source, { missed, wrongText }) {
  const row = ensureRow(map, source);
  if (!row) return;
  row.asked += 1;
  if (!missed) return;
  row.wrong += 1;
  rememberWrong(row.wrongChoices, wrongText);
}

export function rankWeakQuestions(map, limit = 10) {
  return [...map.values()]
    .filter((row) => row.wrong > 0)
    .map((row) => {
      const choices = [...row.wrongChoices.entries()].sort((a, b) => b[1] - a[1]);
      const correct = row.options.find((option) => option.isCorrect);
      return {
        ...row,
        topWrong: choices[0]?.[0] || '',
        topWrongCount: choices[0]?.[1] || 0,
        correctText: row.correctText || optionLabel(correct),
      };
    })
    .sort((a, b) => b.wrong - a.wrong || b.topWrongCount - a.topWrongCount)
    .slice(0, limit);
}

export function rankWeakTopics(map) {
  const topics = new Map();
  for (const row of map.values()) {
    const name = cleanText(row.subjectName) || 'Mövzu yazılmayıb';
    const key = name.toLowerCase();
    if (!topics.has(key)) topics.set(key, { key, name, wrong: 0, asked: 0, questions: 0 });
    const topic = topics.get(key);
    topic.wrong += row.wrong;
    topic.asked += row.asked;
    if (row.wrong > 0) topic.questions += 1;
  }
  return [...topics.values()]
    .filter((topic) => topic.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.questions - a.questions);
}

export function gradeAgainstQuestion(question, answer) {
  const options = question?.options || [];
  const selectedId = answer?.selectedOptionId ?? answer?.optionId;
  const selectedText = cleanText(answer?.textAnswer || answer?.text || answer?.selectedText);
  const selected = options.find((option) => String(option.id) === String(selectedId))
    || options.find((option) => optionLabel(option).toLowerCase() === selectedText.toLowerCase());
  const correct = options.find((option) => option.isCorrect);
  const unanswered = !selected && !selectedText;
  if (unanswered) return { missed: false, wrongText: '' };
  const missed = selected
    ? !selected.isCorrect
    : (correct ? optionLabel(correct).toLowerCase() !== selectedText.toLowerCase() : false);
  return { missed, wrongText: optionLabel(selected) || selectedText };
}

function reviewOptions(question) {
  return (question?.options || question?.Options || []).map((option) => ({
    ...option,
    text: option.text || option.optionText || option.Text || option.OptionText,
    isCorrect: Boolean(option.isCorrect ?? option.IsCorrect),
    isSelected: Boolean(option.isSelected ?? option.IsSelected),
  }));
}

export function gradeReviewQuestion(question) {
  const options = reviewOptions(question);
  const selected = options.find((option) => option.isSelected);
  const correct = options.find((option) => option.isCorrect);
  const unanswered = Boolean(question?.unanswered ?? question?.Unanswered);
  const marked = question?.isCorrect ?? question?.IsCorrect;
  if (unanswered) return { missed: false, wrongText: '' };
  if (marked === true) return { missed: false, wrongText: '' };
  if (marked === false || (selected && !selected.isCorrect)) {
    return {
      missed: true,
      wrongText: optionLabel(selected) || cleanText(question.selectedText || question.SelectedText),
    };
  }
  if (selected && correct && String(selected.id) !== String(correct.id)) {
    return { missed: true, wrongText: optionLabel(selected) };
  }
  return { missed: false, wrongText: '' };
}

export function questionPayload(row) {
  const options = (row.options || [])
    .filter((option) => optionLabel(option))
    .map((option) => ({
      optionText: optionLabel(option),
      isCorrect: Boolean(option.isCorrect),
    }));
  return {
    text: row.text,
    points: row.points || 1,
    type: row.type || 'SingleChoice',
    inputKind: row.inputKind || 'Choice',
    imageUrl: row.imageUrl || '',
    difficultyLevel: row.difficultyLevel || '',
    correctText: row.correctText || '',
    options,
  };
}

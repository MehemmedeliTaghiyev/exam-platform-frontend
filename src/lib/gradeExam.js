import { isOpenChoiceOption, unwrapOptions } from './utils';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function letterOfOption(opt, index = 0) {
  if (!opt || isOpenChoiceOption(opt)) return '';
  const marked = String(opt.letter || opt.Letter || '').trim().toUpperCase();
  if (LETTERS.includes(marked)) return marked;
  const raw = String(opt.optionText || opt.OptionText || opt.text || opt.Text || '').trim();
  const match = raw.match(/^([A-E])(?:[\)\.\-:]|\s|$)/i);
  if (match) return match[1].toUpperCase();
  return LETTERS[index] || '';
}

export function correctLetterOf(question) {
  const opts = unwrapOptions(question?.options);
  const hit = opts.findIndex((opt) => opt?.isCorrect || opt?.IsCorrect);
  if (hit >= 0) return letterOfOption(opts[hit], hit);
  const raw = String(
    question?.correctLetter
    || question?.CorrectLetter
    || question?.correct_answer
    || question?.correctAnswer
    || question?._correct
    || question?.correct
    || question?.Correct
    || '',
  ).trim();
  const asLetter = raw.toUpperCase();
  if (LETTERS.includes(asLetter)) return asLetter;
  if (raw) {
    const byText = opts.findIndex((opt, index) => {
      if (isOpenChoiceOption(opt)) return false;
      const body = String(opt.text || opt.optionText || '').replace(/^[A-E][\)\.\-:]\s*/i, '').trim();
      return body && body.toLowerCase() === raw.toLowerCase();
    });
    if (byText >= 0) return letterOfOption(opts[byText], byText);
  }
  return '';
}

function pickFromAnswer(answer) {
  if (answer == null) return { optionId: '', letter: '', text: '' };
  if (typeof answer !== 'object') {
    const text = String(answer || '').trim();
    const letter = LETTERS.includes(text.toUpperCase()) ? text.toUpperCase() : '';
    return { optionId: text, letter, text };
  }
  const letter = String(answer.letter || answer.Letter || '').trim().toUpperCase();
  const text = String(answer.text || answer.textAnswer || answer.TextAnswer || '').trim();
  const optionId = answer.optionId ?? answer.selectedOptionId ?? answer.SelectedOptionId ?? '';
  const fromText = LETTERS.includes(text.toUpperCase()) ? text.toUpperCase() : '';
  return {
    optionId,
    letter: LETTERS.includes(letter) ? letter : fromText,
    text,
  };
}

function choiceOptions(question) {
  const want = correctLetterOf(question);
  return unwrapOptions(question?.options)
    .filter((opt) => !isOpenChoiceOption(opt))
    .map((opt, index) => {
      const letter = letterOfOption(opt, index);
      return {
        id: opt.id ?? opt.Id ?? `${question?.id}-${letter}`,
        letter,
        text: String(opt.text || opt.optionText || '').replace(/^[A-E][\)\.\-:]\s*/i, '').trim() || letter,
        isCorrect: Boolean(opt.isCorrect || opt.IsCorrect) || (want && letter === want),
      };
    });
}

function findAnswer(question, answers, index) {
  if (!answers) return null;
  if (Array.isArray(answers)) {
    return answers.find((row) => String(row?.questionId ?? row?.QuestionId) === String(question?.id))
      || answers[index]
      || null;
  }
  return answers[question?.id]
    || answers[String(question?.id)]
    || answers[`p${index + 1}`]
    || null;
}

export function gradeQuestion(question, answer) {
  const pick = pickFromAnswer(answer);
  const choices = choiceOptions(question);
  const want = correctLetterOf(question);
  const openKind = String(question?.type || '') === 'OpenEnded'
    || ['Text', 'Integer', 'Decimal', 'Number'].includes(String(question?.inputKind || ''));
  const pickedOpen = pick.optionId === 'open' || String(pick.letter) === 'OPEN';
  const expected = String(question?.correctText || question?.CorrectText || '').trim().toLowerCase();

  if (openKind || pickedOpen) {
    const text = pick.text.trim().toLowerCase();
    const ok = Boolean(text && expected && text === expected);
    return {
      questionId: question?.id,
      text: question?.text,
      isCorrect: ok,
      unanswered: !pick.text.trim(),
      selectedText: pick.text,
      correctText: question?.correctText || question?.CorrectText || '',
      options: choices.map((opt) => ({ ...opt, isSelected: false })),
    };
  }

  const selected = choices.find((opt) => pick.optionId !== '' && pick.optionId != null && String(opt.id) === String(pick.optionId))
    || choices.find((opt) => pick.letter && opt.letter === pick.letter)
    || choices.find((opt) => pick.text && String(opt.text).trim().toLowerCase() === pick.text.toLowerCase());

  const correctOpt = choices.find((opt) => opt.isCorrect) || choices.find((opt) => opt.letter === want);
  const unanswered = !selected;
  const isCorrect = Boolean(selected && (selected.isCorrect || (want && selected.letter === want)));

  return {
    questionId: question?.id,
    text: question?.text,
    isCorrect,
    unanswered,
    selectedText: selected?.text || selected?.letter || '',
    correctText: correctOpt?.text || correctOpt?.letter || want,
    options: choices.map((opt) => ({
      ...opt,
      isSelected: Boolean(selected && opt.letter === selected.letter),
    })),
  };
}

export function gradeExam(questions = [], answers) {
  const paper = Array.isArray(questions) ? questions : [];
  const review = paper.map((question, index) => {
    const graded = gradeQuestion(question, findAnswer(question, answers, index));
    return { ...graded, index: index + 1 };
  });
  const correct = review.filter((row) => row.isCorrect).length;
  const total = review.length || 1;
  return {
    questions: review,
    correct,
    total: review.length,
    percent: review.length ? Math.round((correct / total) * 100) : 0,
  };
}

export function optionIdValue(raw) {
  if (raw == null || raw === '' || raw === 'open') return raw || 0;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && String(asNumber) === String(raw).trim()) return asNumber;
  return raw;
}

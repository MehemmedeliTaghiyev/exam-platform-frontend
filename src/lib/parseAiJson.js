function stripCodeFence(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  const fenced = s.match(/^```(?:json|javascript|js|csharp|cs|swift|text)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function extractBalancedJson(s) {
  const startObj = s.indexOf('{');
  const startArr = s.indexOf('[');
  let start = -1;
  if (startObj >= 0 && (startArr < 0 || startObj < startArr)) start = startObj;
  else if (startArr >= 0) start = startArr;
  if (start < 0) return null;
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

export function coerceAiJson(value, depth = 0) {
  if (depth > 6 || value == null) return value;
  if (typeof value === 'string') {
    const s = stripCodeFence(value).replace(/^\uFEFF/, '');
    if (!s) return value;
    try {
      return coerceAiJson(JSON.parse(s), depth + 1);
    } catch {
      const slice = extractBalancedJson(s);
      if (slice) {
        try {
          return coerceAiJson(JSON.parse(slice), depth + 1);
        } catch {
          return value;
        }
      }
      return value;
    }
  }
  return value;
}

function first(...vals) {
  return vals.find((v) => v != null && v !== '');
}

export function pickAiQuestionList(data) {
  const root = coerceAiJson(data);
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== 'object') return [];
  const nested = coerceAiJson(
    first(
      root.questions,
      root.Questions,
      root.items,
      root.Items,
      root.data,
      root.Data,
      root.result,
      root.Result,
      root.content,
      root.Content,
      root.output,
      root.Output,
      root.message,
      root.Message,
    ),
  );
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === 'object') {
    if (Array.isArray(nested.$values)) return nested.$values;
    if (Array.isArray(nested.questions)) return nested.questions;
    if (Array.isArray(nested.Questions)) return nested.Questions;
  }
  if (Array.isArray(root.$values)) return root.$values;
  return [];
}

export function mapAiQuestion(q) {
  if (!q || typeof q !== 'object') return null;
  const rawOpts = first(q.options, q.Options, q.choices, q.Choices);
  const opts = Array.isArray(rawOpts) ? rawOpts : Array.isArray(rawOpts?.$values) ? rawOpts.$values : [];
  return {
    text: first(q.text, q.Text, q.questionText, q.QuestionText, q.stem, q.Stem),
    options: opts.map((o, idx) => ({
      letter: first(o?.letter, o?.Letter, ['A', 'B', 'C', 'D', 'E'][idx]),
      text: first(o?.text, o?.Text, o?.optionText, o?.OptionText),
      isCorrect: Boolean(o?.isCorrect ?? o?.IsCorrect),
    })),
    correctLetter: first(
      q.correctLetter,
      q.CorrectLetter,
      q.answer,
      q.Answer,
      opts.find((o) => o?.isCorrect || o?.IsCorrect)?.letter,
      opts.find((o) => o?.isCorrect || o?.IsCorrect)?.Letter,
      'A',
    ),
    difficultyLevel: first(q.difficultyLevel, q.DifficultyLevel, q.difficulty, q.Difficulty, 'orta'),
    correctText: first(q.correctText, q.CorrectText, ''),
  };
}

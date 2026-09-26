import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

try {
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
} catch {
  /* worker optional */
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const parts = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = (content.items || []).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
    if (line) parts.push(line);
  }
  return parts.join('\n');
}

function splitQuestionBlocks(raw) {
  const text = String(raw || '').replace(/\r/g, '\n');
  const parts = text.split(/(?=(?:^|\n)\s*(?:sual\s*)?\d{1,3}\s*[\.\)\-–])/i);
  return parts.map((p) => p.trim()).filter((p) => p.length > 8);
}

function parseOptions(block) {
  const options = [];
  const re = /(?:^|\n|\s)([A-Ea-e])[\.\)\-]\s*([^\n]+?)(?=(?:\s+[A-Ea-e][\.\)\-])|$)/g;
  let match = re.exec(block);
  while (match) {
    const letter = match[1].toUpperCase();
    const text = match[2].replace(/\s+/g, ' ').trim();
    if (LETTERS.includes(letter) && text) {
      options.push({ letter, text });
    }
    match = re.exec(block);
  }
  const unique = [];
  LETTERS.forEach((letter) => {
    const found = options.find((o) => o.letter === letter);
    if (found) unique.push(found);
  });
  return unique;
}

function stemFromBlock(block, optionCount) {
  let stem = block.replace(/^(?:sual\s*)?\d{1,3}\s*[\.\)\-–]\s*/i, '');
  const firstOpt = stem.search(/(?:^|\s)[A-Ea-e][\.\)]\s/);
  if (firstOpt > 0) stem = stem.slice(0, firstOpt);
  stem = stem.replace(/\s+/g, ' ').trim();
  if (!stem && optionCount) return 'Sual';
  return stem;
}

export function parseQuestionsFromText(raw) {
  const blocks = splitQuestionBlocks(raw);
  const questions = [];
  blocks.forEach((block) => {
    const options = parseOptions(block);
    const text = stemFromBlock(block, options.length);
    if (!text) return;
    if (options.length < 2) {
      questions.push({
        text,
        options: LETTERS.map((letter) => ({ letter, text: letter, isCorrect: letter === 'A' })),
        correctLetter: 'A',
        difficultyLevel: 'orta',
      });
      return;
    }
    questions.push({
      text,
      options: LETTERS.map((letter) => {
        const found = options.find((o) => o.letter === letter);
        return { letter, text: found?.text || letter, isCorrect: letter === options[0].letter };
      }),
      correctLetter: options[0].letter,
      difficultyLevel: 'orta',
    });
  });
  return questions;
}

export function questionsFromBrief({ topic, count, easy = 0, medium = 0, hard = 0 }) {
  const total = Math.max(1, Number(count) || 10);
  const mix = [];
  const e = Math.max(0, Number(easy) || 0);
  const m = Math.max(0, Number(medium) || 0);
  const h = Math.max(0, Number(hard) || 0);
  const specified = e + m + h;
  if (specified >= total) {
    mix.push(...Array(e).fill('asan'), ...Array(m).fill('orta'), ...Array(h).fill('çətin'));
  } else {
    mix.push(...Array(e).fill('asan'), ...Array(m).fill('orta'), ...Array(h).fill('çətin'));
    while (mix.length < total) mix.push('orta');
  }
  const title = String(topic || 'Mövzu').trim() || 'Mövzu';
  return mix.slice(0, total).map((level, index) => ({
    text: `${title}. ${index + 1}-ci sual (${level})`,
    options: [
      { letter: 'A', text: 'A variantı', isCorrect: true },
      { letter: 'B', text: 'B variantı', isCorrect: false },
      { letter: 'C', text: 'C variantı', isCorrect: false },
      { letter: 'D', text: 'D variantı', isCorrect: false },
      { letter: 'E', text: 'E variantı', isCorrect: false },
    ],
    correctLetter: 'A',
    difficultyLevel: level,
  }));
}

export function toAddQuestionPayload(q) {
  const options = (q.options || []).map((o) => ({
    optionText: o.text || o.letter,
    isCorrect: Boolean(o.isCorrect),
  }));
  return {
    text: q.text,
    points: 1,
    type: 'SingleChoice',
    inputKind: 'Choice',
    difficultyLevel: q.difficultyLevel || 'orta',
    options,
    correctText: null,
  };
}

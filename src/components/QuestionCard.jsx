import { useRef, useState } from 'react';
import { Camera, Pencil, X } from 'lucide-react';
import { Button, Card, Textarea } from './ui';
import { isOpenChoiceOption, isLetterOption, optionLetter, unwrapOptions } from '../lib/utils';
import { difficultyLabel, normalizeDifficulty } from '../lib/questionDifficulty';
import { compressQuestionImage, parseQuestionImage, stripQuestionImage } from '../lib/questionImage';
import LatexText from './LatexText';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const LEVELS = [
  { value: 'asan', label: 'Asan · 1 bal' },
  { value: 'orta', label: 'Orta · 2 bal' },
  { value: 'çətin', label: 'Çətin · 3 bal' },
];

function optionLetterOf(opt, index) {
  if (isOpenChoiceOption(opt)) return 'OPEN';
  if (isLetterOption(opt)) return optionLetter(opt);
  const raw = String(opt?.optionText || opt?.text || '').trim();
  const m = raw.match(/^([A-E])[\)\.\-:]\s*/i);
  if (m) return m[1].toUpperCase();
  if (opt?.letter && LETTERS.includes(String(opt.letter).toUpperCase())) {
    return String(opt.letter).toUpperCase();
  }
  return LETTERS[index] || 'A';
}

function optionBody(opt, letter) {
  const raw = String(opt?.optionText || opt?.text || '').trim();
  if (!raw || /^[A-E]$/i.test(raw)) return '';
  return raw.replace(/^[A-E][\)\.\-:]\s*/i, '').trim() || raw;
}

export function splitQuestionOptions(question) {
  const raw = unwrapOptions(question?.options);
  const open = raw.find(isOpenChoiceOption);
  const choice = raw.filter((o) => !isOpenChoiceOption(o));
  const byLetter = {};
  choice.forEach((opt, index) => {
    const letter = optionLetterOf(opt, index);
    if (!byLetter[letter]) byLetter[letter] = { ...opt, letter, text: optionBody(opt, letter) };
  });
  const options = LETTERS.map((letter, index) => {
    const found = byLetter[letter] || choice[index];
    return {
      id: found?.id,
      letter,
      text: found ? optionBody(found, letter) : '',
      optionText: found?.optionText || found?.text || '',
      isCorrect: Boolean(found?.isCorrect) || String(question?.correctLetter || '').toUpperCase() === letter,
    };
  });
  return { options, open };
}

export function visibleStudentOptions(question) {
  const raw = unwrapOptions(question?.options).filter((opt) => !isOpenChoiceOption(opt));
  return raw.map((opt, index) => {
    const letter = optionLetterOf(opt, index);
    return {
      id: opt?.id ?? `${question?.id || 'q'}-${letter}`,
      letter,
      text: optionBody(opt, letter),
      optionText: opt?.optionText || opt?.text || '',
    };
  }).filter((opt) => opt.id != null || opt.text || opt.optionText);
}

function QuestionFigure({ src, className = '' }) {
  const [zoom, setZoom] = useState(false);
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className={`mt-3 block w-full overflow-hidden rounded-xl bg-white p-2 ring-1 ring-black/10 ${className}`}
        title="Böyüt"
      >
        <img
          src={src}
          alt="Sual şəkli"
          className="mx-auto max-h-64 w-full object-contain"
          onError={() => setBroken(true)}
        />
      </button>
      {zoom ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoom(false)}
        >
          <img src={src} alt="Sual şəkli" className="max-h-full max-w-full rounded-xl object-contain" />
        </button>
      ) : null}
    </>
  );
}

function TeacherImageTools({ src, dark, onPick, onRemove }) {
  const fileRef = useRef(null);
  return (
    <div className="flex flex-wrap gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPick?.(file);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold ${
          dark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'
        }`}
      >
        <Camera size={12} /> {src ? 'Şəkli dəyiş' : 'Şəkil əlavə et'}
      </button>
      {src ? (
        <button
          type="button"
          onClick={onRemove}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] ${
            dark ? 'text-red-200' : 'text-red-600'
          }`}
        >
          <X size={12} /> Sil
        </button>
      ) : null}
    </div>
  );
}

export default function QuestionCard({
  index = 0,
  question,
  mode = 'student',
  theme = 'light',
  selectedOptionId,
  openText = '',
  disabled = false,
  onSelect,
  onOpenText,
  onMarkCorrect,
  onChange,
  onSaveEdit,
  onImageChange,
}) {
  const teacher = mode === 'teacher';
  const dark = theme === 'dark';
  const [editing, setEditing] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const split = splitQuestionOptions(question);
  const rawStem = String(question?.text || '').trim();
  const stem = stripQuestionImage(rawStem);
  const correctLetter = String(question?.correctLetter || split.options.find((o) => o.isCorrect)?.letter || 'A').toUpperCase();
  const difficulty = normalizeDifficulty(question?.difficultyLevel) || 'orta';
  const imageUrl = parseQuestionImage(question) || question?.imageUrl || question?.figureUrl || question?.FigureUrl || '';

  const [draftText, setDraftText] = useState(stem);
  const [draftOpts, setDraftOpts] = useState(() => Object.fromEntries(split.options.map((o) => [o.letter, o.text])));
  const [draftCorrect, setDraftCorrect] = useState(correctLetter === 'OPEN' ? 'A' : correctLetter);
  const [draftLevel, setDraftLevel] = useState(difficulty);

  const beginEdit = () => {
    const next = splitQuestionOptions(question);
    setDraftText(stripQuestionImage(String(question?.text || '').trim()));
    setDraftOpts(Object.fromEntries(next.options.map((o) => [o.letter, o.text])));
    const letter = String(question?.correctLetter || next.options.find((o) => o.isCorrect)?.letter || 'A').toUpperCase();
    setDraftCorrect(letter === 'OPEN' ? 'A' : letter);
    setDraftLevel(normalizeDifficulty(question?.difficultyLevel) || 'orta');
    setEditing(true);
  };

  const saveEdit = async () => {
    const payload = {
      text: draftText.trim(),
      correctLetter: draftCorrect,
      difficultyLevel: draftLevel,
      imageUrl,
      options: LETTERS.map((letter) => ({
        letter,
        text: String(draftOpts[letter] || '').trim(),
        isCorrect: letter === draftCorrect,
      })),
    };
    if (onSaveEdit) await onSaveEdit(payload);
    else if (onChange) onChange(payload);
    setEditing(false);
  };

  const pickImage = async (file) => {
    if (!onImageChange || imgBusy) return;
    setImgBusy(true);
    try {
      const dataUrl = await compressQuestionImage(file);
      await onImageChange(dataUrl);
    } finally {
      setImgBusy(false);
    }
  };

  const shell = dark
    ? 'rounded-2xl bg-black/20 p-4 ring-1 ring-white/10'
    : '';
  const textCard = dark
    ? 'rounded-xl bg-white/10 px-3 py-3 text-sm font-medium text-white ring-1 ring-white/10'
    : 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800';
  const variantIdle = dark
    ? 'border-white/15 bg-white/5 text-indigo-50 hover:bg-white/10'
    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900';
  const variantOn = dark
    ? 'border-amber-300 bg-amber-400/20 text-amber-50'
    : 'border-brand-500 bg-brand-50 dark:bg-brand-600/15';
  const muted = dark ? 'text-indigo-200' : 'text-gray-500';

  const selectedId = selectedOptionId != null ? String(selectedOptionId) : '';
  const studentOptions = visibleStudentOptions(question);

  const renderVariant = (opt, oi) => {
    const letter = opt.letter || LETTERS[oi];
    const label = opt.text || '';
    const active = teacher
      ? (editing ? draftCorrect === letter : correctLetter === letter)
      : String(opt.id) === selectedId;
    const click = () => {
      if (disabled) return;
      if (teacher) {
        if (editing) setDraftCorrect(letter);
        else if (onMarkCorrect) onMarkCorrect(letter);
        else if (onChange) onChange({ correctLetter: letter });
        return;
      }
      if (onSelect) onSelect(opt);
    };
    return (
      <button
        key={opt.id || letter}
        type="button"
        disabled={disabled}
        onClick={click}
        className={teacher
          ? `flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
            active ? variantOn : variantIdle
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`
          : `quiz-opt text-[16px] leading-[1.5] transition-all duration-150 ease-in-out ${
            active ? 'quiz-opt-on' : 'hover:border-[var(--accent)]/40'
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span className={teacher
          ? `mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
            active ? (dark ? 'bg-amber-400 text-indigo-950' : 'bg-brand-600 text-white') : (dark ? 'bg-white/10' : 'bg-gray-100 dark:bg-slate-800')
          }`
          : 'quiz-letter'
        }>{letter}</span>
        {editing && teacher ? (
          <input
            value={draftOpts[letter] || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraftOpts((p) => ({ ...p, [letter]: e.target.value }))}
            className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-2 py-1 text-sm text-ink dark:border-slate-600 dark:bg-slate-950 dark:text-gray-100"
          />
        ) : label ? (
          <LatexText className="min-w-0 flex-1" text={label} />
        ) : <span className="min-w-0 flex-1" />}
      </button>
    );
  };

  const stemBlock = editing && teacher ? (
    <Textarea rows={3} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
  ) : teacher ? (
    <div className={textCard}>
      <LatexText text={stem || 'Sual mətni yoxdur'} />
      <QuestionFigure src={imageUrl} />
    </div>
  ) : (
    <div className="select-none rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-4 text-[18px] font-medium leading-[1.55] text-[var(--text)]">
      <LatexText text={stem || 'Sual mətni yoxdur'} />
      <QuestionFigure src={imageUrl} />
    </div>
  );

  const body = (
    <div className="space-y-3">
      <p className={`text-sm font-semibold ${teacher ? muted : 'text-[var(--muted)]'}`}>Sual {index + 1}</p>
      {stemBlock}
      {teacher ? (
        <TeacherImageTools
          src={imageUrl}
          dark={dark}
          onPick={pickImage}
          onRemove={() => onImageChange?.('')}
        />
      ) : null}

      <div className="space-y-2">
        {(teacher
          ? (editing ? LETTERS.map((letter) => ({ letter, text: draftOpts[letter] || '', id: split.options.find((o) => o.letter === letter)?.id })) : split.options)
          : studentOptions
        ).map(renderVariant)}
        {!teacher && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.({ id: split.open?.id || 'open', letter: 'OPEN' })}
            className={`quiz-opt text-[16px] leading-[1.5] transition-all duration-150 ease-in-out ${
              selectedId === String(split.open?.id || 'open') ? 'quiz-opt-on' : ''
            }`}
          >
            <span className={`quiz-letter min-w-7 px-1 ${
              selectedId === String(split.open?.id || 'open') ? '' : 'bg-[var(--bg)] text-[var(--text)]'
            }`}>Açıq</span>
            Öz cavabınız
          </button>
        )}
      </div>

      {!teacher && selectedId === String(split.open?.id || 'open') && (
        <textarea
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          rows={3}
          placeholder="Öz cavabınızı yazın"
          disabled={disabled}
          value={openText}
          onChange={(e) => onOpenText?.(e.target.value)}
        />
      )}

      {teacher && (
        <div className="space-y-2">
          <p className={`text-xs font-medium ${muted}`}>Çətinlik dərəcəsi</p>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setDraftLevel(level.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                    draftLevel === level.value ? variantOn : variantIdle
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <span
                  key={level.value}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                    difficulty === level.value ? variantOn : variantIdle
                  }`}
                >
                  {level.label}
                </span>
              ))}
            </div>
          )}
          <p className={`text-xs ${muted}`}>
            Düzgün: {editing ? draftCorrect : (correctLetter === 'OPEN' ? 'Açıq' : correctLetter)}
            {' · '}
            {difficultyLabel(editing ? draftLevel : difficulty) || 'Orta'}
          </p>
        </div>
      )}

      {teacher && (
        <div className="pt-1">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveEdit}>Yadda saxla</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Ləğv</Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={beginEdit}>
              <Pencil size={16} /> Sualı dəyiş
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (dark) return <div className={shell}>{body}</div>;
  return (
    <Card className={teacher ? shell : 'border-[var(--line)] bg-[var(--card)] text-[var(--text)] shadow-none'}>
      {body}
    </Card>
  );
}

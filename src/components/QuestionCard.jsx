import { useRef, useState } from 'react';
import { Camera, Pencil, X } from 'lucide-react';
import { Button, Card, Textarea } from './ui';
import { isOpenChoiceOption, isLetterOption, optionLetter, unwrapOptions } from '../lib/utils';
import { difficultyLabel, normalizeDifficulty } from '../lib/questionDifficulty';
import { compressQuestionImage } from '../lib/questionImage';

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

function QuestionImagePane({ src, teacher, dark, onPick, onRemove }) {
  const [zoom, setZoom] = useState(false);
  const fileRef = useRef(null);
  if (!src && !teacher) return null;

  return (
    <>
      <div className="w-[6.25rem] shrink-0 space-y-2">
        {src ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className={`block w-full overflow-hidden rounded-xl ring-1 ${
              dark ? 'ring-white/20' : 'ring-gray-200 dark:ring-slate-700'
            }`}
            title="Böyüt"
          >
            <img src={src} alt="Sual şəkli" className="h-28 w-full object-cover" />
          </button>
        ) : (
          <div
            className={`flex h-28 items-center justify-center rounded-xl border border-dashed px-1 text-center text-[10px] leading-tight ${
              dark ? 'border-white/20 text-indigo-200' : 'border-gray-300 text-gray-500 dark:border-slate-600'
            }`}
          >
            Şəkil yoxdur
          </div>
        )}
        {teacher ? (
          <>
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
              className={`flex w-full items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold ${
                dark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'
              }`}
            >
              <Camera size={12} /> {src ? 'Dəyiş' : 'Şəkil çək'}
            </button>
            {src ? (
              <button
                type="button"
                onClick={onRemove}
                className={`flex w-full items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px] ${
                  dark ? 'text-red-200' : 'text-red-600'
                }`}
              >
                <X size={12} /> Sil
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      {zoom && src ? (
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
  const stem = String(question?.text || '').trim();
  const correctLetter = String(question?.correctLetter || split.options.find((o) => o.isCorrect)?.letter || 'A').toUpperCase();
  const difficulty = normalizeDifficulty(question?.difficultyLevel) || 'orta';
  const imageUrl = question?.imageUrl || '';

  const [draftText, setDraftText] = useState(stem);
  const [draftOpts, setDraftOpts] = useState(() => Object.fromEntries(split.options.map((o) => [o.letter, o.text])));
  const [draftCorrect, setDraftCorrect] = useState(correctLetter === 'OPEN' ? 'A' : correctLetter);
  const [draftLevel, setDraftLevel] = useState(difficulty);

  const beginEdit = () => {
    const next = splitQuestionOptions(question);
    setDraftText(String(question?.text || '').trim());
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

  const renderVariant = (opt, oi) => {
    const letter = opt.letter || LETTERS[oi];
    const label = opt.text ? `${letter}) ${opt.text}` : letter;
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
        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
          active ? variantOn : variantIdle
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          active ? (dark ? 'bg-amber-400 text-indigo-950' : 'bg-brand-600 text-white') : (dark ? 'bg-white/10' : 'bg-gray-100 dark:bg-slate-800')
        }`}>{letter}</span>
        {editing && teacher ? (
          <input
            value={draftOpts[letter] || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraftOpts((p) => ({ ...p, [letter]: e.target.value }))}
            className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-2 py-1 text-sm text-ink dark:border-slate-600 dark:bg-slate-950 dark:text-gray-100"
          />
        ) : (
          <span className="min-w-0 flex-1">{label}</span>
        )}
      </button>
    );
  };

  const body = (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1 space-y-3">
        <p className={`text-sm font-semibold ${muted}`}>Sual {index + 1}</p>
        {editing && teacher ? (
          <Textarea rows={3} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
        ) : (
          <div className={textCard}>{stem || 'Sual mətni yoxdur'}</div>
        )}

        <div className="space-y-2">
          {(editing ? LETTERS.map((letter) => ({ letter, text: draftOpts[letter] || '', id: split.options.find((o) => o.letter === letter)?.id })) : split.options).map(renderVariant)}
          {!teacher && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.({ id: split.open?.id || 'open', letter: 'OPEN' })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm ${
                selectedId === String(split.open?.id || 'open') ? variantOn : variantIdle
              }`}
            >
              <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-xs font-bold ${
                selectedId === String(split.open?.id || 'open')
                  ? (dark ? 'bg-amber-400 text-indigo-950' : 'bg-brand-600 text-white')
                  : (dark ? 'bg-white/10' : 'bg-gray-100 dark:bg-slate-800')
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
      <QuestionImagePane
        src={imageUrl}
        teacher={teacher}
        dark={dark}
        onPick={pickImage}
        onRemove={() => onImageChange?.('')}
      />
    </div>
  );

  if (dark) return <div className={shell}>{body}</div>;
  return <Card className={shell}>{body}</Card>;
}

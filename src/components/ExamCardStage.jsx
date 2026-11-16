import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Flag } from 'lucide-react';
import LatexText from './LatexText';
import { formatHms } from '../lib/utils';
import './examCardStage.css';

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

function normalizeOptions(question) {
  const raw = question?.options || question?.Options || [];
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return { id: `${question?.id || 'q'}-${index}`, letter: optionLetter(index), text: item, index };
    }
    const text = String(item?.text || item?.optionText || item?.Text || item?.latex || '').trim();
    return {
      id: item?.id ?? item?.Id ?? `${question?.id || 'q'}-${index}`,
      letter: String(item?.letter || optionLetter(index)).toUpperCase().slice(0, 1) || optionLetter(index),
      text,
      index,
      raw: item,
    };
  }).filter((row) => row.text || row.letter);
}

export default function ExamCardStage({
  badge = 'GÜNÜN SINAĞI',
  title = '',
  subject = 'Riyaziyyat',
  questions = [],
  index = 0,
  answers = {},
  flagged = new Set(),
  leftSeconds = 0,
  tip = 'Tələsmə — vaxtın var.',
  scratchKey = 'exampulse-ecs-scratch',
  onExit,
  onJump,
  onSelect,
  onOpenText,
  onToggleFlag,
  onPrev,
  onNext,
  nextLabel,
}) {
  const total = questions.length;
  const question = questions[index] || null;
  const options = useMemo(() => normalizeOptions(question), [question]);
  const answer = question ? answers[question.id] ?? answers[String(question.id)] : null;
  const selectedIndex = (() => {
    if (answer == null) return -1;
    if (typeof answer === 'number') return answer;
    if (typeof answer === 'object') {
      const byId = options.findIndex((opt) => String(opt.id) === String(answer.optionId));
      if (byId >= 0) return byId;
      if (Number.isFinite(Number(answer.index))) return Number(answer.index);
    }
    return -1;
  })();
  const openMode = Boolean(question?.inputKind === 'Text' || question?.inputKind === 'Integer' || question?.inputKind === 'Decimal'
    || (typeof question?.type === 'string' && /open/i.test(question.type)));
  const openValue = answer && typeof answer === 'object' ? (answer.text || '') : '';
  const imageUrl = question?.imageUrl || question?.figureUrl || question?.FigureUrl || '';
  const timed = Number.isFinite(Number(leftSeconds)) && Number(leftSeconds) >= 0;
  const urgent = timed && leftSeconds > 0 && leftSeconds <= 180;
  const isFlagged = question ? flagged.has(question.id) : false;
  const [scratch, setScratch] = useState(() => {
    try {
      return localStorage.getItem(scratchKey) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(scratchKey, scratch);
    } catch {
      /* ignore */
    }
  }, [scratch, scratchKey]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = String(event.target?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        onNext?.();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext?.();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev?.();
        return;
      }
      if (openMode) return;
      const key = String(event.key || '').toUpperCase();
      let optionIndex = 'ABCDE'.indexOf(key);
      if (optionIndex < 0) optionIndex = '12345'.indexOf(key);
      if (optionIndex < 0 || optionIndex >= options.length) return;
      event.preventDefault();
      onSelect?.(options[optionIndex], optionIndex);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onPrev, onSelect, openMode, options]);

  if (!question) return null;

  return (
    <div className="ecs-root" role="dialog" aria-label={title || badge}>
      <header className="ecs-header">
        <button type="button" className="ecs-exit" onClick={onExit}>
          <ChevronLeft size={18} /> Çıx
        </button>
        <div className="ecs-brand">
          <p className="ecs-badge">{badge}</p>
          <h1 className="ecs-title">{title || subject}</h1>
        </div>
        <div className="ecs-timer">
          <p className="ecs-timer-label">Qalan vaxt</p>
          <p className={`ecs-timer-value ${urgent ? 'is-urgent' : ''}`}>
            {timed ? formatHms(leftSeconds) : '∞'}
          </p>
        </div>
      </header>

      <div className="ecs-nav-wrap">
        <div className="ecs-nav" role="tablist" aria-label="Suallar">
          {questions.map((row, qi) => {
            const answered = answers[row.id] != null || answers[String(row.id)] != null;
            const on = qi === index;
            const flag = flagged.has(row.id);
            return (
              <button
                key={row.id || qi}
                type="button"
                className={`ecs-nav-btn ${on ? 'is-on' : ''} ${answered && !on ? 'is-done' : ''} ${flag ? 'is-flag' : ''}`}
                onClick={() => onJump?.(qi)}
                aria-label={`Sual ${qi + 1}`}
                aria-current={on ? 'step' : undefined}
              >
                {qi + 1}
              </button>
            );
          })}
        </div>
        <p className="ecs-nav-count">{index + 1} / {total}</p>
      </div>

      <div className="ecs-body">
        <aside className="ecs-note" aria-hidden="true">
          <p className="ecs-note-text">{tip}</p>
        </aside>

        <section className="ecs-card">
          <div className="ecs-card-top">
            <p className="ecs-qno">Sual {index + 1}</p>
            <p className="ecs-subject">{subject}</p>
          </div>
          <div className="ecs-prompt">
            <LatexText text={question.text || ''} />
          </div>
          {imageUrl ? <img className="ecs-figure" src={imageUrl} alt="" /> : null}

          {openMode ? (
            <input
              className="ecs-open"
              type={question.inputKind === 'Text' ? 'text' : 'number'}
              step={question.inputKind === 'Decimal' ? 'any' : question.inputKind === 'Integer' ? '1' : undefined}
              placeholder={question.inputKind === 'Text' ? 'Cavabı yazın' : 'Rəqəm daxil edin'}
              value={openValue}
              onChange={(e) => onOpenText?.(e.target.value)}
            />
          ) : (
            <div className="ecs-options">
              {options.map((opt) => {
                const on = opt.index === selectedIndex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`ecs-opt ${on ? 'is-on' : ''}`}
                    onClick={() => onSelect?.(opt, opt.index)}
                  >
                    <span className="ecs-letter">{opt.letter}</span>
                    <span className="ecs-opt-text"><LatexText text={opt.text} /></span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="ecs-footer">
            <button type="button" className="ecs-prev" disabled={index <= 0} onClick={onPrev}>
              ← Əvvəlki
            </button>
            <button
              type="button"
              className={`ecs-flag ${isFlagged ? 'is-on' : ''}`}
              onClick={() => question && onToggleFlag?.(question.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Flag size={15} /> {isFlagged ? 'İşarələnib' : 'İşarələ'}
              </span>
            </button>
            <button type="button" className="ecs-next" onClick={onNext}>
              {nextLabel || (index >= total - 1 ? 'Bitir' : 'Növbəti →')}
            </button>
          </div>
          <p className="ecs-hint">A–E ilə seç · Enter ilə növbəti sual</p>
        </section>

        <aside className="ecs-note ecs-note-right">
          <p className="ecs-note-label">Qaralama</p>
          <textarea
            className="ecs-scratch"
            value={scratch}
            onChange={(e) => setScratch(e.target.value)}
            placeholder={'20% = 20/100\n140 ÷ 100 = 1,4\n1,4 × 20 = ?'}
            aria-label="Qaralama"
          />
        </aside>
      </div>
    </div>
  );
}

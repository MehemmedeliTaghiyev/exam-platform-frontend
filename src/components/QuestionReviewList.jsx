import { useState } from 'react';
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { Card } from './ui';
import LatexText from './LatexText';
import { useLocale } from '../context/LocaleContext';
import { difficultyLabel, pointsForDifficulty } from '../lib/questionDifficulty';
import { reviewItemStatus } from '../lib/gradeExam';

function optionClass(opt, reveal) {
  if (reveal && opt.isCorrect) return 'quiz-opt quiz-opt-ok';
  if (reveal && opt.isSelected && !opt.isCorrect) return 'quiz-opt quiz-opt-bad';
  if (opt.isSelected) return 'quiz-opt quiz-opt-on';
  return 'quiz-opt text-[var(--muted)]';
}

function ReviewThumb({ src }) {
  const [zoom, setZoom] = useState(false);
  if (!src) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-slate-700"
        title="Böyüt"
      >
        <img src={src} alt="Sual şəkli" className="h-24 w-24 object-cover" />
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

function StatusBadge({ status, t }) {
  if (status === 'correct') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#d7f3e0] px-3 py-1 text-xs font-black text-[#176b38]">
        <CheckCircle2 size={14} /> {t('result.correct')}
      </span>
    );
  }
  if (status === 'wrong') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ffe4e8] px-3 py-1 text-xs font-black text-[#be123c]">
        <XCircle size={14} /> {t('result.wrong')}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-[var(--muted)]">
      <MinusCircle size={14} /> {t('result.blank')}
    </span>
  );
}

export default function QuestionReviewList({ questions = [], reveal = true }) {
  const { t } = useLocale();
  if (!questions.length) return null;

  return (
    <div className="space-y-4">
      {questions.map((q) => {
        const status = reviewItemStatus(q);
        return (
        <Card key={q.questionId || q.index}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  {q.index}. <LatexText text={q.text} />
                </p>
                {reveal ? (
                  <StatusBadge status={status} t={t} />
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gray-500">
                    {status === 'blank' ? t('result.blank') : t('result.yourAnswer')}
                  </span>
                )}
              </div>
              {(difficultyLabel(q.difficultyLevel) || q.points) ? (
                <p className="mt-1 text-xs text-gray-500">
                  {difficultyLabel(q.difficultyLevel) ? `${difficultyLabel(q.difficultyLevel)} · ` : ''}
                  {q.points || pointsForDifficulty(q.difficultyLevel)} bal
                  {q.isCorrect ? ' alındı' : ''}
                </p>
              ) : null}
              <div className="mt-4 space-y-2">
                {(q.options || []).map((opt, oi) => (
                  <div key={opt.id || oi} className={optionClass(opt, reveal)}>
                    <span className="quiz-letter">{String.fromCharCode(65 + oi)}</span>
                    <span className="min-w-0 flex-1">
                      <LatexText text={opt.text} />
                      {opt.isSelected ? `  · ${t('result.yourAnswer')}` : ''}
                      {reveal && opt.isCorrect ? `  · ${t('result.rightAnswer')}` : ''}
                    </span>
                    {reveal && opt.isCorrect ? <span className="text-[#2ee07a]">✓</span> : null}
                    {reveal && opt.isSelected && !opt.isCorrect ? <span className="text-[#ff5a7a]">✕</span> : null}
                  </div>
                ))}
                {reveal || q.selectedText ? (
                  <div className="space-y-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-slate-700">
                    <p>
                      <span className="text-gray-500">{t('result.yourAnswer')}: </span>
                      {q.selectedText ? <LatexText text={q.selectedText} /> : t('result.blank')}
                    </p>
                    {reveal && (status === 'wrong' || status === 'blank') && q.correctText ? (
                      <p className="text-emerald-700 dark:text-emerald-300">
                        {t('result.rightAnswer')}: <LatexText text={q.correctText} />
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <ReviewThumb src={q.imageUrl} />
          </div>
        </Card>
        );
      })}
    </div>
  );
}

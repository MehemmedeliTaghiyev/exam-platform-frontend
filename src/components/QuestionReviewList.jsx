import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from './ui';
import { difficultyLabel, pointsForDifficulty } from '../lib/questionDifficulty';

function optionClass(opt, reveal) {
  if (reveal && opt.isCorrect) {
    return 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (reveal && opt.isSelected && !opt.isCorrect) {
    return 'border-red-400 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200';
  }
  if (opt.isSelected) {
    return 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-600/10 dark:text-brand-200';
  }
  return 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-gray-300';
}

export default function QuestionReviewList({ questions = [], reveal = true }) {
  if (!questions.length) return null;

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <Card key={q.questionId || q.index}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              {q.index}. {q.text}
            </p>
            {reveal ? (
              q.unanswered ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gray-500">
                  Cavabsız
                </span>
              ) : q.isCorrect ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-600">
                  <CheckCircle2 size={16} /> Düzgün
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-red-600">
                  <XCircle size={16} /> Səhv
                </span>
              )
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gray-500">
                {q.unanswered ? 'Cavabsız' : 'Sizin cavab'}
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
              <div
                key={opt.id || oi}
                className={`rounded-xl border px-3 py-2.5 text-sm ${optionClass(opt, reveal)}`}
              >
                {String.fromCharCode(65 + oi)}) {opt.text}
                {opt.isSelected ? '  · sizin cavab' : ''}
                {reveal && opt.isCorrect ? '  · düzgün cavab' : ''}
              </div>
            ))}
            {(q.selectedText || q.correctText) && (
              <div className="space-y-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-slate-700">
                {q.selectedText ? (
                  <p>
                    <span className="text-gray-500">Tələbənin cavabı: </span>
                    {q.selectedText}
                  </p>
                ) : null}
                {reveal && q.correctText ? (
                  <p className="text-emerald-700 dark:text-emerald-300">
                    Düzgün cavab: {q.correctText}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

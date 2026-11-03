import { useContext, useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { displayExamDescription } from '../lib/driveLinks';
import { localDb } from '../lib/localDb';
import { examSubject } from '../lib/publicExams';
import { isExamLive, resolveExamStatus } from '../lib/utils';

export function examRowTitle(exam) {
  const note = displayExamDescription(exam);
  const title = String(exam?.title || exam?.Title || '')
    .replace(/VIS:(public|private)\s*/gi, '')
    .replace(/DRVFILE:\S+\s*/gi, '')
    .trim();
  return note || title || 'İmtahan';
}

export default function ExamRow({ exam, onOpen }) {
  const { user } = useContext(AuthContext);
  const canSave = Boolean(user?.id) && (user?.role === 'Student' || user?.practice);
  const [saved, setSaved] = useState(() => localDb.isExamSaved(user?.id, exam?.id));
  const live = isExamLive(exam);
  const status = resolveExamStatus(exam);
  const questions = exam.totalQuestions ?? exam.questionCount ?? exam.QuestionCount ?? 0;
  const minutes = exam.durationMinutes ?? exam.DurationMinutes ?? 0;
  const badge = live ? 'Canlı' : status === 'Finished' ? 'Bitib' : status === 'Scheduled' ? 'Gözləyir' : '';

  useEffect(() => {
    setSaved(localDb.isExamSaved(user?.id, exam?.id));
  }, [user?.id, exam?.id]);

  const toggleSave = (e) => {
    e.stopPropagation();
    if (!canSave) return;
    const next = localDb.toggleSavedExam(user.id, exam);
    setSaved(next.some((item) => String(item.id) === String(exam.id)));
  };

  return (
    <div className="flex w-full items-center gap-2 rounded-[22px] bg-[#1c2430] px-3 py-3.5 sm:px-4">
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="min-w-0 flex-1 text-left disabled:opacity-60"
      >
        <span className="block truncate font-extrabold text-white">{examRowTitle(exam)}</span>
        <span className="mt-1 block text-xs font-semibold text-white/45">
          {examSubject(exam)}
          {questions ? ` · ${questions} sual` : ''}
          {minutes ? ` · ${minutes} dəq` : ''}
        </span>
      </button>
      {canSave ? (
        <button
          type="button"
          aria-label={saved ? 'Saxlanıldı' : 'Saxla'}
          title={saved ? 'Saxlanıldı' : 'Saxla'}
          onClick={toggleSave}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            saved ? 'bg-[#f0b429]/15 text-[#f0b429]' : 'bg-white/5 text-white/45'
          }`}
        >
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      ) : null}
      {badge ? (
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
          live ? 'bg-[#1f7a3a] text-[#b6f0c8]' : 'bg-white/10 text-white/70'
        }`}
        >
          {live ? '● ' : ''}{badge}
        </span>
      ) : null}
    </div>
  );
}

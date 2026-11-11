import { useContext, useEffect, useState } from 'react';
import { BarChart3, Bookmark, Check, MoreVertical, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ConfirmDialog } from './ui';
import { displayExamDescription } from '../lib/driveLinks';
import { examVisibility } from '../lib/examVisibility';
import { localDb } from '../lib/localDb';
import { examSubject } from '../lib/publicExams';
import { examRankingEnabled, isRepublicExam, isWeeklyQuiz, setExamRankingEnabled } from '../lib/examKind';
import { isExamLive, resolveExamStatus, studentResultsReady } from '../lib/utils';
import { readExamOutcome } from '../lib/examOutcomes';
import { isNewExam, markExamSeen } from '../lib/examFresh';

export function examRowTitle(exam) {
  const note = displayExamDescription(exam);
  const title = String(exam?.title || exam?.Title || '')
    .replace(/VIS:(public|private)\s*/gi, '')
    .replace(/DRVFILE:\S+\s*/gi, '')
    .trim();
  return note || title || 'İmtahan';
}

function ActionSheet({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#1a1d26] px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        {title ? <p className="mb-3 truncate text-[15px] font-extrabold text-white/55">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export default function ExamRow({ exam, onOpen, onDelete, onStats, mine, onToggleRanking }) {
  const { user } = useContext(AuthContext);
  const canSave = Boolean(user?.id) && (user?.role === 'Student' || user?.practiceRole === 'Student');
  const [saved, setSaved] = useState(() => localDb.isExamSaved(user?.id, exam?.id));
  const [confirm, setConfirm] = useState(false);
  const [menu, setMenu] = useState(false);
  const weekly = isWeeklyQuiz(exam);
  const live = !weekly && isExamLive(exam);
  const status = resolveExamStatus(exam);
  const rankingOn = examRankingEnabled(exam);
  const questions = exam.totalQuestions ?? exam.questionCount ?? exam.QuestionCount ?? 0;
  const minutes = exam.durationMinutes ?? exam.DurationMinutes ?? 0;
  const taken = exam.submissionsCount ?? exam.SubmissionsCount ?? 0;
  const teacher = user?.role === 'Teacher' || user?.role === 'Admin';
  const title = examRowTitle(exam);
  const publicExam = examVisibility(exam) === 'public';
  const badge = weekly
    ? 'Həftəlik quiz'
    : live
      ? 'Canlı'
      : status === 'Finished'
        ? 'Bitib'
        : status === 'Scheduled'
          ? 'Gözləyir'
          : status === 'Draft'
            ? 'Qaralama'
            : '';
  const storedOutcome = readExamOutcome(user?.id, exam?.id);
  const localSub = localDb.getSubmissions().find((row) => (
    String(row.examId) === String(exam?.id) && String(row.studentId) === String(user?.id)
  ));
  const resultsReady = studentResultsReady(exam, user);
  const resultPercent = storedOutcome?.percent ?? mine?.percent ?? mine?.score ?? localSub?.percent ?? localSub?.score;
  const resultRank = storedOutcome?.rank ?? mine?.rank ?? mine?.Rank;
  const submittedMine = Boolean(storedOutcome || mine?.submittedAt || mine?.SubmittedAt || localSub?.submittedAt);
  const fresh = isNewExam(exam, { userId: user?.id, submitted: submittedMine });

  useEffect(() => {
    setSaved(localDb.isExamSaved(user?.id, exam?.id));
  }, [user?.id, exam?.id]);

  const toggleSave = (e) => {
    e.stopPropagation();
    if (!canSave) return;
    const next = localDb.toggleSavedExam(user.id, exam);
    setSaved(next.some((item) => String(item.id) === String(exam.id)));
  };

  const openStats = (e) => {
    e?.stopPropagation?.();
    setMenu(false);
    if (onStats) onStats(exam);
    else onOpen?.();
  };

  const meta = [
    questions ? `${questions} sual` : '',
    minutes ? `${minutes} dəq` : '',
    teacher && taken ? `${taken} iştirakçı` : '',
  ].filter(Boolean).join(' · ');

  if (teacher) {
    return (
      <article className="rounded-[24px] bg-[#1c212c] p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {badge ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                live ? 'bg-[#1f7a3a] text-[#b6f0c8]' : 'bg-white/10 text-white/70'
              }`}
              >
                {live ? <span className="h-1.5 w-1.5 rounded-full bg-[#86efac]" /> : null}
                {badge}
              </span>
            ) : null}
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-extrabold text-white/55">
              {publicExam ? 'Açıq' : 'Özəl'}
            </span>
            {weekly || isRepublicExam(exam) ? null : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !rankingOn;
                  setExamRankingEnabled(exam, next);
                  onToggleRanking?.(exam, next);
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                  rankingOn ? 'bg-[#1f7a3a] text-[#b6f0c8]' : 'bg-white/10 text-white/55'
                }`}
              >
                {rankingOn ? 'Sıralama açıq' : 'Sıralama bağlı'}
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Əməliyyatlar"
            onClick={() => setMenu(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/45"
          >
            <MoreVertical size={18} />
          </button>
        </div>
        <button type="button" onClick={onOpen} disabled={!onOpen} className="mt-3 w-full text-left disabled:opacity-60">
          <span className="block text-[17px] font-black leading-snug">{title}</span>
        </button>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="min-w-0 text-sm font-semibold text-white/45">{meta || examSubject(exam)}</p>
          <button
            type="button"
            onClick={openStats}
            className="shrink-0 text-sm font-extrabold text-[#9d8cff]"
          >
            Statistika →
          </button>
        </div>
        <ActionSheet open={menu} title={title} onClose={() => setMenu(false)}>
          <button
            type="button"
            onClick={openStats}
            className="flex min-h-14 w-full items-center gap-3 border-b border-white/[0.06] text-left text-[17px] font-extrabold"
          >
            <BarChart3 size={18} /> Statistika
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                setConfirm(true);
              }}
              className="flex min-h-14 w-full items-center gap-3 text-left text-[17px] font-extrabold text-[#fb7185]"
            >
              <Trash2 size={18} /> Sil
            </button>
          ) : null}
        </ActionSheet>
        {confirm ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" onClick={() => setConfirm(false)}>
            <div className="absolute inset-0 bg-black/55" />
            <div
              className="relative w-full max-w-sm rounded-[28px] bg-[#1c212c] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[20px] font-black leading-snug">İmtahanı silmək istəyirsiniz?</h3>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-white/55">
                “{title}” silinəcək. Bu əməliyyatı geri qaytarmaq olmaz.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="min-h-12 rounded-full bg-white/[0.06] text-sm font-extrabold"
                >
                  Ləğv et
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirm(false);
                    onDelete?.(exam);
                  }}
                  className="min-h-12 rounded-full bg-[#ef4444] text-sm font-extrabold text-white"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article className={`exam-row card-vector min-w-0 overflow-hidden rounded-[22px] p-3.5 ${
      submittedMine
        ? 'bg-[var(--card)] ring-1 ring-[#2ee07a]/40'
        : fresh
          ? 'exam-row-new bg-[var(--card)] ring-1 ring-[var(--accent)]/55'
          : 'bg-[var(--card)] ring-1 ring-[var(--line)]'
    }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => {
            if (fresh) markExamSeen(user?.id, exam?.id);
            onOpen?.();
          }}
          disabled={!onOpen}
          className="min-w-0 flex-1 text-left disabled:opacity-60"
        >
          {submittedMine ? (
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#2ee07a]/18 px-2 py-0.5 text-[11px] font-extrabold text-[#8fd4a4]">
              <Check size={12} strokeWidth={3} /> İşlənib
            </span>
          ) : fresh ? (
            <span className="exam-new-badge mb-1.5 inline-flex items-center rounded-full bg-[#f5a623] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#3a2200]">
              Yeni
            </span>
          ) : null}
          <span className={`line-clamp-2 font-extrabold leading-snug ${submittedMine ? 'text-[var(--success-text)]' : 'text-[var(--text)]'}`}>{title}</span>
          <span className="mt-1 block truncate text-xs font-semibold text-[var(--muted)]">
            {examSubject(exam)}
            {questions ? ` · ${questions} sual` : ''}
            {minutes ? ` · ${minutes} dəq` : ''}
          </span>
        </button>
        {onDelete ? (
          <button
            type="button"
            aria-label="Sil"
            onClick={(e) => {
              e.stopPropagation();
              setConfirm(true);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-[#fb7185]"
          >
            <Trash2 size={15} />
          </button>
        ) : null}
        {canSave ? (
          <button
            type="button"
            aria-label={saved ? 'Saxlanıldı' : 'Saxla'}
            title={saved ? 'Saxlanıldı' : 'Saxla'}
            onClick={toggleSave}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              saved ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg)] text-[var(--muted)]'
            }`}
          >
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
        ) : null}
      </div>
      {resultsReady && (resultPercent != null || (rankingOn && resultRank)) ? (
        <p className="mt-3 text-sm font-extrabold text-[#8fd4a4]">
          Nəticə: {resultPercent != null ? `${Math.round(Number(resultPercent))}%` : '—'}
          {rankingOn && resultRank ? ` · Yer: #${resultRank}` : ''}
        </p>
      ) : submittedMine && !live && !weekly ? (
        <p className="mt-3 text-xs font-extrabold text-[var(--muted)]">Təhvil verildi · nəticə imtahan bitəndə açılır</p>
      ) : badge ? (
        <span className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
          live ? 'bg-[#1f7a3a] text-[#b6f0c8]' : 'bg-[var(--bg)] text-[var(--muted)]'
        }`}
        >
          {live ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#86efac]" /> : null}
          {badge}
        </span>
      ) : null}
      <ConfirmDialog
        open={confirm}
        text="Bu imtahan silinəcək."
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onDelete?.(exam);
        }}
      />
    </article>
  );
}

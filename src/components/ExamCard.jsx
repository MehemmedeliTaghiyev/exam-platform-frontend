import { useState } from 'react';
import { Calendar, Users, Clock, HelpCircle, Trash2, Sparkles, Lock, Bookmark } from 'lucide-react';
import { Badge, Card, ConfirmDialog } from './ui';
import { formatDateTime, resolveExamStatus } from '../lib/utils';
import { examVisibility } from '../lib/examVisibility';
import { isAiExam } from '../lib/questionDifficulty';
import { displayExamDescription } from '../lib/driveLinks';

function visibleExamTitle(exam) {
  const note = displayExamDescription(exam);
  const title = String(exam?.title || exam?.Title || '')
    .replace(/VIS:(public|private)\s*/gi, '')
    .replace(/DRVFILE:\S+\s*/gi, '')
    .trim();
  return note || title || 'İmtahan';
}

export default function ExamCard({
  exam,
  onOpen,
  onDelete,
  actionLabel = 'Aç',
  showTimes = false,
  teacherName = '',
  locked = false,
  entered = false,
  resultText = '',
  saved = false,
  onToggleSave,
  onRetake,
}) {
  const [confirm, setConfirm] = useState(false);
  const status = resolveExamStatus(exam);
  const tone = status === 'Live' ? 'success' : status === 'Finished' ? 'neutral' : status === 'Draft' ? 'warning' : 'brand';
  const label = status === 'Live' ? 'Canlı' : status === 'Finished' ? 'Bitib' : status === 'Draft' ? 'Qaralama' : 'Planlanıb';
  const topic = visibleExamTitle(exam);
  const subject = exam.subjectName || exam.subject;
  const ai = isAiExam(exam);

  return (
    <Card
      onClick={onOpen}
      className={`ep-lift flex h-full flex-col ${ai ? 'border-transparent bg-[linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(135deg,#5b4cf5,#22d3ee)_border-box] [border-width:1.5px]' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">Mövzu</p>
          <h3 className="mt-0.5 text-lg font-extrabold">{topic}</h3>
          {subject ? (
            <p className="mt-1 text-sm font-semibold text-[var(--accent)]">{subject}</p>
          ) : null}
          {teacherName ? (
            <p className="mt-1 text-xs text-gray-500">{teacherName}</p>
          ) : null}
          {resultText ? (
            <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-300">Nəticə: {resultText}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {ai ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">
              <Sparkles size={12} /> AI
            </span>
          ) : null}
          {entered ? <Badge tone="success">Daxil olundu</Badge> : null}
          {locked ? (
            <Badge tone="neutral">
              <span className="inline-flex items-center gap-1"><Lock size={11} /> Özəl</span>
            </Badge>
          ) : examVisibility(exam) === 'public' ? (
            <Badge tone="brand">Açıq</Badge>
          ) : status !== 'Draft' ? (
            <Badge tone="neutral">Özəl</Badge>
          ) : null}
          <Badge tone={tone}>{label}</Badge>
        </div>
      </div>
      {(showTimes || status === 'Scheduled') && (exam.startTime || exam.StartTime || exam.endTime || exam.EndTime) ? (
        <div className="mt-3 space-y-1 text-xs font-medium text-gray-500">
          {exam.startTime || exam.StartTime ? (
            <p className="inline-flex items-center gap-1.5">
              <Calendar size={14} /> Başlama: {formatDateTime(exam.startTime || exam.StartTime)}
            </p>
          ) : null}
          {exam.endTime || exam.EndTime ? (
            <p className="block">Bitmə: {formatDateTime(exam.endTime || exam.EndTime)}</p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <HelpCircle size={14} /> {exam.totalQuestions ?? exam.questionCount ?? 0} sual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} /> {exam.durationMinutes ?? 0} dəq
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} /> {exam.submissionsCount ?? 0} iştirakçı
        </span>
      </div>
      {onRetake ? (
        <button
          type="button"
          className="ep-focus mt-4 inline-flex min-h-11 items-center rounded-[14px] bg-[#FABD2F] px-3 text-sm font-extrabold text-[#3a2a00]"
          onClick={(e) => {
            e.stopPropagation();
            onRetake(exam);
          }}
        >
          Yenidən həll et
        </button>
      ) : null}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
        <div className={`text-sm font-semibold ${locked ? 'text-[var(--warning-text)]' : 'text-[var(--accent)]'}`}>
          {locked ? (
            <span className="inline-flex items-center gap-1.5"><Lock size={14} /> {actionLabel}</span>
          ) : (
            <>{actionLabel} →</>
          )}
        </div>
        {onToggleSave ? (
          <button
            type="button"
            className={`ep-focus inline-flex min-h-11 items-center gap-1 rounded-[14px] px-2 text-sm font-semibold ${saved ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(exam);
            }}
          >
            <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saxlanıldı' : 'Saxla'}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            className="ep-focus inline-flex min-h-11 items-center gap-1 rounded-[14px] px-2 text-sm font-semibold text-[var(--danger-text)]"
            onClick={(e) => {
              e.stopPropagation();
              setConfirm(true);
            }}
          >
            <Trash2 size={14} /> Sil
          </button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirm}
        text="Bu imtahan silinəcək."
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onDelete(exam);
        }}
      />
    </Card>
  );
}

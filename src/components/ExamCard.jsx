import { Calendar, Users, Clock, HelpCircle } from 'lucide-react';
import { Badge, Card } from './ui';
import { formatDateTime, resolveExamStatus } from '../lib/utils';

export default function ExamCard({ exam, onOpen, actionLabel = 'Aç' }) {
  const status = resolveExamStatus(exam);
  const tone = status === 'Live' ? 'success' : status === 'Finished' ? 'neutral' : 'brand';
  const label = status === 'Live' ? 'Live' : status === 'Finished' ? 'Finished' : 'Scheduled';
  const topic = exam.description || exam.title;
  const subject = exam.subjectName || exam.subject;

  return (
    <Card onClick={onOpen} className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Mövzu</p>
          <h3 className="mt-0.5 text-base font-bold text-ink dark:text-white">{topic}</h3>
          {subject ? (
            <p className="mt-1 text-sm font-medium text-brand-600">{subject}</p>
          ) : null}
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>
      {status === 'Scheduled' && (exam.startTime || exam.StartTime) && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Calendar size={14} /> Başlama: {formatDateTime(exam.startTime || exam.StartTime)}
        </p>
      )}
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
      <div className="mt-5 text-sm font-medium text-brand-600">{actionLabel} →</div>
    </Card>
  );
}

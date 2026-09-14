import { Users, Clock, HelpCircle } from 'lucide-react';
import { Badge, Card } from './ui';

export default function ExamCard({ exam, onOpen, actionLabel = 'Aç' }) {
  return (
    <Card onClick={onOpen} className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink dark:text-white">{exam.title}</h3>
          <p className="mt-1 text-sm font-medium text-brand-600">{exam.subjectName || exam.subject || 'Fənn seçilməyib'}</p>
        </div>
        <Badge tone="brand">{exam.status || 'Aktiv'}</Badge>
      </div>
      {exam.description && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-500">{exam.description}</p>
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

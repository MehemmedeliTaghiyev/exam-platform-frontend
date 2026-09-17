import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Button, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '../components/ui';
import { createExam, createSubject, fetchExams, fetchSubjects } from '../lib/examApi';
import { errorMessage } from '../lib/utils';

function toDatetimeLocalValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TeacherDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [, setTick] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [subjectMode, setSubjectMode] = useState('existing');
  const [subjectId, setSubjectId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [startLocal, setStartLocal] = useState(() => toDatetimeLocalValue(new Date()));

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [examList, subjectList] = await Promise.all([fetchExams(), fetchSubjects()]);
      setExams(examList);
      setSubjects(subjectList);
      if (subjectList[0]) setSubjectId(String(subjectList[0].id));
      else setSubjectMode('new');
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      let subject = subjects.find((s) => String(s.id) === String(subjectId));
      if (subjectMode === 'new') {
        if (!newSubject.trim()) {
          setError('Yeni fənn adını yazın.');
          setSubmitting(false);
          return;
        }
        subject = await createSubject(newSubject);
        setSubjects((prev) => [...prev.filter((s) => s.id !== subject.id), subject]);
      }

      if (subjectMode === 'existing' && !subject) {
        setError('Fənn seçin və ya yeni fənn yaradın.');
        setSubmitting(false);
        return;
      }

      const start = new Date(startLocal);
      if (Number.isNaN(start.getTime())) {
        setError('Başlama tarixini seçin.');
        setSubmitting(false);
        return;
      }
      const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);

      const exam = await createExam({
        title,
        description,
        totalQuestions: Number(questionCount),
        durationMinutes: Number(durationMinutes),
        teacherId: user?.id,
        subjectId: subject?.id,
        subjectName: subject?.name,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: start.getTime() > Date.now() ? 'Scheduled' : 'Live',
      });

      setShowModal(false);
      setTitle('');
      setDescription('');
      setNewSubject('');
      setStartLocal(toDatetimeLocalValue(new Date()));
      setSubjectMode(subjects.length ? 'existing' : 'new');
      await load();
      navigate(`/teacher/exams/${exam.id}`, {
        state: exam.source === 'local' ? { localSaved: true } : undefined,
      });
    } catch (err) {
      setError(errorMessage(err, 'İmtahan yaradıla bilmədi.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="İmtahanlar">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Xoş gəldiniz, {user?.fullName || 'Müəllim'}</p>
          <p className="mt-1 text-2xl font-bold">Yaradılmış imtahanlar</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Yeni imtahan
        </Button>
      </div>

      {notice && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="Hələ imtahan yoxdur"
          text="Fənn seçərək və ya yeni fənn yaradaraq ilk imtahanı əlavə edin."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> İmtahan yarat
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              actionLabel="Statistika"
              onOpen={() => navigate(`/teacher/exams/${exam.id}/stats`)}
            />
          ))}
        </div>
      )}

      <Modal open={showModal} title="Yeni imtahan yarat" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreateExam} className="space-y-4">
          <Input label="İmtahan mövzusu" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Əlavə qeyd (istəyə bağlı)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2 rounded-xl bg-gray-50 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSubjectMode('existing')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                subjectMode === 'existing' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-gray-500'
              }`}
            >
              Mövcud fənn
            </button>
            <button
              type="button"
              onClick={() => setSubjectMode('new')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                subjectMode === 'new' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-gray-500'
              }`}
            >
              Yeni fənn
            </button>
          </div>
          {subjectMode === 'existing' ? (
            <Select label="Fənn" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
              {!subjects.length && <option value="">Fənn tapılmadı</option>}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Yeni fənn adı"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="məs. Kimya"
              required
            />
          )}
          <Input
            label="Başlama tarixi və saatı"
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sual sayı"
              type="number"
              min="1"
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              required
            />
            <Input
              label="Müddət (dəqiqə)"
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            Gələcək tarix seçsəniz imtahan Scheduled olacaq. Tələbələr kartı və mövzunu görəcək, suallar yalnız başlama vaxtında açılacaq. Müddət başlama saatından etibarən {durationMinutes} dəqiqədir.
          </p>
          {error && <p className="text-sm text-red-600">{typeof error === 'string' ? error : 'Xəta baş verdi'}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Yaradılır...' : 'Yarat'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

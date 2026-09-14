import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Button, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '../components/ui';
import { createExam, createSubject, fetchExams, fetchSubjects } from '../lib/examApi';

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [subjectMode, setSubjectMode] = useState('existing');
  const [subjectId, setSubjectId] = useState('');
  const [newSubject, setNewSubject] = useState('');

  const load = async () => {
    setLoading(true);
    const [examList, subjectList] = await Promise.all([fetchExams(), fetchSubjects()]);
    setExams(examList);
    setSubjects(subjectList);
    if (subjectList[0]) setSubjectId(String(subjectList[0].id));
    setLoading(false);
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

      const exam = await createExam({
        title,
        description,
        totalQuestions: Number(questionCount),
        durationMinutes: Number(durationMinutes),
        teacherId: user?.id ? Number(user.id) || user.id : undefined,
        subjectId: subject?.id,
        subjectName: subject?.name,
      });

      setShowModal(false);
      setTitle('');
      setDescription('');
      setNewSubject('');
      setSubjectMode('existing');
      await load();
      if (exam.source === 'local') {
        setNotice('Backend imtahanı qəbul etmədi, imtahan yerli siyahıda saxlanıldı. Kartlar yenilənib.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'İmtahan yaradıla bilmədi.');
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
              actionLabel="Statistika və suallar"
              onOpen={() => navigate(`/teacher/exams/${exam.id}`)}
            />
          ))}
        </div>
      )}

      <Modal open={showModal} title="Yeni imtahan yarat" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreateExam} className="space-y-4">
          <Input label="İmtahan adı" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Qısa təsvir"
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

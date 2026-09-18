import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Button, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '../components/ui';
import { createExam, createSubject, deleteExam, fetchExams, fetchSubjects, updateExam } from '../lib/examApi';
import { errorMessage, isExamDraft } from '../lib/utils';

function toDatetimeLocalValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function draftStorageKey(userId) {
  return `exampulse_exam_form_${userId || 'anon'}`;
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
  const skipDraftRef = useRef(false);
  const formRef = useRef({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [subjectMode, setSubjectMode] = useState('existing');
  const [subjectId, setSubjectId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [startLocal, setStartLocal] = useState(() => toDatetimeLocalValue(new Date()));

  formRef.current = {
    title,
    description,
    questionCount,
    durationMinutes,
    subjectMode,
    subjectId,
    newSubject,
    startLocal,
  };

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
      if (subjectList[0]) setSubjectId((prev) => prev || String(subjectList[0].id));
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey(user?.id));
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.title) setTitle(saved.title);
      if (saved.description) setDescription(saved.description);
      if (saved.questionCount) setQuestionCount(saved.questionCount);
      if (saved.durationMinutes) setDurationMinutes(saved.durationMinutes);
      if (saved.subjectMode) setSubjectMode(saved.subjectMode);
      if (saved.subjectId) setSubjectId(String(saved.subjectId));
      if (saved.newSubject) setNewSubject(saved.newSubject);
      if (saved.startLocal) setStartLocal(saved.startLocal);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    if (!showModal) return undefined;
    const timer = setTimeout(() => {
      localStorage.setItem(draftStorageKey(user?.id), JSON.stringify(formRef.current));
    }, 250);
    return () => clearTimeout(timer);
  }, [showModal, title, description, questionCount, durationMinutes, subjectMode, subjectId, newSubject, startLocal, user?.id]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setNewSubject('');
    setStartLocal(toDatetimeLocalValue(new Date()));
    setSubjectMode(subjects.length ? 'existing' : 'new');
    localStorage.removeItem(draftStorageKey(user?.id));
  };

  const persistDraftRemote = async () => {
    const form = formRef.current;
    if (skipDraftRef.current) return;
    if (!String(form.title || '').trim()) return;

    let subject = subjects.find((s) => String(s.id) === String(form.subjectId));
    try {
      if (form.subjectMode === 'new') {
        if (!String(form.newSubject || '').trim()) return;
        subject = await createSubject(form.newSubject);
        setSubjects((prev) => [...prev.filter((s) => s.id !== subject.id), subject]);
      }
      if (!subject) return;

      const start = new Date(form.startLocal);
      const duration = Number(form.durationMinutes) || 45;
      const end = Number.isNaN(start.getTime())
        ? new Date(Date.now() + duration * 60 * 1000)
        : new Date(start.getTime() + duration * 60 * 1000);

      const existingDraftId = (() => {
        try {
          return JSON.parse(localStorage.getItem(draftStorageKey(user?.id)) || '{}').draftExamId;
        } catch {
          return null;
        }
      })();

      const payload = {
        title: form.title,
        description: form.description,
        totalQuestions: Number(form.questionCount) || 10,
        durationMinutes: duration,
        teacherId: user?.id,
        subjectId: subject?.id,
        subjectName: subject?.name,
        startTime: (Number.isNaN(start.getTime()) ? new Date() : start).toISOString(),
        endTime: end.toISOString(),
        isDraft: true,
        status: 'Draft',
      };

      let exam;
      if (existingDraftId) {
        try {
          await updateExam(existingDraftId, { ...payload, status: 'Draft' });
          exam = { id: existingDraftId };
        } catch {
          exam = await createExam(payload);
        }
      } else {
        exam = await createExam(payload);
      }

      localStorage.setItem(
        draftStorageKey(user?.id),
        JSON.stringify({ ...form, draftExamId: exam.id }),
      );
      setNotice('İmtahan qaralama kimi saxlanıldı. İstədiyiniz vaxt davam edə bilərsiniz.');
      await load();
    } catch {
      /* local form already saved */
    }
  };

  const closeModal = async () => {
    setShowModal(false);
    await persistDraftRemote();
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    skipDraftRef.current = true;
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      let subject = subjects.find((s) => String(s.id) === String(subjectId));
      if (subjectMode === 'new') {
        if (!newSubject.trim()) {
          setError('Yeni fənn adını yazın.');
          setSubmitting(false);
          skipDraftRef.current = false;
          return;
        }
        subject = await createSubject(newSubject);
        setSubjects((prev) => [...prev.filter((s) => s.id !== subject.id), subject]);
      }

      if (subjectMode === 'existing' && !subject) {
        setError('Fənn seçin və ya yeni fənn yaradın.');
        setSubmitting(false);
        skipDraftRef.current = false;
        return;
      }

      const start = new Date(startLocal);
      if (Number.isNaN(start.getTime())) {
        setError('Başlama tarixini seçin.');
        setSubmitting(false);
        skipDraftRef.current = false;
        return;
      }
      const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);

      const savedDraftId = (() => {
        try {
          return JSON.parse(localStorage.getItem(draftStorageKey(user?.id)) || '{}').draftExamId;
        } catch {
          return null;
        }
      })();

      const payload = {
        title,
        description,
        totalQuestions: Number(questionCount),
        durationMinutes: Number(durationMinutes),
        teacherId: user?.id,
        subjectId: subject?.id,
        subjectName: subject?.name,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isDraft: false,
        status: start.getTime() > Date.now() ? 'Scheduled' : 'Live',
      };

      let exam;
      if (savedDraftId) {
        try {
          await updateExam(savedDraftId, payload);
          exam = { id: savedDraftId, source: 'remote' };
        } catch {
          exam = await createExam(payload);
        }
      } else {
        exam = await createExam(payload);
      }

      setShowModal(false);
      resetForm();
      await load();
      navigate(`/teacher/exams/${exam.id}`, {
        state: exam.source === 'local' ? { localSaved: true } : undefined,
      });
    } catch (err) {
      skipDraftRef.current = false;
      setError(errorMessage(err, 'İmtahan yaradıla bilmədi.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`“${exam.title}” imtahanını silmək istəyirsiniz?`)) return;
    try {
      await deleteExam(exam.id);
      setExams((prev) => prev.filter((e) => String(e.id) !== String(exam.id)));
    } catch (err) {
      setNotice(errorMessage(err, 'İmtahan silinmədi.'));
    }
  };

  return (
    <AppShell title="İmtahanlar">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Xoş gəldiniz, {user?.fullName || 'Müəllim'}</p>
          <p className="mt-1 text-2xl font-bold">Yaradılmış imtahanlar</p>
        </div>
        <Button
          onClick={() => {
            skipDraftRef.current = false;
            setShowModal(true);
          }}
        >
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
              actionLabel={isExamDraft(exam) ? 'Davam et' : 'Statistika'}
              onOpen={() =>
                navigate(isExamDraft(exam) ? `/teacher/exams/${exam.id}` : `/teacher/exams/${exam.id}/stats`)
              }
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal open={showModal} title="Yeni imtahan yarat" onClose={closeModal}>
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
            “Yarat” düyməsinə basmadan səhifədən çıxsanız imtahan qaralama kimi saxlanılacaq. Gələcək tarix
            seçsəniz imtahan Scheduled olacaq.
          </p>
          {error && <p className="text-sm text-red-600">{typeof error === 'string' ? error : 'Xəta baş verdi'}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                closeModal();
              }}
            >
              Bağla
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Yaradılır...' : 'İmtahanı yarat'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

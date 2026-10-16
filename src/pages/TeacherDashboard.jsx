import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import WeeklyRanking from '../components/WeeklyRanking';
import { Button, EmptyState, FormError, Input, Modal, Select, Skeleton, Textarea } from '../components/ui';
import { createExam, createSubject, deleteExam, fetchExams, fetchOwnProfile, fetchSubjects, updateExam } from '../lib/examApi';
import { errorMessage, examCanEdit, isExamDraft, resolveExamStatus } from '../lib/utils';
import AccessPeriodBanner from '../components/AccessPeriodBanner';
import ExamSearchBar from '../components/ExamSearchBar';
import { examMatchesSearch } from '../lib/publicExams';
import { driveFileViewUrl, parseDriveFileId } from '../lib/driveLinks';

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
  const [periodUser, setPeriodUser] = useState(user);
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
  const [driveFileLink, setDriveFileLink] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [examFilter, setExamFilter] = useState('all');
  const [nameQuery, setNameQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');

  formRef.current = {
    title,
    description,
    questionCount,
    durationMinutes,
    subjectMode,
    subjectId,
    newSubject,
    startLocal,
    driveFileLink,
    visibility,
  };

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [examList, subjectList, me] = await Promise.all([
        fetchExams(),
        fetchSubjects(),
        fetchOwnProfile().catch(() => null),
      ]);
      setExams(examList);
      setSubjects(subjectList);
      if (me) setPeriodUser({ ...user, ...me, role: user?.role || 'Teacher' });
      if (me?.driveFolderUrl) setFolderUrl(me.driveFolderUrl);
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
      if (saved.driveFileLink) setDriveFileLink(saved.driveFileLink);
      if (saved.visibility === 'public' || saved.visibility === 'private') setVisibility(saved.visibility);
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
  }, [showModal, title, description, questionCount, durationMinutes, subjectMode, subjectId, newSubject, startLocal, driveFileLink, visibility, user?.id]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setNewSubject('');
    setStartLocal(toDatetimeLocalValue(new Date()));
    setDriveFileLink('');
    setVisibility('private');
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
        visibility: form.visibility === 'public' ? 'public' : 'private',
        isPublic: form.visibility === 'public',
        pdfFileUrl: driveFileViewUrl(parseDriveFileId(form.driveFileLink)) || undefined,
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
        isDraft: true,
        status: 'Draft',
        visibility: visibility === 'public' ? 'public' : 'private',
        isPublic: visibility === 'public',
        pdfFileUrl: driveFileViewUrl(parseDriveFileId(driveFileLink)) || undefined,
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
    try {
      await deleteExam(exam.id);
      setExams((prev) => prev.filter((e) => String(e.id) !== String(exam.id)));
    } catch (err) {
      setNotice(errorMessage(err, 'İmtahan silinmədi.'));
    }
  };

  const visibleExams = exams.filter((exam) => {
    if (examFilter === 'draft' && !isExamDraft(exam)) return false;
    if (examFilter === 'finished' && resolveExamStatus(exam) !== 'Finished') return false;
    return examMatchesSearch(exam, { name: nameQuery, date: dateQuery });
  });

  return (
    <AppShell
      title="İmtahanlar"
      action={(
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> <span className="max-[860px]:sr-only">Yeni imtahan</span>
        </Button>
      )}
    >
      <AccessPeriodBanner user={periodUser || user} />
      <ExamSearchBar name={nameQuery} date={dateQuery} onName={setNameQuery} onDate={setDateQuery} />
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ['all', 'Hamısı'],
          ['draft', 'Qaralama'],
          ['finished', 'Bitmiş'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setExamFilter(key)}
            className={`ep-focus min-h-11 rounded-full px-4 text-sm font-extrabold ${
              examFilter === key
                ? 'bg-[linear-gradient(135deg,#5b4cf5,#7c5cff)] text-white'
                : 'border border-[var(--line)] bg-[var(--card)] text-[var(--muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {notice}
        </div>
      )}

      <WeeklyRanking variant="teacher" />

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
      ) : visibleExams.length === 0 ? (
        <EmptyState title="Uyğun imtahan yoxdur" text="Adı və ya tarixi dəyişin." />
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
          {visibleExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              actionLabel={examCanEdit(exam) ? (isExamDraft(exam) ? 'Davam et →' : 'Redaktə et →') : 'Statistika →'}
              onOpen={() =>
                navigate(examCanEdit(exam) ? `/teacher/exams/${exam.id}` : `/teacher/exams/${exam.id}/stats`)
              }
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal open={showModal} title="Yeni imtahan yarat" onClose={closeModal}>
        <form onSubmit={handleCreateExam} noValidate className="space-y-4">
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
            AI lazım deyil. İmtahanı özəl və ya açıq dərc edə bilərsiniz — ikisini də özünüz seçirsiniz.
          </p>
          <Input label="İmtahan mövzusu" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Əlavə qeyd (istəyə bağlı)"
            rows={2}
            className="bg-white text-gray-900 placeholder:text-gray-500 dark:bg-slate-900 dark:text-gray-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                visibility === 'private'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'
              }`}
            >
              Özəl
            </button>
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                visibility === 'public'
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'
              }`}
            >
              Açıq
            </button>
          </div>
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
          <p className="text-sm text-gray-800 dark:text-gray-200">
            “Yarat” düyməsinə basmadan səhifədən çıxsanız imtahan qaralama kimi saxlanılacaq. Gələcək tarix
            seçsəniz imtahan planlanmış olacaq.
          </p>
          {folderUrl ? (
            <a className="block text-sm font-medium text-brand-700 underline dark:text-brand-300" href={folderUrl} target="_blank" rel="noreferrer">
              Drive qovluğunu açın — PDF-i ora yükləyin
            </a>
          ) : null}
          <Input
            label="Bu imtahanın Drive fayl linki"
            value={driveFileLink}
            onChange={(e) => setDriveFileLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/.../view"
          />
          <FormError message={typeof error === 'string' ? error : ''} />
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

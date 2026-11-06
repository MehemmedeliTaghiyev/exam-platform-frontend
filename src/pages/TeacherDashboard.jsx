import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import ExamRow from '../components/ExamRow';
import { Button, FormError, Input, Modal, Select, Skeleton, Textarea } from '../components/ui';
import { createExam, createSubject, deleteExam, fetchExams, fetchOwnProfile, fetchSubjects, updateExam } from '../lib/examApi';
import { errorMessage, examCanEdit, isExamDraft, isExamLive, normalizeRole, resolveExamStatus } from '../lib/utils';
import { republicAdminExams, republicMonthLabel } from '../lib/republicExam';
import TokenBanner from '../components/TokenBanner';
import { filterPublicExams, uniqueSubjects } from '../lib/publicExams';
import { driveFileViewUrl, parseDriveFileId } from '../lib/driveLinks';
import { withMixedMark } from '../lib/syllabus';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

function shortDay(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

function examMonthKey(exam) {
  if (exam?.month) return String(exam.month);
  const raw = exam?.startTime || exam?.createdAt || '';
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return String(raw).slice(0, 7);
}

const STATUS_FILTERS = [
  { id: 'all', label: 'Hamısı' },
  { id: 'live', label: 'Canlı' },
  { id: 'draft', label: 'Qaralama' },
  { id: 'finished', label: 'Bitmiş' },
];

function FilterSheet({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#1a1d26] px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-16px_40px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <p className="mb-1 text-[15px] font-extrabold text-white/45">{title}</p>
        {children}
      </div>
    </div>
  );
}

function SheetRow({ active, children, onClick, trailing = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/[0.06] text-left text-[17px] font-extrabold last:border-0 ${
        active ? 'text-[#9d8cff]' : 'text-white'
      }`}
    >
      <span>{children}</span>
      {trailing || (active ? <Check size={18} /> : null)}
    </button>
  );
}

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
  const isAdmin = normalizeRole(user?.role) === 'Admin';
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
  const [mixedTopics, setMixedTopics] = useState(false);
  const [examFilter, setExamFilter] = useState('all');
  const [dateMode, setDateMode] = useState('all');
  const [pickDate, setPickDate] = useState('');
  const [fen, setFen] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [sheet, setSheet] = useState('');
  const dateRef = useRef(null);

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
    mixedTopics,
  };

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const list = republicAdminExams();
        setExams(list);
        setSubjects([{ id: 'republic', name: 'Respublika' }]);
        setLoading(false);
        return;
      }
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
  }, [isAdmin]);

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
      if (typeof saved.mixedTopics === 'boolean') setMixedTopics(saved.mixedTopics);
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
  }, [showModal, title, description, questionCount, durationMinutes, subjectMode, subjectId, newSubject, startLocal, driveFileLink, visibility, mixedTopics, user?.id]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setNewSubject('');
    setStartLocal(toDatetimeLocalValue(new Date()));
    setDriveFileLink('');
    setVisibility('private');
    setMixedTopics(false);
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

      const mixed = Boolean(form.mixedTopics);
      const payload = {
        title: form.title,
        description: withMixedMark(form.description, mixed),
        totalQuestions: Number(form.questionCount) || 10,
        durationMinutes: duration,
        teacherId: user?.id,
        subjectId: subject?.id,
        subjectName: subject?.name,
        startTime: (Number.isNaN(start.getTime()) ? new Date() : start).toISOString(),
        endTime: end.toISOString(),
        isDraft: true,
        status: 'Draft',
        visibility: mixed ? 'private' : form.visibility === 'public' ? 'public' : 'private',
        isPublic: !mixed && form.visibility === 'public',
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
        description: withMixedMark(description, mixedTopics),
        totalQuestions: Number(questionCount),
        durationMinutes: Number(durationMinutes),
        teacherId: user?.id,
        subjectId: subject?.id,
        subjectName: subject?.name,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isDraft: true,
        status: 'Draft',
        visibility: mixedTopics ? 'private' : visibility === 'public' ? 'public' : 'private',
        isPublic: !mixedTopics && visibility === 'public',
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

  const fenNames = useMemo(() => uniqueSubjects(exams), [exams]);
  const monthKeys = useMemo(() => {
    const keys = [...new Set(exams.map(examMonthKey).filter(Boolean))];
    keys.sort((a, b) => String(b).localeCompare(String(a)));
    return keys;
  }, [exams]);
  const visibleExams = useMemo(() => {
    const dated = isAdmin
      ? exams.filter((exam) => monthFilter === 'all' || examMonthKey(exam) === monthFilter)
      : filterPublicExams(exams, { dateMode, pickDate, subject: fen });
    return dated.filter((exam) => {
      if (examFilter === 'draft') return isExamDraft(exam);
      if (examFilter === 'live') return isExamLive(exam);
      if (examFilter === 'finished') return resolveExamStatus(exam) === 'Finished';
      return true;
    });
  }, [exams, dateMode, pickDate, fen, examFilter, isAdmin, monthFilter]);
  const filteredOn = isAdmin
    ? examFilter !== 'all' || monthFilter !== 'all'
    : examFilter !== 'all' || dateMode !== 'all' || fen !== 'all' || Boolean(pickDate);
  const dateActive = dateMode !== 'all' || Boolean(pickDate);
  const fenActive = fen !== 'all';
  const monthActive = monthFilter !== 'all';
  const monthLabel = monthFilter === 'all' ? 'Bütün aylar' : republicMonthLabel(monthFilter);
  const dateLabel = pickDate
    ? shortDay(pickDate)
    : dateMode === 'today'
      ? 'Bu gün'
      : dateMode === 'yesterday'
        ? 'Dünən'
        : 'Bütün günlər';
  const fenLabel = fen === 'all' ? 'Bütün fənlər' : fen;

  const setDay = (mode) => {
    setDateMode(mode);
    setPickDate('');
    setSheet('');
  };

  const clearFilters = () => {
    setExamFilter('all');
    setDateMode('all');
    setPickDate('');
    setFen('all');
    setMonthFilter('all');
    setSheet('');
  };

  const openDatePicker = () => {
    setSheet('');
    window.setTimeout(() => dateRef.current?.showPicker?.() || dateRef.current?.click(), 80);
  };

  return (
    <AppShell
      title="İmtahanlar"
      action={isAdmin ? null : (
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> <span className="max-[767px]:sr-only">Yeni imtahan</span>
        </Button>
      )}
    >
      {isAdmin ? null : <TokenBanner user={periodUser || user} />}
      {notice && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {notice}
        </div>
      )}

      <div className="teacher-home">
      <div className="exam-board teacher-board rounded-[28px] p-4 ring-1 ring-[var(--line)]">
        <div className="flex rounded-full bg-black/25 p-1">
          {STATUS_FILTERS.map((item) => {
            const on = examFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setExamFilter(item.id)}
                className={`min-h-9 flex-1 rounded-full px-2 text-[13px] font-extrabold ${
                  on ? 'bg-[#c4a35a] text-[#1a160e]' : 'text-white/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => setSheet(sheet === 'month' ? '' : 'month')}
              className={`mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-extrabold ${
                monthActive ? 'bg-[#c4a35a] text-[#1a160e]' : 'bg-black/25 text-white/80'
              }`}
            >
              <CalendarDays size={16} />
              <span className="truncate">{monthLabel}</span>
              <ChevronDown size={16} className="shrink-0 opacity-70" />
            </button>
            <FilterSheet title="Ay" open={sheet === 'month'} onClose={() => setSheet('')}>
              <SheetRow
                active={!monthActive}
                onClick={() => {
                  setMonthFilter('all');
                  setSheet('');
                }}
              >
                Bütün aylar
              </SheetRow>
              {monthKeys.map((key) => (
                <SheetRow
                  key={key}
                  active={monthFilter === key}
                  onClick={() => {
                    setMonthFilter(key);
                    setSheet('');
                  }}
                >
                  {republicMonthLabel(key)}
                </SheetRow>
              ))}
            </FilterSheet>
          </>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSheet(sheet === 'date' ? '' : 'date')}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-extrabold ${
                  dateActive ? 'bg-[#c4a35a] text-[#1a160e]' : 'bg-black/25 text-white/80'
                }`}
              >
                <CalendarDays size={16} />
                <span className="truncate">{dateLabel}</span>
                <ChevronDown size={16} className="shrink-0 opacity-70" />
              </button>
              <button
                type="button"
                onClick={() => setSheet(sheet === 'fen' ? '' : 'fen')}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-extrabold ${
                  fenActive ? 'bg-[#c4a35a] text-[#1a160e]' : 'bg-black/25 text-white/80'
                }`}
              >
                <BookOpen size={16} />
                <span className="truncate">{fenLabel}</span>
                <ChevronDown size={16} className="shrink-0 opacity-70" />
              </button>
            </div>
            <input
              ref={dateRef}
              type="date"
              value={pickDate}
              onChange={(e) => {
                const value = e.target.value;
                setPickDate(value);
                setDateMode(value ? 'pick' : 'all');
                setSheet('');
              }}
              aria-hidden
              tabIndex={-1}
              className="sr-only"
            />
            <FilterSheet title="Tarix" open={sheet === 'date'} onClose={() => setSheet('')}>
              <SheetRow active={!dateActive} onClick={() => setDay('all')}>Bütün günlər</SheetRow>
              <SheetRow active={dateMode === 'today'} onClick={() => setDay('today')}>Bu gün</SheetRow>
              <SheetRow active={dateMode === 'yesterday'} onClick={() => setDay('yesterday')}>Dünən</SheetRow>
              <SheetRow
                active={dateMode === 'pick' && Boolean(pickDate)}
                onClick={openDatePicker}
                trailing={<ChevronRight size={18} className="text-[#9d8cff]" />}
              >
                <span className="inline-flex items-center gap-2 text-[#9d8cff]">
                  <CalendarDays size={16} /> {pickDate ? shortDay(pickDate) : 'Tarix seç...'}
                </span>
              </SheetRow>
            </FilterSheet>
            <FilterSheet title="Fənn" open={sheet === 'fen'} onClose={() => setSheet('')}>
              <SheetRow
                active={!fenActive}
                onClick={() => {
                  setFen('all');
                  setSheet('');
                }}
              >
                Bütün fənlər
              </SheetRow>
              {fenNames.map((name) => (
                <SheetRow
                  key={name}
                  active={fen === name}
                  onClick={() => {
                    setFen(name);
                    setSheet('');
                  }}
                >
                  {name}
                </SheetRow>
              ))}
            </FilterSheet>
          </>
        )}

        <div className="mt-4 flex items-center justify-between text-xs font-bold text-white/45">
          <span>{loading ? '…' : `${visibleExams.length} imtahan`}</span>
          {filteredOn ? (
            <button type="button" onClick={clearFilters} className="font-extrabold text-[#c4a35a]">
              Təmizlə
            </button>
          ) : null}
        </div>

        <div className="mt-3 space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-16 rounded-[22px]" />
              <Skeleton className="h-16 rounded-[22px]" />
            </>
          ) : exams.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-extrabold">Hələ imtahan yoxdur</p>
              <p className="mt-1 text-sm font-semibold text-white/45">
                {isAdmin ? 'Respublika sınaqları burada görünəcək.' : 'Fənn seçərək ilk imtahanı əlavə edin.'}
              </p>
              {isAdmin ? null : (
                <Button className="mt-5" onClick={() => setShowModal(true)}>
                  <Plus size={16} /> İmtahan yarat
                </Button>
              )}
            </div>
          ) : visibleExams.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white/40">
                <Search size={22} />
              </span>
              <p className="mt-4 font-extrabold">Uyğun imtahan yoxdur</p>
              <p className="mt-1 text-sm font-semibold text-white/45">
                {isAdmin ? 'Başqa ay seçin.' : 'Başqa gün və ya fənn seçin.'}
              </p>
              {filteredOn ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-full bg-[#c4a35a] px-4 py-2 text-sm font-extrabold text-[#1a160e]"
                >
                  Bütün imtahanlara bax
                </button>
              ) : null}
            </div>
          ) : (
            <div className="exam-board-list">
            {visibleExams.map((exam) => (
              <ExamRow
                key={exam.id}
                exam={exam}
                onOpen={() =>
                  exam.source === 'republic'
                    ? navigate(`/admin/exams/${exam.id}`)
                    : navigate(examCanEdit(exam) ? `/teacher/exams/${exam.id}` : `/teacher/exams/${exam.id}/stats`)
                }
                onStats={() => navigate(exam.source === 'republic' ? `/admin/exams/${exam.id}` : `/teacher/exams/${exam.id}/stats`)}
                onDelete={exam.source === 'republic' ? undefined : handleDelete}
              />
            ))}
            </div>
          )}
        </div>
      </div>

      </div>

      <Modal open={showModal} title="Yeni imtahan yarat" onClose={closeModal}>
        <form onSubmit={handleCreateExam} noValidate className="space-y-4">
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
            Tək mövzulu sınağı hamı ilə açıq paylaşmaq olar. Bir neçə mövzu qarışıqdırsa, yalnız öz tələbələriniz görür.
          </p>
          <Input label="İmtahan mövzusu" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Əlavə qeyd (istəyə bağlı)"
            rows={2}
            className="bg-white text-gray-900 placeholder:text-gray-500 dark:bg-slate-900 dark:text-gray-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={mixedTopics}
              onChange={(e) => {
                const on = e.target.checked;
                setMixedTopics(on);
                if (on) setVisibility('private');
              }}
            />
            <span>
              <span className="font-bold">Qarışıq / ümumi imtahan</span>
              <span className="mt-0.5 block text-[var(--muted)]">Bir neçə mövzu birlikdədirsə işarələyin. Yalnız öz tələbələrinizə açıq qalır.</span>
            </span>
          </label>
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
              Öz tələbələr
            </button>
            <button
              type="button"
              disabled={mixedTopics}
              onClick={() => setVisibility('public')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                visibility === 'public' && !mixedTopics
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'
              }`}
            >
              Hamı
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

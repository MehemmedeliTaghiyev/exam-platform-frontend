import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, CalendarDays, ChevronDown, Search } from 'lucide-react';
import AppShell from '../components/AppShell';
import Header from '../components/home/Header';
import '../components/home/home.css';
import { Button, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams, fetchStudentHistory } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import ExamRow from '../components/ExamRow';
import { examSortNewest } from '../lib/dailyTopicQuiz';
import { filterPublicExams, uniqueSubjects } from '../lib/publicExams';
import { isExamEnded, isExamLive, isExamScheduled } from '../lib/utils';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

function shortDay(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

function DayTab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 min-w-0 flex-1 truncate rounded-full px-2 text-[13px] font-extrabold ${
        active ? 'bg-[var(--accent)] text-[#2a2208]' : 'text-[var(--muted)]'
      }`}
    >
      {children}
    </button>
  );
}

export default function PublicExamZone({ embedded = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateRef = useRef(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState('all');
  const [pickDate, setPickDate] = useState('');
  const subject = searchParams.get('subject') || 'all';
  const [savedOnly, setSavedOnly] = useState(() => searchParams.get('saved') === '1');
  const [savedRev, setSavedRev] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchAllPublicExams();
        if (!cancelled) setExams(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.practice]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    fetchStudentHistory(user.id).then((list) => {
      if (!cancelled) setHistory(list);
    }).catch(() => {
      if (!cancelled) setHistory([]);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const bump = () => setSavedRev((n) => n + 1);
    window.addEventListener('exampulse-saved-exams', bump);
    return () => window.removeEventListener('exampulse-saved-exams', bump);
  }, []);

  const student = user?.role === 'Student' || user?.practice;
  const savedIds = useMemo(() => {
    if (!student || !user?.id) return new Set();
    return new Set(localDb.getSavedExams(user.id).map((item) => String(item.id)));
  }, [student, user?.id, savedRev]);
  const subjects = useMemo(() => uniqueSubjects(exams), [exams]);
  const filtered = useMemo(() => {
    const stubs = savedOnly ? localDb.getSavedExams(user?.id) : [];
    const seen = new Set(exams.map((exam) => String(exam.id)));
    const merged = savedOnly
      ? [...exams, ...stubs.filter((stub) => !seen.has(String(stub.id)))]
      : exams;
    return filterPublicExams(merged, {
      dateMode,
      pickDate,
      subject,
      savedIds: savedOnly ? savedIds : null,
    }).sort(examSortNewest);
  }, [exams, dateMode, pickDate, subject, savedOnly, savedIds, user?.id]);
  const filteredOn = dateMode !== 'all' || subject !== 'all' || Boolean(pickDate) || savedOnly;

  const rememberExam = (exam) => {
    if (!student || !user?.id) return;
    const owner = exam.teacherId ?? exam.TeacherId;
    if (owner) localDb.followTeacher(user.id, owner);
    if (exam?.id != null) localDb.setExamVisibility(exam.id, 'public');
  };

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    if (!student) {
      navigate('/login');
      return;
    }
    rememberExam(exam);
    if (isExamEnded(exam)) {
      navigate(`/student/exams/${exam.id}/review`);
      return;
    }
    navigate(`/student/exams/${exam.id}`);
  };

  const setSubject = (name) => {
    const next = new URLSearchParams(searchParams);
    if (!name || name === 'all') next.delete('subject');
    else next.set('subject', name);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setDateMode('all');
    setPickDate('');
    setSavedOnly(false);
    const next = new URLSearchParams(searchParams);
    next.delete('subject');
    next.delete('saved');
    setSearchParams(next, { replace: true });
  };

  const setDay = (mode) => {
    setDateMode(mode);
    setPickDate('');
  };

  const emptyHint = () => {
    if (savedOnly && savedIds.size === 0) return 'Saxlanılan imtahan yoxdur';
    const day = dateMode === 'today' ? 'Bu gün' : dateMode === 'yesterday' ? 'Dünən' : pickDate ? shortDay(pickDate) : '';
    const fen = subject === 'all' ? '' : subject;
    if (savedOnly && day && fen) return `${day} ${fen} üzrə saxlanılan imtahan yoxdur`;
    if (savedOnly && day) return `${day} saxlanılan imtahan yoxdur`;
    if (savedOnly && fen) return `${fen} üzrə saxlanılan imtahan yoxdur`;
    if (savedOnly) return 'Bu filtrə uyğun saxlanılan imtahan yoxdur';
    if (day && fen) return `${day} ${fen} üzrə imtahan yoxdur`;
    if (day) return `${day} imtahan yoxdur`;
    if (fen) return `${fen} üzrə imtahan yoxdur`;
    return 'Açıq imtahan yoxdur';
  };

  const board = (
    <div className="exam-board min-w-0 overflow-hidden">
      <div className="card-vector rounded-[28px] bg-[var(--card)] p-3 ring-1 ring-[var(--line)]">
        <div className="flex min-w-0 items-center gap-1 overflow-hidden rounded-[22px] bg-[var(--bg)] p-1">
          <DayTab active={dateMode === 'all' && !pickDate} onClick={() => setDay('all')}>Hamısı</DayTab>
          <DayTab active={dateMode === 'today'} onClick={() => setDay('today')}>Bu gün</DayTab>
          <DayTab active={dateMode === 'yesterday'} onClick={() => setDay('yesterday')}>Dünən</DayTab>
          <button
            type="button"
            aria-label={pickDate ? shortDay(pickDate) : 'Tarix seç'}
            title={pickDate ? shortDay(pickDate) : 'Tarix seç'}
            onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.click()}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${
              pickDate ? 'bg-[var(--accent)] text-[#2a2208]' : 'text-[var(--muted)]'
            }`}
          >
            <CalendarDays size={18} />
          </button>
          <input
            ref={dateRef}
            type="date"
            value={pickDate}
            onChange={(e) => {
              const value = e.target.value;
              setPickDate(value);
              setDateMode(value ? 'pick' : 'all');
            }}
            aria-hidden
            tabIndex={-1}
            className="sr-only"
          />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-12 w-full appearance-none rounded-[18px] bg-[var(--bg)] px-4 pr-10 text-[15px] font-extrabold text-[var(--text)] outline-none"
            >
              <option value="all">Bütün fənlər</option>
              {subjects.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[var(--muted)]">
              <ChevronDown size={18} />
            </span>
          </label>
          {student ? (
            <button
              type="button"
              aria-label="Saxlanılanlar"
              onClick={() => setSavedOnly((on) => !on)}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-[18px] ${
                savedOnly ? 'bg-[var(--accent)] text-[#2a2208]' : 'bg-[var(--bg)] text-[var(--muted)]'
              }`}
            >
              <Bookmark size={18} fill={savedOnly ? 'currentColor' : 'none'} />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between px-1 text-[13px] font-extrabold">
          <span className="text-[var(--muted)]">{loading ? '…' : `${filtered.length} imtahan`}</span>
          {filteredOn ? (
            <button type="button" onClick={clearFilters} className="text-[var(--accent)]">
              Təmizlə
            </button>
          ) : null}
        </div>
      </div>

      <div className="exam-board-list mt-4">
        {loading ? (
          <>
            <Skeleton className="h-16 rounded-[22px]" />
            <Skeleton className="h-16 rounded-[22px]" />
          </>
        ) : filtered.length ? (
          filtered.map((exam) => (
            <ExamRow
              key={exam.id}
              exam={exam}
              mine={history.find((row) => String(row.examId) === String(exam.id))}
              onOpen={isExamScheduled(exam) ? undefined : () => openExam(exam)}
            />
          ))
        ) : (
          <div className="card-vector rounded-[24px] bg-[var(--card)] px-4 py-10 text-center ring-1 ring-[var(--line)]">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--bg)] text-[var(--muted)]">
              <Search size={26} />
            </span>
            <p className="mt-5 text-[clamp(1.05rem,4.2vw,1.35rem)] font-black leading-snug">{emptyHint()}</p>
            <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
              {savedOnly && savedIds.size === 0
                ? 'İmtahanın yanındakı əlfəcinə basanda burada görünür.'
                : 'Başqa gün və ya fənn seçin.'}
            </p>
            {filteredOn ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-extrabold text-[#2a2208]"
              >
                Bütün imtahanlara bax
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <AppShell title="">
        {board}
      </AppShell>
    );
  }

  return (
    <div className="home-page min-h-screen">
      <Header />
      <div className="mx-auto max-w-lg px-5 py-10">
        {board}
        {user ? (
          <Button variant="secondary" className="mt-8" onClick={() => navigate('/student')}>
            Kabinetə qayıt
          </Button>
        ) : null}
      </div>
    </div>
  );
}

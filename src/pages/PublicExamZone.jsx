import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, CalendarDays, Search } from 'lucide-react';
import AppShell from '../components/AppShell';
import Header from '../components/home/Header';
import '../components/home/home.css';
import { Button, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import ExamRow from '../components/ExamRow';
import { filterPublicExams, uniqueSubjects } from '../lib/publicExams';
import { isExamEnded, isExamLive, isExamScheduled } from '../lib/utils';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

function shortDay(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

function Chip({ active, children, onClick, onClear }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-extrabold ${
        active ? 'bg-[#6d5efc] text-white' : 'bg-[#252d38] text-white/70'
      }`}
    >
      {children}
      {onClear ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] leading-none"
        >
          ×
        </span>
      ) : null}
    </button>
  );
}

export default function PublicExamZone({ embedded = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const dateRef = useRef(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState('all');
  const [pickDate, setPickDate] = useState('');
  const [subject, setSubject] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedRev, setSavedRev] = useState(0);

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
    });
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

  const clearFilters = () => {
    setDateMode('all');
    setPickDate('');
    setSubject('all');
    setSavedOnly(false);
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
    <div className="exam-board rounded-[28px] bg-[#141a22] p-4 text-white ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={dateMode === 'all' && !pickDate} onClick={() => setDay('all')}>Hamısı</Chip>
        <Chip active={dateMode === 'today'} onClick={() => setDay('today')}>Bu gün</Chip>
        <Chip active={dateMode === 'yesterday'} onClick={() => setDay('yesterday')}>Dünən</Chip>
        {pickDate ? (
          <Chip active onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.click()} onClear={() => setDay('all')}>
            {shortDay(pickDate)}
          </Chip>
        ) : (
          <button
            type="button"
            aria-label="Tarix seç"
            onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.click()}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#252d38] text-white/70"
          >
            <CalendarDays size={16} />
          </button>
        )}
        {student ? (
          <Chip active={savedOnly} onClick={() => setSavedOnly((on) => !on)}>
            <Bookmark size={14} />
            Saxlanılanlar
          </Chip>
        ) : null}
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
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={subject === 'all'} onClick={() => setSubject('all')}>Bütün fənlər</Chip>
        {subjects.map((name) => (
          <Chip key={name} active={subject === name} onClick={() => setSubject(name)}>{name}</Chip>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-bold text-white/45">
        <span>{loading ? '…' : `${filtered.length} imtahan`}</span>
        {filteredOn ? (
          <button type="button" onClick={clearFilters} className="font-extrabold text-[#9d8cff]">
            Təmizlə
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
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
              onOpen={isExamScheduled(exam) ? undefined : () => openExam(exam)}
            />
          ))
        ) : (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white/40">
              <Search size={22} />
            </span>
            <p className="mt-4 font-extrabold">{emptyHint()}</p>
            <p className="mt-1 text-sm font-semibold text-white/45">
              {savedOnly && savedIds.size === 0
                ? 'İmtahanın yanındakı əlfəcinə basanda burada görünür.'
                : 'Başqa gün və ya fənn seçin.'}
            </p>
            {filteredOn ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-full bg-[#6d5efc] px-4 py-2 text-sm font-extrabold"
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

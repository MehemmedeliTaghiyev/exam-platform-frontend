import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Info, Minus, Plus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import { EmptyState, Skeleton } from '../components/ui';
import {
  addQuestion,
  createExam,
  examOwnerId,
  fetchExamReview,
  fetchExamSubmissions,
  fetchExams,
  fetchQuestions,
  paperQuestionsOf,
} from '../lib/examApi';
import { normalizeRole } from '../lib/utils';
import {
  gradeAgainstQuestion,
  gradeReviewQuestion,
  inWindow,
  isWeakExam,
  noteAttempt,
  periodBounds,
  practiceDemoWeakRows,
  questionPayload,
  rankWeakQuestions,
  rankWeakTopics,
  weakPeriodKey,
} from '../lib/weakExam';

const PREF_KEY = 'exampulse_weak_pref';
const MADE_KEY = 'exampulse_weak_made';
const USED_KEY = 'exampulse_weak_used';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function todayInput() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sourceFromQuestion(exam, question) {
  return {
    text: question.text,
    subjectName: exam.subjectName || exam.subject || '',
    options: question.options || [],
    type: question.type,
    inputKind: question.inputKind,
    points: question.points,
    imageUrl: question.imageUrl,
    difficultyLevel: question.difficultyLevel,
    correctText: question.correctText,
  };
}

function optionList(question) {
  return (question?.options || question?.Options || []).map((option) => ({
    ...option,
    text: option.text || option.optionText || option.Text || option.OptionText,
    isCorrect: Boolean(option.isCorrect ?? option.IsCorrect),
    isSelected: Boolean(option.isSelected ?? option.IsSelected),
  }));
}

async function collectRows(exams, bounds, { teacherId, allStudents }) {
  const map = new Map();
  let reviewed = 0;
  const source = exams
    .filter((exam) => exam?.id && !isWeakExam(exam))
    .filter((exam) => allStudents || !teacherId || String(examOwnerId(exam)) === String(teacherId));
  const limited = allStudents ? source : source.slice(0, 15);
  const submissionCap = allStudents ? 500 : 20;
  for (let index = 0; index < limited.length; index += 4) {
    const chunk = limited.slice(index, index + 4);
    await Promise.all(chunk.map(async (exam) => {
      const submissions = await fetchExamSubmissions(exam.id).catch(() => []);
      const mine = submissions.filter((item) => inWindow(item.submittedAt || item.SubmittedAt, bounds.start, bounds.end));
      if (!mine.length) return;
      const questions = paperQuestionsOf(await fetchQuestions(exam.id, exam).catch(() => []));
      const byId = new Map(questions.map((question) => [String(question.id), question]));
      for (const submission of mine.slice(0, submissionCap)) {
        const answers = submission.answers || submission.studentAnswers || [];
        if (answers.length && questions.length) {
          reviewed += 1;
          questions.forEach((question) => {
            const answer = answers.find((item) => String(item.questionId) === String(question.id));
            const ready = { ...question, options: optionList(question) };
            noteAttempt(map, sourceFromQuestion(exam, ready), gradeAgainstQuestion(ready, answer || {}));
          });
          continue;
        }
        const reviewId = submission.studentExamId || submission.id;
        if (!reviewId) continue;
        const review = await fetchExamReview(reviewId).catch(() => null);
        const reviewQuestions = review?.questions || review?.result?.questions || [];
        if (!reviewQuestions.length) continue;
        reviewed += 1;
        reviewQuestions.forEach((question) => {
          const known = byId.get(String(question.questionId || question.id));
          const options = optionList(question.options?.length || question.Options?.length ? question : known);
          noteAttempt(map, sourceFromQuestion(exam, {
            ...known,
            ...question,
            text: question.text || question.Text || known?.text,
            options,
            correctText: question.correctText || question.CorrectText || known?.correctText,
          }), gradeReviewQuestion({ ...question, options }));
        });
      }
    }));
  }
  const ranked = [...map.values()].filter((row) => row.wrong > 0);
  return {
    rows: rankWeakQuestions(map, ranked.length),
    topics: rankWeakTopics(map),
    reviewed,
  };
}

function Seg({ options, value, onChange }) {
  return (
    <div className="flex rounded-full bg-[#12141a] p-1">
      {options.map(([id, label]) => {
        const on = String(value) === String(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`min-h-10 flex-1 rounded-full px-2 text-[13px] font-extrabold ${
              on ? 'bg-[#7c6aff] text-white' : 'text-white/40'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-[15px] font-extrabold">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full ${checked ? 'bg-[#7c6aff]' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

function wrongPct(row) {
  const asked = Number(row.asked) || 0;
  const wrong = Number(row.wrong) || 0;
  if (!asked) return 0;
  return Math.round((wrong / asked) * 100);
}

export default function WeakExam() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const saved = readJson(`${PREF_KEY}_${user?.id || 'me'}`, {});
  const [mode, setMode] = useState(saved.mode || 'weekly');
  const [customFrom, setCustomFrom] = useState(saved.customFrom || todayInput());
  const [customTo, setCustomTo] = useState(saved.customTo || todayInput());
  const [auto, setAuto] = useState(Boolean(saved.auto));
  const [pick, setPick] = useState(Number(saved.pick) > 0 ? Number(saved.pick) : 5);
  const [allPick, setAllPick] = useState(Boolean(saved.allPick));
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [rows, setRows] = useState([]);
  const [reviewed, setReviewed] = useState(0);
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [usedMap, setUsedMap] = useState(() => readJson(`${USED_KEY}_${user?.id || 'me'}`, {}));
  const autoTried = useRef('');

  const isAdmin = normalizeRole(user?.role) === 'Admin';
  const bounds = useMemo(
    () => periodBounds(mode, customFrom, customTo),
    [mode, customFrom, customTo],
  );
  const periodKey = isAdmin ? `admin:${bounds.key}` : bounds.key;

  useEffect(() => {
    localStorage.setItem(`${PREF_KEY}_${user?.id || 'me'}`, JSON.stringify({
      mode, customFrom, customTo, auto, pick, allPick,
    }));
  }, [mode, customFrom, customTo, auto, pick, allPick, user?.id]);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await fetchExams();
        if (cancel) return;
        setExams(list);
        const report = await collectRows(list, bounds, { teacherId: user?.id, allStudents: isAdmin });
        if (cancel) return;
        const found = report.rows.length ? report.rows : (user?.practice ? practiceDemoWeakRows() : []);
        setRows(found);
        setReviewed(report.reviewed);
      } catch (err) {
        if (!cancel) setError(err?.message || 'Səhv cavablar yığılmadı.');
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    run();
    return () => {
      cancel = true;
    };
  }, [bounds.start.getTime(), bounds.end.getTime(), user?.id, isAdmin]);

  const existing = exams.find((exam) => weakPeriodKey(exam) === periodKey && String(examOwnerId(exam)) === String(user?.id))
    || exams.find((exam) => String(exam.id) === String(readJson(`${MADE_KEY}_${user?.id || 'me'}`, {})[periodKey]));

  const usedKeys = usedMap[periodKey] || [];
  const leftover = rows.filter((row) => !usedKeys.includes(row.key));
  const totalFound = leftover.length;
  const pickCount = totalFound
    ? (allPick ? totalFound : Math.min(Math.max(1, pick), totalFound))
    : 0;
  const included = leftover.slice(0, pickCount);
  const excluded = leftover.slice(pickCount);
  const createdCount = usedKeys.length;
  const created = createdCount > 0;

  const persistUsed = (next) => {
    setUsedMap(next);
    localStorage.setItem(`${USED_KEY}_${user?.id || 'me'}`, JSON.stringify(next));
  };

  const create = async () => {
    if (!included.length || creating) return;
    const lock = `exampulse_weak_lock_${periodKey}`;
    if (sessionStorage.getItem(lock)) return;
    sessionStorage.setItem(lock, '1');
    setCreating(true);
    setConfirm(false);
    setError('');
    try {
      const end = new Date();
      end.setDate(end.getDate() + (mode === 'monthly' ? 14 : 7));
      const exam = await createExam({
        title: `${isAdmin ? 'Ümumi zəif mövzular' : 'Ən çox səhv edilənlər'} · ${bounds.label}`,
        description: `${isAdmin ? 'Ümumi zəif mövzular' : 'Ən çox səhv edilənlər'} · ${bounds.label}\n[[WEAK:${periodKey}]]`,
        totalQuestions: included.length,
        durationMinutes: Math.max(10, included.length * 2),
        teacherId: user?.id,
        subjectName: included[0].subjectName || 'Qarışıq',
        startTime: new Date().toISOString(),
        endTime: (bounds.end > new Date() ? bounds.end : end).toISOString(),
        visibility: 'private',
        status: 'Live',
      });
      for (const row of included) {
        const payload = questionPayload(row);
        if (!payload.options.length) continue;
        await addQuestion(exam.id, payload);
      }
      const made = readJson(`${MADE_KEY}_${user?.id || 'me'}`, {});
      made[periodKey] = exam.id;
      localStorage.setItem(`${MADE_KEY}_${user?.id || 'me'}`, JSON.stringify(made));
      persistUsed({ ...usedMap, [periodKey]: [...usedKeys, ...included.map((row) => row.key)] });
      setExams((prev) => [exam, ...prev.filter((item) => String(item.id) !== String(exam.id))]);
    } catch (err) {
      sessionStorage.removeItem(lock);
      setError(err?.message || 'Sınaq yaradılmadı.');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (isAdmin || loading || !auto || existing || created || !included.length || creating) return;
    if (autoTried.current === periodKey) return;
    autoTried.current = periodKey;
    create();
  }, [isAdmin, loading, auto, existing, created, included.length, creating, periodKey]);

  const undo = () => {
    persistUsed({ ...usedMap, [periodKey]: [] });
    sessionStorage.removeItem(`exampulse_weak_lock_${periodKey}`);
    autoTried.current = '';
  };

  const setPickValue = (n) => {
    const next = Math.max(1, Math.min(Number(n) || 1, Math.max(1, totalFound)));
    setAllPick(false);
    setPick(next);
  };

  const chips = [5, 10, 15, 20];

  return (
    <AppShell title="Zəif suallar">
      <div className="desk-page space-y-4 text-white">
        <div>
          <p className="text-sm font-semibold leading-relaxed text-white/50">
            {isAdmin
              ? 'Bütün müəllimlərin şagirdləri bir yerdə sayılır. Dövrü siz seçirsiniz.'
              : 'Şagirdlərin ən çox səhv etdiyi suallardan sınaq yığılır. Dövrü siz seçirsiniz.'}
          </p>
        </div>

        {created ? (
          <button
            type="button"
            onClick={() => existing?.id && navigate(`/teacher/exams/${existing.id}`)}
            className="w-full rounded-[22px] bg-[#1f6a3a] px-4 py-3 text-left"
          >
            <p className="font-extrabold">Sınaq yaradıldı · {createdCount} sual</p>
            <p className="mt-1 text-sm font-semibold text-white/75">Şagirdləriniz onu kabinetdə görür.</p>
          </button>
        ) : null}

        <div className="grid gap-4 min-[768px]:grid-cols-2">
        <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06] min-[768px]:p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">Dövr</p>
          <div className="mt-2">
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                ['weekly', 'Həftəlik'],
                ['monthly', 'Aylıq'],
                ['custom', 'Öz tarixim'],
              ]}
            />
          </div>
          {mode === 'custom' ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                className="rounded-full bg-[#12141a] px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
              <input
                className="rounded-full bg-[#12141a] px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </div>
          ) : (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white/55">
              <Calendar size={15} /> {bounds.label} · {bounds.range}
            </p>
          )}
          {isAdmin ? null : (
            <div className="mt-4 border-t border-white/[0.06] pt-3">
              <Switch
                checked={auto}
                onChange={setAuto}
                label="Bu dövr açılınca sınağı hazırla"
              />
            </div>
          )}
        </section>

        <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">Sual sayı</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Azalt"
              onClick={() => setPickValue(pickCount - 1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#12141a] ring-1 ring-white/10"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-16 rounded-2xl bg-[#12141a] px-5 py-2 text-center text-2xl font-black tabular-nums">
              {totalFound ? pickCount : 0}
            </span>
            <button
              type="button"
              aria-label="Artır"
              onClick={() => setPickValue(pickCount + 1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#7c6aff]"
            >
              <Plus size={16} />
            </button>
            <span className="text-sm font-semibold text-white/40">{totalFound} sualdan</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPickValue(n)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-extrabold ${
                  !allPick && pickCount === n ? 'bg-[#7c6aff] text-white' : 'bg-[#12141a] text-white/55'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAllPick(true);
                setPick(Math.max(1, totalFound));
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-extrabold ${
                allPick ? 'bg-[#7c6aff] text-white' : 'bg-[#12141a] text-white/55'
              }`}
            >
              Hamısı · {totalFound}
            </button>
          </div>
          <p className="mt-3 text-sm font-semibold text-white/45">
            Tapılan {totalFound} sualdan ən çox səhv edilən <span className="text-white">{pickCount} sual</span> seçiləcək.
          </p>
          {!created ? (
            <button
              type="button"
              disabled={!included.length || creating || loading}
              onClick={() => setConfirm(true)}
              className="mt-5 w-full rounded-full bg-[#7c6aff] px-6 py-3.5 text-sm font-extrabold text-white disabled:opacity-40"
            >
              {creating ? 'Hazırlanır...' : `Sınağı yarat · ${pickCount} sual`}
            </button>
          ) : null}
        </section>
        </div>

        <p className="flex items-start gap-2 rounded-[22px] bg-[#f0b429]/12 px-4 py-3 text-sm font-semibold leading-snug text-[#f0b429] min-[768px]:max-w-3xl">
          <Info size={16} className="mt-0.5 shrink-0" />
          Sınaq yaradıldıqdan sonra bu {pickCount} sual Zəif suallar siyahısından silinir.
        </p>

        {error ? <p className="text-sm font-semibold text-[#fb7185]">{error}</p> : null}

        <div className="min-w-0">
        {loading ? <Skeleton className="h-48 bg-[#171a22]" /> : null}

        {!loading && !leftover.length ? (
          <EmptyState title="Bu dövrdə səhv cavab yoxdur" text="Şagirdlər sınaq verdikcə ən çox seçilən yanlış cavablar burada görünəcək." />
        ) : null}

        {!loading && leftover.length ? (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <p className="text-sm font-extrabold text-white/55">Səhv faizinə görə sıralanıb</p>
              <p className="text-sm font-semibold text-white/35">{totalFound} sual</p>
            </div>
            <ul className="grid gap-2 min-[768px]:grid-cols-2">
              {included.map((row, index) => (
                <li key={row.key} className="flex items-start gap-3 rounded-[22px] bg-[#171a22] px-3 py-3 ring-1 ring-white/[0.04]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7c6aff] text-sm font-black">
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-[15px] font-extrabold leading-snug">{row.text}</p>
                  <p className="shrink-0 text-right">
                    <span className="block text-lg font-black tabular-nums">{wrongPct(row)}%</span>
                    <span className="text-[11px] font-bold text-white/35">səhv</span>
                  </p>
                </li>
              ))}
            </ul>
            {excluded.length ? (
              <>
                <p className="mt-5 mb-2 text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/30">
                  Quizə daxil olmur
                </p>
                <ul className="space-y-2">
                  {excluded.map((row, index) => (
                    <li key={row.key} className="flex items-start gap-3 rounded-[22px] px-3 py-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center text-sm font-black text-white/30">
                        {included.length + index + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-[15px] font-extrabold leading-snug text-white/55">{row.text}</p>
                      <p className="shrink-0 text-right text-white/45">
                        <span className="block text-lg font-black tabular-nums">{wrongPct(row)}%</span>
                        <span className="text-[11px] font-bold text-white/30">səhv</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        {created ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[24px] bg-[#171a22] px-4 py-3 ring-1 ring-white/[0.06]">
            <p className="text-sm font-semibold text-white/55">
              {createdCount} sual quizə köçürüldü və siyahıdan silindi
            </p>
            <button type="button" onClick={undo} className="shrink-0 text-sm font-extrabold text-[#9d93ff]">
              Geri qaytar
            </button>
          </div>
        ) : null}
        </div>

        {confirm ? (
          <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" onClick={() => setConfirm(false)}>
            <div className="absolute inset-0 bg-black/55" />
            <div
              className="relative w-full max-w-sm rounded-[28px] bg-[#171a22] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-[22px] font-black">Sınağı yaradırsınız?</h3>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-white/55">
                Ən çox səhv edilən {pickCount} sual quizə əlavə olunacaq və Zəif suallar siyahısından silinəcək. Qalan {Math.max(0, totalFound - pickCount)} sual siyahıda qalır.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="min-h-12 rounded-full bg-white/[0.06] text-sm font-extrabold"
                >
                  Ləğv et
                </button>
                <button
                  type="button"
                  onClick={create}
                  className="min-h-12 rounded-full bg-[#7c6aff] text-sm font-extrabold"
                >
                  Yarat
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

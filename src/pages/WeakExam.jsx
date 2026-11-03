import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Share2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
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
import { publicWebOrigin } from '../lib/runtime';
import { normalizeRole } from '../lib/utils';
import {
  gradeAgainstQuestion,
  gradeReviewQuestion,
  inWindow,
  isWeakExam,
  noteAttempt,
  periodBounds,
  questionPayload,
  rankWeakQuestions,
  rankWeakTopics,
  weakPeriodKey,
} from '../lib/weakExam';

const PREF_KEY = 'exampulse_weak_pref';
const MADE_KEY = 'exampulse_weak_made';

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
    rows: rankWeakQuestions(map, allStudents ? ranked.length : 10),
    topics: rankWeakTopics(map),
    reviewed,
  };
}

export default function WeakExam() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const saved = readJson(`${PREF_KEY}_${user?.id || 'me'}`, {});
  const [mode, setMode] = useState(saved.mode || 'weekly');
  const [customFrom, setCustomFrom] = useState(saved.customFrom || todayInput());
  const [customTo, setCustomTo] = useState(saved.customTo || todayInput());
  const [auto, setAuto] = useState(Boolean(saved.auto));
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [rows, setRows] = useState([]);
  const [topics, setTopics] = useState([]);
  const [reviewed, setReviewed] = useState(0);
  const [exams, setExams] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const autoTried = useRef('');

  const isAdmin = normalizeRole(user?.role) === 'Admin';
  const bounds = useMemo(
    () => periodBounds(mode, customFrom, customTo),
    [mode, customFrom, customTo],
  );
  const periodKey = isAdmin ? `admin:${bounds.key}` : bounds.key;

  useEffect(() => {
    localStorage.setItem(`${PREF_KEY}_${user?.id || 'me'}`, JSON.stringify({ mode, customFrom, customTo, auto }));
  }, [mode, customFrom, customTo, auto, user?.id]);

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
        setRows(report.rows);
        setTopics(report.topics);
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

  const shareUrl = existing?.id ? `${publicWebOrigin()}/student/exams/${existing.id}` : '';

  const create = async () => {
    if (!rows.length || creating) return;
    const lock = `exampulse_weak_lock_${periodKey}`;
    if (sessionStorage.getItem(lock)) return;
    sessionStorage.setItem(lock, '1');
    setCreating(true);
    setError('');
    try {
      const end = new Date();
      end.setDate(end.getDate() + (mode === 'monthly' ? 14 : 7));
      const exam = await createExam({
        title: `${isAdmin ? 'Ümumi zəif mövzular' : 'Ən çox səhv edilənlər'} · ${bounds.label}`,
        description: `${isAdmin ? 'Ümumi zəif mövzular' : 'Ən çox səhv edilənlər'} · ${bounds.label}\n[[WEAK:${periodKey}]]`,
        totalQuestions: rows.length,
        durationMinutes: Math.max(10, rows.length * 2),
        teacherId: user?.id,
        subjectName: rows[0].subjectName || 'Qarışıq',
        startTime: new Date().toISOString(),
        endTime: (bounds.end > new Date() ? bounds.end : end).toISOString(),
        visibility: 'private',
        status: 'Live',
      });
      for (const row of rows) {
        const payload = questionPayload(row);
        if (!payload.options.length) continue;
        await addQuestion(exam.id, payload);
      }
      const made = readJson(`${MADE_KEY}_${user?.id || 'me'}`, {});
      made[periodKey] = exam.id;
      localStorage.setItem(`${MADE_KEY}_${user?.id || 'me'}`, JSON.stringify(made));
      setExams((prev) => [exam, ...prev.filter((item) => String(item.id) !== String(exam.id))]);
      setNotice('Sınaq hazırdır. Linki şagirdlərinizə göndərə bilərsiniz.');
    } catch (err) {
      sessionStorage.removeItem(lock);
      setError(err?.message || 'Sınaq yaradılmadı.');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (isAdmin || loading || !auto || existing || !rows.length || creating) return;
    if (autoTried.current === periodKey) return;
    autoTried.current = periodKey;
    create();
  }, [isAdmin, loading, auto, existing, rows, creating, periodKey]);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Link kopyalandı.');
    } catch {
      setNotice(shareUrl);
    }
  };

  const maxWrong = rows[0]?.wrong || 1;

  return (
    <AppShell title="Zəif suallar">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold">{isAdmin ? 'Bütün şagirdlərin zəif mövzuları' : 'Ən çox səhv edilən suallar'}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isAdmin
              ? 'Bütün müəllimlərin şagirdləri bir yerdə sayılır. Mövzu cəmi hər kəsin səhvini göstərir.'
              : 'Şagirdlərin səhv seçdiyi cavablardan sınaq yığılır. Dövrü siz seçirsiniz.'}
          </p>
        </div>

        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              ['weekly', 'Həftəlik'],
              ['monthly', 'Aylıq'],
              ['custom', 'Öz tarixim'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${mode === id ? 'bg-[#2f7a45] text-white' : 'bg-[#f3ecdf] text-[#1d2430]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'custom' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Başlanğıc
                <input className="mt-1 w-full rounded-xl border border-[#eadfce] bg-white px-3 py-2" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
              </label>
              <label className="text-sm font-semibold">
                Son
                <input className="mt-1 w-full rounded-xl border border-[#eadfce] bg-white px-3 py-2" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
              </label>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">{bounds.label}</p>
          )}
          {isAdmin ? null : (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} />
              Bu dövr açılanda sınağı hazırla
            </label>
          )}
        </Card>

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm font-semibold text-[#2f7a45]">{notice}</p> : null}

        {loading ? <Skeleton className="h-48" /> : null}

        {!loading && !rows.length ? (
          <EmptyState title="Bu dövrdə səhv cavab yoxdur" text="Şagirdlər sınaq verdikcə ən çox seçilən yanlış cavablar burada görünəcək." />
        ) : null}

        {!loading && topics.length ? (
          <div className="space-y-3">
            <h3 className="text-lg font-extrabold">{isAdmin ? 'Mövzular üzrə cəmi' : 'Mövzular'}</h3>
            {topics.map((topic) => {
              const share = topic.asked ? Math.round((topic.wrong / topic.asked) * 100) : 0;
              return (
                <Card key={topic.key}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-extrabold">{topic.name}</p>
                    <p className="shrink-0 text-sm font-bold text-[#b7352a]">{topic.wrong} səhv</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                    {topic.questions} sual · {topic.asked} cavabdan {share}% səhv
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f3ecdf]">
                    <div className="h-full rounded-full bg-[#e15b4a]" style={{ width: `${Math.max(8, share)}%` }} />
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}

        {!loading && rows.length ? (
          <div className="space-y-3">
            <h3 className="text-lg font-extrabold">Suallar</h3>
            <p className="text-sm text-[var(--muted)]">{reviewed} iştirak nəzərə alınıb.</p>
            {rows.map((row, index) => (
              <Card key={row.key}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-extrabold">{index + 1}. {row.text}</p>
                  <p className="shrink-0 text-sm font-bold text-[#b7352a]">{row.wrong} səhv</p>
                </div>
                {row.subjectName ? <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{row.subjectName}</p> : null}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f3ecdf]">
                  <div className="h-full rounded-full bg-[#e15b4a]" style={{ width: `${Math.max(8, Math.round((row.wrong / maxWrong) * 100))}%` }} />
                </div>
                {row.topWrong ? (
                  <p className="mt-3 text-sm">
                    Ən çox seçilən yanlış cavab: <b>{row.topWrong}</b>
                    {row.topWrongCount ? ` · ${row.topWrongCount} nəfər` : ''}
                  </p>
                ) : null}
                {row.correctText ? <p className="mt-1 text-sm text-[#2f7a45]">Düzgün cavab: {row.correctText}</p> : null}
              </Card>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {existing ? (
            <>
              <Button onClick={() => navigate(`/teacher/exams/${existing.id}`)}>
                <Share2 size={16} /> Sınağa bax
              </Button>
              <Button variant="secondary" onClick={copyLink}>
                <Copy size={16} /> Linki kopyala
              </Button>
            </>
          ) : (
            <Button onClick={create} disabled={!rows.length || creating || loading}>
              {creating ? 'Hazırlanır...' : 'Sınağı yarat'}
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--muted)]">
          Sınaq şəxsi qalır. Şagirdləriniz onu kabinetdə görür. Açıq zonaya düşmür.
        </p>
        {shareUrl ? <p className="break-all text-xs text-[var(--muted)]">{shareUrl}</p> : null}
      </div>
    </AppShell>
  );
}

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Wand2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, Select, Textarea } from './ui';
import QuestionCard from './QuestionCard';
import { addQuestion, applyAiAnswers, createExam, createSubject, fetchSubjects, tryGenerateAiQuestions, tryGradeAiQuestions, updateExam } from '../lib/examApi';
import { recordAiUsage } from '../lib/aiUsage';
import { hasRealChoiceOptions, normalizeGeneratedQuestions, parseQuestionsFromText, toAddQuestionPayload } from '../lib/parseExamText';
import { errorMessage } from '../lib/utils';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function toDatetimeLocalValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyQuestion(index = 0) {
  return {
    text: `${index + 1}-ci sual`,
            options: LETTERS.map((letter) => ({ letter, text: '', isCorrect: letter === 'A' })),
    correctLetter: 'A',
    correctText: '',
    difficultyLevel: 'orta',
  };
}

export default function TeacherAiPanel() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [brief, setBrief] = useState('');
  const [questionCount, setQuestionCount] = useState(25);
  const [easy, setEasy] = useState(10);
  const [medium, setMedium] = useState(10);
  const [hard, setHard] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [startLocal, setStartLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [generated, setGenerated] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubjects()
      .then((list) => {
        setSubjects(list);
        if (list[0]) setSubjectId(String(list[0].id));
      })
      .catch(() => setSubjects([]));
  }, []);

  const resolveSubject = async () => {
    if (newSubject.trim()) {
      const created = await createSubject(newSubject.trim());
      setSubjects((prev) => [...prev.filter((s) => s.id !== created.id), created]);
      return created;
    }
    return subjects.find((s) => String(s.id) === String(subjectId));
  };

  const buildExam = async (questions, extra = {}) => {
    const subject = await resolveSubject();
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) throw new Error('Başlama tarixini seçin.');
    const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);
    const examTitle =
      extra.title?.trim()
      || title.trim()
      || `${subject?.name || 'İmtahan'} — ${topic.trim() || extra.fallbackTitle || 'AI'}`;
    const exam = await createExam({
      title: examTitle,
      description: extra.description || topic.trim() || brief.trim() || 'AI ilə yaradılmış imtahan',
      totalQuestions: questions.length,
      durationMinutes: Number(durationMinutes) || 45,
      teacherId: user?.id,
      subjectId: subject?.id,
      subjectName: subject?.name,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isDraft: true,
      status: 'Draft',
      isAiGenerated: true,
    });
    for (const q of questions) {
      try {
        await addQuestion(exam.id, toAddQuestionPayload(q));
      } catch {
        /* keep going */
      }
    }
    return exam;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!user?.id) throw new Error('Sessiya tapılmadı. Çıxıb yenidən daxil olun.');
      const subject = subjects.find((s) => String(s.id) === String(subjectId));
      let parsed = await tryGenerateAiQuestions({
        title: title.trim(),
        topic: topic.trim(),
        subjectName: subject?.name || newSubject.trim(),
        brief: brief.trim(),
        questionCount: Number(questionCount) || 25,
        easy: Number(easy) || 0,
        medium: Number(medium) || 0,
        hard: Number(hard) || 0,
        source: 'text',
      });
      parsed = normalizeGeneratedQuestions(parsed);
      if (!hasRealChoiceOptions(parsed) && brief.trim() && /\d+[\.\)]/.test(brief) && /[A-E]\)/.test(brief)) {
        parsed = normalizeGeneratedQuestions(parseQuestionsFromText(brief));
      }
      if (!hasRealChoiceOptions(parsed)) {
        throw new Error('AI A–E variantlarını və düzgün cavabı yazmadı. Yenidən daxil olun, Exam API-də OPENAI_API_KEY olduğundan əmin olun və yenidən cəhd edin.');
      }
      try {
        const grades = await tryGradeAiQuestions(parsed, { soft: true });
        if (grades?.length) parsed = applyAiAnswers(parsed, grades);
      } catch {
        /* keep model’s own correctLetter */
      }
      parsed = normalizeGeneratedQuestions(parsed);
      setGenerated(parsed);
      await recordAiUsage(user?.id, 'autoExam');
      setMessage(`${parsed.length} sual, A–E variantları və düzgün cavab hazırlandı. Dairələri yoxlayın, sonra qaralama kimi saxlayın.`);
    } catch (err) {
      setError(errorMessage(err, 'AI imtahanı yaradılmadı.'));
    } finally {
      setBusy(false);
    }
  };

  const updateGenerated = (index, patch) => {
    setGenerated((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const setGeneratedCorrect = (qIndex, letter) => {
    setGenerated((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return {
        ...q,
        correctLetter: letter,
        options: LETTERS.map((L) => {
          const found = (q.options || []).find((o) => o.letter === L);
          return { letter: L, text: found?.text || '', isCorrect: L === letter };
        }),
      };
    }));
  };

  const saveGenerated = async ({ publish }) => {
    if (busy) return;
    if (!generated.length) {
      setError('Əvvəl sualları hazırlayın.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const cleaned = generated
        .map((q) => ({
          ...q,
          text: String(q.text || '').trim(),
          correctLetter: q.correctLetter || 'A',
          correctText: q.correctLetter === 'OPEN' ? String(q.correctText || '').trim() : '',
          options: LETTERS.map((letter) => {
            const found = (q.options || []).find((o) => o.letter === letter);
            return { letter, text: String(found?.text || letter).trim() || letter, isCorrect: letter === q.correctLetter };
          }),
        }))
        .filter((q) => q.text);
      if (!cleaned.length) throw new Error('Ən azı bir sual mətni yazın.');
      const exam = await buildExam(cleaned, {
        title: title.trim(),
        description: topic.trim() || brief.trim() || 'AI ilə yaradılmış imtahan',
        fallbackTitle: 'AI',
      });
      if (publish) {
        const start = new Date(startLocal);
        const duration = Number(durationMinutes) || 45;
        const end = new Date((Number.isNaN(start.getTime()) ? Date.now() : start.getTime()) + duration * 60 * 1000);
        const status = !Number.isNaN(start.getTime()) && start.getTime() > Date.now() ? 'Scheduled' : 'Live';
        await updateExam(exam.id, {
          subjectId: exam.subjectId,
          title: exam.title,
          durationMinutes: duration,
          totalQuestions: cleaned.length,
          startTime: (Number.isNaN(start.getTime()) ? new Date() : start).toISOString(),
          endTime: end.toISOString(),
          status,
          isDraft: false,
        });
        setMessage(`${cleaned.length} sual dərc olundu.`);
      } else {
        setMessage(`${cleaned.length} sual qaralama kimi saxlandı.`);
      }
      navigate(`/teacher/exams/${exam.id}`, { state: { fromAi: true } });
    } catch (err) {
      setError(errorMessage(err, 'İmtahan saxlanılmadı.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveGenerated = async (e) => {
    e.preventDefault();
    await saveGenerated({ publish: false });
  };

  const fieldWrap = '[&_span]:text-indigo-100 [&_input]:bg-white [&_select]:bg-white [&_textarea]:bg-white';

  return (
    <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 sm:p-7">
          <p className="mb-5 text-sm leading-6 text-indigo-100">
            A–E variantları və düzgün cavab model tərəfindən yazılır. PDF-dən sual imtahan vərəqindədir. API açarı yalnız serverdədir.
          </p>
          <form onSubmit={handleGenerate} className={`grid gap-4 sm:grid-cols-2 ${fieldWrap}`}>
            <Input label="İmtahan başlığı" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="məs. Kvadrat tənliklər" />
            <Input label="Mövzu" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="mövzu adı" />
            <Select label="Fənn" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Input label="Yeni fənn (istəyə bağlı)" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
            <Input label="Sual sayı" type="number" min={1} max={80} value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} />
            <Input label="Müddət (dəqiqə)" type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
            <Input label="Asan" type="number" min={0} value={easy} onChange={(e) => setEasy(e.target.value)} />
            <Input label="Orta" type="number" min={0} value={medium} onChange={(e) => setMedium(e.target.value)} />
            <Input label="Çətin" type="number" min={0} value={hard} onChange={(e) => setHard(e.target.value)} />
            <Input label="Başlama" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
            <div className="sm:col-span-2">
              <Textarea
                label="Xüsusiyyətlər (sinif, mövzu, çətinlik) və ya hazır sual mətni"
                rows={6}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={'11-ci sinif, riyaziyyat, faiz və nisbət, buraxılış səviyyəsi. 25 sual: 10 asan, 10 orta, 5 çətin. Hər sual A–E, yalnız biri düzgün.'}
              />
              <p className="mt-2 text-xs leading-5 text-indigo-200">İki cür yaza bilərsiniz:</p>
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-black/25 p-4 text-xs leading-6 text-amber-100 ring-1 ring-white/10">{`1) Xüsusiyyət:
11-ci sinif, riyaziyyat, faiz və nisbət.
Buraxılış sınağı səviyyəsi. A–E variantlı test.
Hesablama olsun, tələ savad yox.

2) Hazır sual mətni:
1. a : b = 2 : 5 və a + b = 35 olarsa, b − a fərqini tapın.
A) 10
B) 15
C) 20
D) 22
E) 25
Cavab: B`}</pre>
            </div>
            {error && !generated.length && <p className="sm:col-span-2 text-sm text-red-200">{error}</p>}
            {message && !generated.length && <p className="sm:col-span-2 text-sm text-emerald-200">{message}</p>}
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
              <Button type="submit" disabled={busy} className="bg-amber-400 text-indigo-950 hover:bg-amber-300">
                <Wand2 size={16} />
                {busy ? 'Hazırlanır...' : 'Sualları hazırla'}
              </Button>
            </div>
          </form>

      {generated.length > 0 && (
            <form onSubmit={handleSaveGenerated} className={`mt-6 space-y-4 ${fieldWrap}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Pencil size={16} /> Suallar ({generated.length}) — A–E və düzgün dairə
                </h3>
                <button
                  type="button"
                  className="text-sm text-amber-200 hover:text-amber-100"
                  onClick={() => setGenerated((prev) => [...prev, emptyQuestion(prev.length)])}
                >
                  + Sual əlavə et
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="İmtahan başlığı" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="məs. Kvadrat tənliklər" />
                <Select label="Fənn" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <Input label="Müddət (dəqiqə)" type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                <Input label="Başlama" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
              </div>
              <div className="space-y-4">
                {generated.map((q, index) => (
                  <QuestionCard
                    key={`ai-q-${index}`}
                    theme="dark"
                    mode="teacher"
                    index={index}
                    question={q}
                    onMarkCorrect={(letter) => setGeneratedCorrect(index, letter)}
                    onSaveEdit={(payload) => {
                      updateGenerated(index, {
                        text: payload.text,
                        correctLetter: payload.correctLetter,
                        difficultyLevel: payload.difficultyLevel,
                        options: payload.options,
                      });
                    }}
                  />
                ))}
              </div>
              {error && <p className="text-sm text-red-200">{error}</p>}
              {message && <p className="text-sm text-emerald-200">{message}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="submit" variant="secondary" disabled={busy} className="bg-white/15 text-white hover:bg-white/25">
                  {busy ? 'Saxlanılır...' : 'Qaralama saxla'}
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  className="bg-amber-400 text-indigo-950 hover:bg-amber-300"
                  onClick={() => saveGenerated({ publish: true })}
                >
                  İmtahanı dərc et
                </Button>
              </div>
            </form>
      )}
    </div>
  );
}

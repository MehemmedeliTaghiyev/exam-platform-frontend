import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Pencil, ScanLine, Trash2, Wand2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, Select, Textarea } from './ui';
import { addQuestion, createExam, createSubject, fetchSubjects, tryGenerateAiQuestions, uploadExamPdfPack } from '../lib/examApi';
import { recordAiUsage } from '../lib/aiUsage';
import { extractPdfText, parseQuestionsFromText, questionsFromBrief, toAddQuestionPayload } from '../lib/parseExamText';
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
  const [tab, setTab] = useState('auto');
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
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfQuestions, setPdfQuestions] = useState([]);
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

  const buildExam = async (questions, file, extra = {}) => {
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
    });
    for (const q of questions) {
      try {
        await addQuestion(exam.id, toAddQuestionPayload(q));
      } catch {
        /* keep going */
      }
    }
    if (file) {
      try {
        await uploadExamPdfPack(exam.id, file, questions.length);
      } catch {
        /* optional */
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
      let usedServerAi = Boolean(parsed?.length);

      if (!parsed?.length && brief.trim() && /\d+[\.\)]/.test(brief)) {
        parsed = parseQuestionsFromText(brief);
      }

      if (!parsed?.length) {
        parsed = questionsFromBrief({
          topic: topic.trim() || title.trim() || 'Mövzu',
          count: questionCount,
          easy,
          medium,
          hard,
        });
        usedServerAi = false;
      }

      const exam = await buildExam(parsed, null);
      await recordAiUsage(user?.id, 'autoExam');
      setMessage(
        usedServerAi
          ? `${parsed.length} sual AI ilə hazırlandı. Cavab açarını yoxlayın.`
          : `${parsed.length} sual qaralama kimi yazıldı. API açarı gələndə eyni forma server AI-yə keçəcək. İndi cavab açarını yoxlayın.`,
      );
      navigate(`/teacher/exams/${exam.id}`, { state: { fromAi: true } });
    } catch (err) {
      setError(errorMessage(err, 'AI imtahanı yaradılmadı.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReadPdf = async () => {
    if (busy) return;
    if (!pdfFile) {
      setError('PDF seçin.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const text = await extractPdfText(pdfFile);
      const parsed = parseQuestionsFromText(text);
      if (!parsed.length) {
        throw new Error('PDF-dən sual oxunmadı. Mətnli PDF yükləyin və formatı aşağıdakı kimi saxlayın.');
      }
      setPdfQuestions(parsed);
      if (!title.trim()) {
        setTitle(pdfFile.name.replace(/\.pdf$/i, '').trim());
      }
      await recordAiUsage(user?.id, 'pdfExtract');
      setMessage(`${parsed.length} sual oxundu. İstəsəniz mətni və variantları dəyişin, sonra qaralama kimi saxlayın.`);
    } catch (err) {
      setError(errorMessage(err, 'PDF oxunmadı.'));
    } finally {
      setBusy(false);
    }
  };

  const updatePdfQuestion = (index, patch) => {
    setPdfQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updatePdfOption = (qIndex, letter, text) => {
    setPdfQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return {
        ...q,
        options: LETTERS.map((L) => {
          const found = (q.options || []).find((o) => o.letter === L);
          const nextText = L === letter ? text : (found?.text || '');
          return { letter: L, text: nextText, isCorrect: L === q.correctLetter };
        }),
      };
    }));
  };

  const setPdfCorrect = (qIndex, letter) => {
    setPdfQuestions((prev) => prev.map((q, i) => {
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

  const handleSavePdfExam = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!pdfQuestions.length) {
      setError('Əvvəl PDF-dən sualları oxuyun.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
            const cleaned = pdfQuestions
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
      const exam = await buildExam(cleaned, pdfFile, {
        title: title.trim() || pdfFile?.name?.replace(/\.pdf$/i, ''),
        description: 'PDF-dən oxunmuş imtahan',
        fallbackTitle: 'PDF',
      });
      setMessage(`${cleaned.length} sual qaralama kimi saxlandı. İstəsəniz imtahan səhifəsində də dəyişə bilərsiniz.`);
      navigate(`/teacher/exams/${exam.id}`, { state: { fromAi: true } });
    } catch (err) {
      setError(errorMessage(err, 'İmtahan saxlanılmadı.'));
    } finally {
      setBusy(false);
    }
  };

  const fieldWrap = '[&_span]:text-indigo-100 [&_input]:bg-white [&_select]:bg-white [&_textarea]:bg-white';

  return (
    <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 sm:p-7">
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => { setTab('auto'); setError(''); setMessage(''); }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            tab === 'auto' ? 'bg-amber-400 text-indigo-950' : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          <Wand2 size={16} /> Avtomatik imtahan
        </button>
        <button
          type="button"
          onClick={() => { setTab('pdf'); setError(''); setMessage(''); }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            tab === 'pdf' ? 'bg-amber-400 text-indigo-950' : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          <ScanLine size={16} /> PDF-dən sual
        </button>
      </div>

      {tab === 'auto' ? (
        <>
          <p className="mb-5 text-sm leading-6 text-indigo-100">
            Açar hələ lazım deyil — formu indi doldurub imtahan yarada bilərsiniz. API açarı gələndə eyni düymə sualları modelə göndərəcək; açarı çata yazmayın, yalnız serverə qoyun.
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
                rows={5}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={'11-ci sinif, kvadrat tənliklər, 25 sual, A–E'}
              />
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-200">{error}</p>}
            {message && <p className="sm:col-span-2 text-sm text-emerald-200">{message}</p>}
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
              <Button type="submit" disabled={busy} className="bg-amber-400 text-indigo-950 hover:bg-amber-300">
                <Wand2 size={16} />
                {busy ? 'Hazırlanır...' : 'İmtahan yarat'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-indigo-100">
            Burada mövzu və say yazmağa ehtiyac yoxdur. PDF-i yükləyin — suallar aşağıdakı formatda olmalıdır. Oxunduqdan sonra hər sualı dəyişə bilərsiniz. Şagird imtahanda 5 variant + 6-cı <span className="font-semibold text-amber-200">Açıq</span> görür; Açıq-ı basanda öz cavabını yazır.
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-black/25 p-4 text-xs leading-6 text-amber-100 ring-1 ring-white/10">{`1. Sualın mətni
A) variant
B) variant
C) variant
D) variant
E) variant
Cavab: C

2. Növbəti sual
A) ...
B) ...
C) ...
D) ...
E) ...
Cavab: A`}</pre>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 space-y-1.5 text-sm">
              <span className="font-medium text-indigo-100">PDF faylı</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  setPdfFile(e.target.files?.[0] || null);
                  setPdfQuestions([]);
                  setMessage('');
                  setError('');
                }}
                className="w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
              />
            </label>
            <Button type="button" disabled={busy} onClick={handleReadPdf} className="bg-amber-400 text-indigo-950 hover:bg-amber-300">
              <FileUp size={16} />
              {busy ? 'Oxunur...' : 'Sualları oxu'}
            </Button>
          </div>
          {pdfFile && <p className="text-xs text-indigo-200">{pdfFile.name}</p>}

          {pdfQuestions.length > 0 && (
            <form onSubmit={handleSavePdfExam} className={`space-y-4 ${fieldWrap}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Pencil size={16} /> Oxunan suallar ({pdfQuestions.length})
                </h3>
                <button
                  type="button"
                  className="text-sm text-amber-200 hover:text-amber-100"
                  onClick={() => setPdfQuestions((prev) => [...prev, emptyQuestion(prev.length)])}
                >
                  + Sual əlavə et
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="İmtahan başlığı" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="PDF adından götürülür" />
                <Select label="Fənn" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <Input label="Müddət (dəqiqə)" type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                <Input label="Başlama" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
              </div>
              <div className="space-y-4">
                {pdfQuestions.map((q, index) => (
                  <div key={`pdf-q-${index}`} className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-amber-200">Sual {index + 1}</p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-red-200 hover:text-red-100"
                        onClick={() => setPdfQuestions((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 size={14} /> Sil
                      </button>
                    </div>
                    <Textarea
                      label="Sual mətni"
                      rows={3}
                      value={q.text}
                      onChange={(e) => updatePdfQuestion(index, { text: e.target.value })}
                    />
                    <div className="mt-3 space-y-2">
                      {LETTERS.map((letter) => {
                        const opt = (q.options || []).find((o) => o.letter === letter);
                        return (
                          <label key={letter} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                            <input
                              type="radio"
                              name={`correct-${index}`}
                              checked={q.correctLetter === letter}
                              onChange={() => setPdfCorrect(index, letter)}
                            />
                            <span className="w-5 text-xs font-bold text-amber-200">{letter}</span>
                            <input
                              value={opt?.text || ''}
                              onChange={(e) => updatePdfOption(index, letter, e.target.value)}
                              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white px-2 py-1.5 text-sm text-ink"
                            />
                          </label>
                        );
                      })}
                      <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                        <input
                          type="radio"
                          name={`correct-${index}`}
                          checked={q.correctLetter === 'OPEN'}
                          onChange={() => setPdfCorrect(index, 'OPEN')}
                        />
                        <span className="w-12 text-xs font-bold text-amber-200">Açıq</span>
                        <span className="text-xs text-indigo-200">6-cı variant — şagird öz cavabını yazacaq</span>
                      </label>
                      {q.correctLetter === 'OPEN' && (
                        <Input
                          label="Açıq düzgün cavab (istəyə bağlı)"
                          value={q.correctText || ''}
                          onChange={(e) => updatePdfQuestion(index, { correctText: e.target.value })}
                        />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-indigo-200">
                      Düzgün cavab: {q.correctLetter === 'OPEN' ? 'Açıq' : q.correctLetter} (soldakı dairəni dəyişin)
                    </p>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-200">{error}</p>}
              {message && <p className="text-sm text-emerald-200">{message}</p>}
              <div className="flex justify-end">
                <Button type="submit" disabled={busy} className="bg-amber-400 text-indigo-950 hover:bg-amber-300">
                  {busy ? 'Saxlanılır...' : 'Qaralama kimi saxla'}
                </Button>
              </div>
            </form>
          )}
          {pdfQuestions.length === 0 && error && <p className="text-sm text-red-200">{error}</p>}
          {pdfQuestions.length === 0 && message && <p className="text-sm text-emerald-200">{message}</p>}
        </div>
      )}
    </div>
  );
}

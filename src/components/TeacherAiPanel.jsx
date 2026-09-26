import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, ScanLine, Wand2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, Input, Select, Textarea } from './ui';
import { addQuestion, createExam, createSubject, fetchSubjects, tryGenerateAiQuestions, uploadExamPdfPack } from '../lib/examApi';
import { recordAiUsage } from '../lib/aiUsage';
import { extractPdfText, parseQuestionsFromText, questionsFromBrief, toAddQuestionPayload } from '../lib/parseExamText';
import { errorMessage } from '../lib/utils';

function toDatetimeLocalValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  const buildExam = async (questions, file) => {
    const subject = await resolveSubject();
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) throw new Error('Başlama tarixini seçin.');
    const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);
    const examTitle = title.trim() || `${subject?.name || 'İmtahan'} — ${topic.trim() || 'AI'}`;
    const exam = await createExam({
      title: examTitle,
      description: topic.trim() || brief.trim() || 'AI ilə yaradılmış imtahan',
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
        source: tab === 'pdf' ? 'pdf' : 'text',
      });
      let usedServerAi = Boolean(parsed?.length);

      if (!parsed?.length && tab === 'pdf') {
        if (!pdfFile) throw new Error('PDF seçin.');
        const text = await extractPdfText(pdfFile);
        parsed = parseQuestionsFromText(text);
        if (!parsed.length) {
          throw new Error('PDF-dən sual oxunmadı. Mətnli PDF yükləyin. Skan üçün API açarı lazımdır.');
        }
      }

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

      const exam = await buildExam(parsed, tab === 'pdf' ? pdfFile : null);
      await recordAiUsage(user?.id, tab === 'pdf' ? 'pdfExtract' : 'autoExam');
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

  const fieldWrap = '[&_span]:text-indigo-100 [&_input]:bg-white [&_select]:bg-white [&_textarea]:bg-white';

  return (
    <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 sm:p-7">
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => { setTab('auto'); setError(''); }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            tab === 'auto' ? 'bg-amber-400 text-indigo-950' : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          <Wand2 size={16} /> Avtomatik imtahan
        </button>
        <button
          type="button"
          onClick={() => { setTab('pdf'); setError(''); }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            tab === 'pdf' ? 'bg-amber-400 text-indigo-950' : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          <ScanLine size={16} /> PDF-dən sual
        </button>
      </div>
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
        {tab === 'pdf' && (
          <label className="sm:col-span-2 block space-y-1.5 text-sm">
            <span className="font-medium text-indigo-100">PDF (sual + A–E)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
            />
          </label>
        )}
        {tab === 'auto' && (
          <div className="sm:col-span-2">
            <Textarea
              label="Xüsusiyyətlər (sinif, mövzu, çətinlik) və ya hazır sual mətni"
              rows={5}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={'11-ci sinif, kvadrat tənliklər, 25 sual, A–E'}
            />
          </div>
        )}
        {error && <p className="sm:col-span-2 text-sm text-red-200">{error}</p>}
        {message && <p className="sm:col-span-2 text-sm text-emerald-200">{message}</p>}
        <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={busy} className="bg-amber-400 text-indigo-950 hover:bg-amber-300">
            {tab === 'pdf' ? <FileUp size={16} /> : <Wand2 size={16} />}
            {busy ? 'Hazırlanır...' : tab === 'pdf' ? 'PDF-dən imtahan yarat' : 'İmtahan yarat'}
          </Button>
        </div>
      </form>
    </div>
  );
}

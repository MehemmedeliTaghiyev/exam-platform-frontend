import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Sparkles, Wand2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, Card, Input, Select, Textarea } from './ui';
import { addQuestion, createExam, createSubject, fetchSubjects, uploadExamPdfPack } from '../lib/examApi';
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

  const buildExam = async (questions) => {
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
    if (pdfFile) {
      try {
        await uploadExamPdfPack(exam.id, pdfFile, questions.length);
      } catch {
        /* pdf optional after text extract */
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
      let parsed = [];
      if (pdfFile) {
        const text = await extractPdfText(pdfFile);
        parsed = parseQuestionsFromText(text);
        if (!parsed.length) {
          throw new Error('PDF-dən sual oxunmadı. Mətnli (skan olmayan) PDF yükləyin və ya mətni aşağıya yapışdırın.');
        }
      } else if (brief.trim() && /\d+[\.\)]/.test(brief)) {
        parsed = parseQuestionsFromText(brief);
      }
      if (!parsed.length) {
        parsed = questionsFromBrief({
          topic: topic.trim() || title.trim() || 'Mövzu',
          count: questionCount,
          easy,
          medium,
          hard,
        });
      }
      const exam = await buildExam(parsed);
      setMessage(`${parsed.length} sual yaradıldı. Cavab açarını yoxlayın.`);
      navigate(`/teacher/exams/${exam.id}`, { state: { fromAi: true } });
    } catch (err) {
      setError(errorMessage(err, 'AI imtahanı yaradılmadı.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-8 overflow-hidden border-brand-200 bg-gradient-to-br from-indigo-50 to-white p-0 dark:border-brand-800 dark:from-indigo-950/40 dark:to-slate-900">
      <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-600 px-5 py-4 text-white dark:border-brand-900">
        <Sparkles size={20} />
        <div>
          <h2 className="font-bold">AI funksionallığı</h2>
          <p className="text-xs text-white/80">Mətndən avtomatik imtahan və PDF-dən sual + A–E variantları</p>
        </div>
      </div>
      <form onSubmit={handleGenerate} className="grid gap-4 p-5 sm:grid-cols-2">
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
        <label className="sm:col-span-2 block space-y-1.5 text-sm">
          <span className="font-medium text-gray-600 dark:text-gray-300">PDF (sual + A–E)</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 dark:border-slate-700"
          />
        </label>
        <div className="sm:col-span-2">
          <Textarea
            label="Xüsusiyyətlər və ya hazır sual mətni"
            rows={5}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={'11-ci sinif, kvadrat tənliklər, 25 sual, A–E\n və ya sualları birbaşa yapışdırın'}
          />
        </div>
        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        {message && <p className="sm:col-span-2 text-sm text-emerald-600">{message}</p>}
        <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={busy}>
            {pdfFile ? <FileUp size={16} /> : <Wand2 size={16} />}
            {busy ? 'Hazırlanır...' : pdfFile ? 'PDF-dən imtahan yarat' : 'AI ilə imtahan yarat'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

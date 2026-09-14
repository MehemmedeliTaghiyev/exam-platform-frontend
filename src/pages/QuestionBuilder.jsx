import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, BarChart3 } from 'lucide-react';
import AppShell from '../components/AppShell';
import PaperPreview from '../components/PaperPreview';
import { Button, Card, Input, Select, Skeleton, Textarea } from '../components/ui';
import { addQuestion, fetchExam, fetchQuestions } from '../lib/examApi';
import { exportExamToDocx } from '../lib/exportDocx';

export default function QuestionBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('edit');
  const [text, setText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [examData, qs] = await Promise.all([fetchExam(id), fetchQuestions(id)]);
    setExam(examData);
    setQuestions(qs);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addQuestion(id, {
        text,
        points: 1,
        type: 0,
        options: [
          { optionText: optionA, isCorrect: correctAnswer === 'A' },
          { optionText: optionB, isCorrect: correctAnswer === 'B' },
          { optionText: optionC, isCorrect: correctAnswer === 'C' },
          { optionText: optionD, isCorrect: correctAnswer === 'D' },
        ],
      });
      setText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectAnswer('A');
      await load();
    } catch {
      alert('Sual əlavə edilərkən xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="İmtahan vərəqi">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/teacher')}>
            <ArrowLeft size={16} /> Geri
          </Button>
          <div>
            <h2 className="text-xl font-bold">{exam?.title || `İmtahan #${id}`}</h2>
            <p className="text-sm text-gray-500">{exam?.subjectName} · {questions.length} sual</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/teacher/exams/${id}/stats`)}>
            <BarChart3 size={16} /> Statistika
          </Button>
          <Button variant="secondary" onClick={() => exportExamToDocx(exam, questions)}>
            <FileDown size={16} /> Word export
          </Button>
        </div>
      </div>

      <div className="mb-6 flex w-fit gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => setTab('edit')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            tab === 'edit' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-gray-500'
          }`}
        >
          Sualları idarə et
        </button>
        <button
          onClick={() => setTab('paper')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            tab === 'paper' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-gray-500'
          }`}
        >
          Vərəq görünüşü
        </button>
      </div>

      {tab === 'paper' ? (
        loading ? (
          <Skeleton className="h-[480px]" />
        ) : (
          <PaperPreview exam={exam} questions={questions} />
        )
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <Card>
            <h3 className="mb-4 text-base font-bold">Yeni sual</h3>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <Textarea
                label="Sualın mətni"
                rows={3}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="A" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
                <Input label="B" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
                <Input label="C" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
                <Input label="D" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
              </div>
              <Select label="Düzgün cavab" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </Select>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Əlavə edilir...' : 'Sualı əlavə et'}
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            <h3 className="text-base font-bold">Mövcud suallar</h3>
            {loading ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : questions.length === 0 ? (
              <Card className="text-sm text-gray-500">Hələ sual yoxdur.</Card>
            ) : (
              questions.map((q, idx) => (
                <Card key={q.id || idx}>
                  <p className="font-medium">
                    {idx + 1}. {q.text}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {(q.options || []).map((opt, oi) => (
                      <li
                        key={opt.id || oi}
                        className={opt.isCorrect ? 'font-medium text-emerald-600' : 'text-gray-600 dark:text-gray-300'}
                      >
                        {String.fromCharCode(65 + oi)}) {opt.optionText || opt.text} {opt.isCorrect ? '✓' : ''}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

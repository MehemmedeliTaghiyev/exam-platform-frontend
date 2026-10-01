import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, BarChart3, Upload } from 'lucide-react';
import AppShell from '../components/AppShell';
import PaperPreview from '../components/PaperPreview';
import PdfViewer from '../components/PdfViewer';
import QuestionCard from '../components/QuestionCard';
import { Button, Card, Input, Select, Skeleton, Textarea } from '../components/ui';
import { addQuestion, applyAiAnswers, fetchExam, fetchQuestions, saveAnswerKey, tryGenerateAiQuestions, tryGradeAiQuestions, updateExam, updateQuestion } from '../lib/examApi';
import { errorMessage, isLetterOption, isOpenChoiceOption, optionLetter } from '../lib/utils';
import { extractPdfText, normalizeGeneratedQuestions, parseQuestionsFromText, toAddQuestionPayload } from '../lib/parseExamText';
import { dropTeacherPdf, peekTeacherPdf, stashTeacherPdf } from '../lib/teacherPdfCache';
import { exportExamToDocx } from '../lib/exportDocx';

const LETTERS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'OPEN', label: 'Açıq' },
];

function isOpenQuestion(question) {
  const type = String(question?.type || '');
  const kind = String(question?.inputKind || '');
  return type === 'OpenEnded' || ['Text', 'Integer', 'Decimal', 'Number'].includes(kind);
}

function letterOf(question) {
  if (isOpenQuestion(question)) return '';
  const correct = (question.options || []).find((o) => o.isCorrect);
  if (correct && isOpenChoiceOption(correct)) return 'OPEN';
  if (correct && isLetterOption(correct)) return optionLetter(correct);
  const idx = (question.options || []).findIndex((o) => o.isCorrect);
  if (idx < 0) return 'A';
  return LETTERS[idx]?.value || 'A';
}

export default function QuestionBuilder() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('edit');
  const [questionKind, setQuestionKind] = useState('choice');
  const [text, setText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [optionE, setOptionE] = useState('E');
  const [openAnswer, setOpenAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [submitting, setSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfCount, setPdfCount] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [answerKey, setAnswerKey] = useState({});
  const [openKeys, setOpenKeys] = useState({});
  const [kinds, setKinds] = useState({});
  const [message, setMessage] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [examData, qs] = await Promise.all([fetchExam(id), fetchQuestions(id)]);
      setExam(examData);
      setQuestions(qs);
      const nextKey = {};
      const nextOpen = {};
      const nextKinds = {};
      qs.forEach((q) => {
        nextKinds[q.id] = isOpenQuestion(q) ? (q.inputKind || 'Text') : 'Choice';
        nextKey[q.id] = letterOf(q);
        nextOpen[q.id] = q.correctText || '';
      });
      setAnswerKey(nextKey);
      setOpenKeys(nextOpen);
      setKinds(nextKinds);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const cached = peekTeacherPdf(id);
    if (cached) setPdfFile(cached);
  }, [id]);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (questionKind === 'choice') {
        await addQuestion(id, {
          text,
          points: 1,
          type: 'SingleChoice',
          inputKind: 'Choice',
          options: [
            { optionText: optionA, isCorrect: correctAnswer === 'A' },
            { optionText: optionB, isCorrect: correctAnswer === 'B' },
            { optionText: optionC, isCorrect: correctAnswer === 'C' },
            { optionText: optionD, isCorrect: correctAnswer === 'D' },
            { optionText: optionE || 'E', isCorrect: correctAnswer === 'E' },
            { optionText: 'Açıq', isCorrect: correctAnswer === 'OPEN' },
          ],
          correctText: correctAnswer === 'OPEN' ? openAnswer : null,
        });
      } else {
        await addQuestion(id, {
          text,
          points: 1,
          type: 'OpenEnded',
          inputKind: questionKind === 'integer' ? 'Integer' : questionKind === 'decimal' ? 'Decimal' : 'Text',
          correctText: openAnswer,
          options: [],
        });
      }
      setText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setOptionE('E');
      setOpenAnswer('');
      setCorrectAnswer('A');
      await load();
    } catch {
      alert('Sual əlavə edilərkən xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      setMessage('PDF seçin.');
      return;
    }
    setPdfBusy(true);
    setMessage('');
    try {
      const text = await extractPdfText(pdfFile);
      let parsed = parseQuestionsFromText(text);
      const wanted = parseInt(pdfCount, 10);
      const aiParsed = await tryGenerateAiQuestions({
        title: exam?.title || pdfFile.name.replace(/\.pdf$/i, ''),
        topic: 'PDF',
        subjectName: exam?.subjectName,
        brief: text,
        questionCount: Number.isFinite(wanted) ? wanted : Math.max(parsed.length, 10),
        source: 'pdf',
      }, { soft: true });
      if (aiParsed?.length) parsed = aiParsed;
      parsed = normalizeGeneratedQuestions(parsed);
      if (!parsed.length) {
        throw new Error('PDF-dən sual oxunmadı. Mətnli PDF yükləyin.');
      }
      try {
        const grades = await tryGradeAiQuestions(parsed, { soft: true });
        if (grades?.length) parsed = normalizeGeneratedQuestions(applyAiAnswers(parsed, grades));
      } catch {
        /* teacher can fix answers */
      }
      for (const q of parsed) {
        await addQuestion(id, toAddQuestionPayload(q));
      }
      stashTeacherPdf(id, pdfFile);
      await load();
      setMessage(`${parsed.length} sual AI ilə oxundu. Solda PDF, sağda kartlar — səhv oxunubsa düzəldin, sonra dərc edin.`);
    } catch (err) {
      setMessage(errorMessage(err, 'PDF oxunmadı.'));
    } finally {
      setPdfBusy(false);
    }
  };

  const persistKey = async (nextKey, nextOpen = openKeys) => {
    const answers = questions.map((q) => {
      const kind = kinds[q.id] || (isOpenQuestion(q) ? q.inputKind : 'Choice');
      if (kind !== 'Choice') {
        return {
          questionId: q.id,
          type: 'OpenEnded',
          inputKind: kind,
          correctText: nextOpen[q.id] || '',
          correctLetter: '',
        };
      }
      const letter = nextKey[q.id] || 'A';
      return {
        questionId: q.id,
        type: 'SingleChoice',
        inputKind: 'Choice',
        correctLetter: letter,
        correctText: letter === 'OPEN' ? (nextOpen[q.id] || '') : '',
      };
    });
    const list = await saveAnswerKey(id, answers);
    setQuestions(list);
  };

  const handleMarkCorrect = async (question, letter) => {
    const nextKey = { ...answerKey, [question.id]: letter };
    setAnswerKey(nextKey);
    try {
      await persistKey(nextKey);
    } catch (err) {
      setMessage(errorMessage(err, 'Düzgün variant yazılmadı.'));
    }
  };

  const handleSaveCard = async (question, payload) => {
    setEditBusy(true);
    setMessage('');
    try {
      await updateQuestion(id, question.id, toAddQuestionPayload({
        text: payload.text,
        correctLetter: payload.correctLetter,
        difficultyLevel: payload.difficultyLevel,
        options: payload.options,
      }));
      const nextKey = { ...answerKey, [question.id]: payload.correctLetter };
      setAnswerKey(nextKey);
      await persistKey(nextKey);
      await load();
      setMessage('Sual yeniləndi.');
    } catch (err) {
      setMessage(errorMessage(err, 'Sual yenilənmədi.'));
    } finally {
      setEditBusy(false);
    }
  };

  const publishDraft = async () => {
    if (!exam) return;
    try {
      const start = exam.startTime || new Date().toISOString();
      const duration = exam.durationMinutes || 45;
      const end = exam.endTime || new Date(Date.now() + duration * 60 * 1000).toISOString();
      const status = new Date(start).getTime() > Date.now() ? 'Scheduled' : 'Live';
      await updateExam(id, {
        subjectId: exam.subjectId,
        title: exam.title,
        durationMinutes: duration,
        totalQuestions: questions.length || exam.totalQuestions || 1,
        startTime: start,
        endTime: end,
        status,
        isDraft: false,
      });
      dropTeacherPdf(id);
      setPdfFile(null);
      setMessage('İmtahan dərc olundu. PDF artıq heç yerdə açılmır.');
      await load();
    } catch (err) {
      setMessage(errorMessage(err, 'İmtahan dərc olunmadı.'));
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
          <Button onClick={publishDraft} disabled={!questions.length}>
            İmtahanı dərc et
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/teacher/exams/${id}/stats`)}>
            <BarChart3 size={16} /> Statistika
          </Button>
          <Button variant="secondary" onClick={() => exportExamToDocx(exam, questions)}>
            <FileDown size={16} /> Word export
          </Button>
        </div>
      </div>

      {location.state?.localSaved && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          İmtahan bu cihazda saxlanıldı. Sualları əlavə edin — vərəq görünüşü və Word export hazır olacaq.
        </div>
      )}

      {message && (
        <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
          {message}
        </p>
      )}

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
        <div className="space-y-8">
          <Card>
            <h3 className="mb-2 text-base font-bold">PDF-dən clickable suallar</h3>
            <p className="mb-4 text-sm text-gray-500">
              PDF yükləyin — AI sualları çıxarır. Eyni səhifədə PDF qalır ki, səhv oxunuşu düzəldəsiniz. Dərcdən sonra PDF bağlanır, şagird yalnız kartları görür.
            </p>
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white"
              />
              <Input
                label="Sual sayı (istəyə bağlı)"
                type="number"
                min="1"
                max="200"
                value={pdfCount}
                onChange={(e) => setPdfCount(e.target.value)}
              />
              <Button type="submit" disabled={pdfBusy}>
                <Upload size={16} /> {pdfBusy ? 'AI oxuyur...' : 'PDF-dən sualları çıxar'}
              </Button>
            </form>
          </Card>

          {loading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : (
            <div className={pdfFile ? 'grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]' : ''}>
              {pdfFile ? (
                <PdfViewer file={pdfFile} title="Orijinal PDF — yalnız müəllim" />
              ) : null}
              <div className="space-y-4">
          {questions.length === 0 ? (
            <Card className="text-sm text-gray-500">PDF yükləyin — suallar kart kimi burada çıxacaq.</Card>
          ) : (
            questions.map((q, idx) => (
                isOpenQuestion(q) ? (
                  <Card key={q.id || idx}>
                    <p className="text-sm font-semibold text-gray-500">Sual {idx + 1}</p>
                    <p className="mt-2 font-medium">{q.text}</p>
                    <p className="mt-2 text-sm text-emerald-600">Düzgün: {q.correctText || '—'}</p>
                  </Card>
                ) : (
                  <QuestionCard
                    key={q.id || idx}
                    mode="teacher"
                    index={idx}
                    question={{ ...q, correctLetter: answerKey[q.id] || letterOf(q), difficultyLevel: q.difficultyLevel || 'orta' }}
                    onMarkCorrect={(letter) => handleMarkCorrect(q, letter)}
                    onSaveEdit={(payload) => handleSaveCard(q, payload)}
                  />
                )
            ))
          )}
              </div>
            </div>
          )}

          <Card>
              <h3 className="mb-4 text-base font-bold">Əl ilə yeni sual</h3>
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <Select label="Sual tipi" value={questionKind} onChange={(e) => setQuestionKind(e.target.value)}>
                  <option value="choice">Variantlı (A–E + Açıq)</option>
                  <option value="text">Açıq mətn</option>
                  <option value="integer">Tam ədəd</option>
                  <option value="decimal">Onluq ədəd</option>
                </Select>
                <Textarea
                  label="Sualın mətni"
                  rows={3}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                {questionKind === 'choice' ? (
                  <>
                    <p className="text-xs text-gray-500">
                      Tək seçim: 5 variant + 6-cı Açıq. Şagird Açıq-ı basanda öz cavabını yazır.
                    </p>
                    <div className="space-y-2">
                      {[
                        ['A', optionA, setOptionA, true],
                        ['B', optionB, setOptionB, true],
                        ['C', optionC, setOptionC, true],
                        ['D', optionD, setOptionD, true],
                        ['E', optionE, setOptionE, false],
                      ].map(([letter, value, setter, required]) => (
                        <label key={letter} className="flex items-center gap-2">
                          <input type="radio" name="correct-new" checked={correctAnswer === letter} onChange={() => setCorrectAnswer(letter)} />
                          <span className="w-5 text-sm font-semibold">{letter}</span>
                          <input
                            required={required}
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
                          />
                        </label>
                      ))}
                      <label className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-2 py-2 dark:border-slate-600">
                        <input type="radio" name="correct-new" checked={correctAnswer === 'OPEN'} onChange={() => setCorrectAnswer('OPEN')} />
                        <span className="text-sm font-semibold">Açıq</span>
                        <span className="text-xs text-gray-500">6-cı variant — şagird özü yazır</span>
                      </label>
                    </div>
                    {correctAnswer === 'OPEN' && (
                      <Input
                        label="Açıq düzgün cavab"
                        value={openAnswer}
                        onChange={(e) => setOpenAnswer(e.target.value)}
                        required
                      />
                    )}
                  </>
                ) : (
                  <Input
                    label="Düzgün cavab"
                    type={questionKind === 'text' ? 'text' : 'number'}
                    step={questionKind === 'decimal' ? 'any' : '1'}
                    value={openAnswer}
                    onChange={(e) => setOpenAnswer(e.target.value)}
                    required
                  />
                )}
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Əlavə edilir...' : 'Sualı əlavə et'}
                </Button>
              </form>
            </Card>
        </div>
      )}
    </AppShell>
  );
}

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, BarChart3, Upload } from 'lucide-react';
import AppShell from '../components/AppShell';
import PaperPreview from '../components/PaperPreview';
import PdfViewer from '../components/PdfViewer';
import { Button, Card, Input, Select, Skeleton, Textarea } from '../components/ui';
import { addQuestion, fetchExam, fetchQuestions, saveAnswerKey, updateExam, uploadExamPdfPack } from '../lib/examApi';
import { errorMessage, examPdfUrl, isExamDraft, isLetterOption, isOpenChoiceOption, optionLetter } from '../lib/utils';
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
  const [keyBusy, setKeyBusy] = useState(false);
  const [answerKey, setAnswerKey] = useState({});
  const [openKeys, setOpenKeys] = useState({});
  const [kinds, setKinds] = useState({});
  const [message, setMessage] = useState('');

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
    const count = parseInt(pdfCount, 10);
    if (!pdfFile) {
      setMessage('PDF seçin.');
      return;
    }
    if (!Number.isFinite(count) || count < 1 || count > 200) {
      setMessage('PDF-dəki sual sayını 1–200 aralığında daxil edin.');
      return;
    }
    setPdfBusy(true);
    setMessage('');
    try {
      const updated = await uploadExamPdfPack(id, pdfFile, count);
      setExam(updated);
      setPdfFile(null);
      setPdfCount(String(count));
      await load();
      setMessage('PDF yükləndi. Variantlar A–E və ayrıca Açıq sahə, istəsəniz tam açıq sual da qura bilərsiniz.');
    } catch (err) {
      setMessage(errorMessage(err, 'PDF yüklənmədi.'));
    } finally {
      setPdfBusy(false);
    }
  };

  const handleSaveKey = async () => {
    setKeyBusy(true);
    setMessage('');
    try {
      const answers = questions.map((q) => {
        const kind = kinds[q.id] || (isOpenQuestion(q) ? q.inputKind : 'Choice');
        if (kind !== 'Choice') {
          return {
            questionId: q.id,
            type: 'OpenEnded',
            inputKind: kind,
            correctText: openKeys[q.id] || '',
            correctLetter: '',
          };
        }
        const letter = answerKey[q.id] || 'A';
        return {
          questionId: q.id,
          type: 'SingleChoice',
          inputKind: 'Choice',
          correctLetter: letter,
          correctText: letter === 'OPEN' ? (openKeys[q.id] || '') : '',
        };
      });
      const list = await saveAnswerKey(id, answers);
      setQuestions(list);
      setMessage('Cavab açarı saxlanıldı.');
    } catch (err) {
      setMessage(errorMessage(err, 'Cavab açarı yazılmadı.'));
    } finally {
      setKeyBusy(false);
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
      });
      setMessage('İmtahan dərc olundu.');
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
          {isExamDraft(exam) && (
            <Button onClick={publishDraft}>İmtahanı dərc et</Button>
          )}
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
            <h3 className="mb-2 text-base font-bold">PDF ilə sual yüklə</h3>
            <p className="mb-4 text-sm text-gray-500">
              PDF-i yükləyin, altda sual sayını yazın. Hər sual üçün A–E hərf variantları və ayrıca Açıq yazı sahəsi var.
            </p>
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white"
              />
              <Input
                label="PDF-dəki sual sayı"
                type="number"
                min="1"
                max="200"
                value={pdfCount}
                onChange={(e) => setPdfCount(e.target.value)}
                required
              />
              <Button type="submit" disabled={pdfBusy}>
                <Upload size={16} /> {pdfBusy ? 'Yüklənir...' : 'PDF yüklə və yerləri aç'}
              </Button>
            </form>
          </Card>

          {exam?.id || id ? <PdfViewer exam={exam || { id }} title="Yüklənən PDF" /> : null}

          {questions.length > 0 && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold">Cavab açarı</h3>
                <Button onClick={handleSaveKey} disabled={keyBusy}>
                  {keyBusy ? 'Saxlanılır...' : 'Cavabları saxla'}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {questions.map((q, idx) => {
                  const kind = kinds[q.id] || 'Choice';
                  return (
                    <div key={q.id} className="rounded-xl border border-gray-200 p-3 dark:border-slate-700">
                      <p className="mb-2 text-sm font-medium">{idx + 1}. {q.text}</p>
                      <Select
                        label="Cavab növü"
                        value={kind}
                        onChange={(e) => setKinds((p) => ({ ...p, [q.id]: e.target.value }))}
                      >
                        <option value="Choice">A–E + Açıq</option>
                        <option value="Text">Açıq mətn</option>
                        <option value="Integer">Tam ədəd</option>
                        <option value="Decimal">Onluq ədəd</option>
                      </Select>
                      {kind === 'Choice' ? (
                        <>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {LETTERS.map((letter) => (
                            <label
                              key={letter.value}
                              className={`flex flex-1 min-w-[3.5rem] cursor-pointer items-center justify-center rounded-lg border py-2 text-sm ${
                                answerKey[q.id] === letter.value
                                  ? 'border-brand-500 bg-brand-50 font-semibold dark:bg-brand-600/20'
                                  : 'border-gray-200 dark:border-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                className="sr-only"
                                name={`key-${q.id}`}
                                checked={answerKey[q.id] === letter.value}
                                onChange={() => setAnswerKey((p) => ({ ...p, [q.id]: letter.value }))}
                              />
                              {letter.label}
                            </label>
                          ))}
                        </div>
                        {answerKey[q.id] === 'OPEN' && (
                          <div className="mt-2">
                            <Input
                              label="Açıq düzgün cavab"
                              value={openKeys[q.id] || ''}
                              onChange={(e) => setOpenKeys((p) => ({ ...p, [q.id]: e.target.value }))}
                            />
                          </div>
                        )}
                        </>
                      ) : (
                        <div className="mt-2">
                          <Input
                            label="Düzgün cavab"
                            type={kind === 'Text' ? 'text' : 'number'}
                            step={kind === 'Decimal' ? 'any' : kind === 'Integer' ? '1' : undefined}
                            value={openKeys[q.id] || ''}
                            onChange={(e) => setOpenKeys((p) => ({ ...p, [q.id]: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="A" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
                      <Input label="B" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
                      <Input label="C" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
                      <Input label="D" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
                      <Input label="E" value={optionE} onChange={(e) => setOptionE(e.target.value)} />
                    </div>
                    <Select label="Düzgün cavab" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="OPEN">Açıq</option>
                    </Select>
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
                    <p className="mt-1 text-xs text-gray-500">
                      {isOpenQuestion(q) ? `Açıq cavab (${q.inputKind || 'Text'})` : 'Variantlı'}
                    </p>
                    {isOpenQuestion(q) ? (
                      <p className="mt-2 text-sm text-emerald-600">Düzgün: {q.correctText || '—'}</p>
                    ) : (
                      <ul className="mt-3 space-y-1 text-sm">
                        {(q.options || []).map((opt, oi) => (
                          <li
                            key={opt.id || oi}
                            className={opt.isCorrect ? 'font-medium text-emerald-600' : 'text-gray-600 dark:text-gray-300'}
                          >
                            {LETTERS[oi]?.label || String.fromCharCode(65 + oi)}) {opt.optionText || opt.text}{' '}
                            {opt.isCorrect ? '✓' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

import { useContext, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import { Button, Card, FormError, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { mapPipelineQuestion, parseLang, scoreAnswer } from '../lib/pipeline/contract';
import { usePipelineExam, useSubmitPipelineAttempts } from '../lib/pipeline/hooks';
import ExamFinishConfirm, { useExamFinishGuard } from '../components/ExamFinishConfirm';

export default function TakePipelineExam({ preview = false }) {
  const { examId } = useParams();
  const [params] = useSearchParams();
  const lang = parseLang(params.get('lang'));
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { exam, loading, error } = usePipelineExam(examId, lang);
  const { busy, error: submitError, submit } = useSubmitPipelineAttempts();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const questions = useMemo(
    () => (exam?.questions || []).map((q, i) => mapPipelineQuestion(q, i)),
    [exam],
  );

  const onSelect = (question, opt) => {
    if (result) return;
    const letter = opt.letter === 'OPEN' ? '' : opt.letter;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { letter, text: prev[question.id]?.text || '' },
    }));
  };

  const onOpenText = (question, text) => {
    if (result) return;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { letter: prev[question.id]?.letter || '', text },
    }));
  };

  const finishGuardRef = useRef(null);
  const handleSubmit = async () => {
    finishGuardRef.current?.release();
    const attempts = questions.map((q) => {
      const picked = answers[q.id] || {};
      const answer = String(picked.letter || picked.text || '').trim();
      const scored = scoreAnswer(q, answer);
      return { question_id: q.id, correct: scored.correct, answer: scored.answer };
    });
    const nCorrect = attempts.filter((a) => a.correct).length;
    if (preview) {
      setResult({ n_correct: nCorrect, n_total: attempts.length, preview: true });
      return;
    }
    try {
      const logged = await submit({
        examId,
        studentId: user?.id,
        groupId: 'general',
        attempts,
      });
      setResult({
        n_correct: logged?.n_correct ?? nCorrect,
        n_total: logged?.n_total ?? attempts.length,
        participation_id: logged?.participation_id,
      });
    } catch {
      setResult({ n_correct: nCorrect, n_total: attempts.length, localOnly: true });
    }
  };

  const back = () => navigate(preview ? '/teacher' : '/student');
  const inExam = !preview && !loading && !result && questions.length > 0;
  const finishGuard = useExamFinishGuard(inExam, handleSubmit);
  finishGuardRef.current = finishGuard;

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937]">
      <header className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6B7280]">{preview ? 'Müəllim önbaxışı' : 'DİM imtahanı'} · {lang}</p>
          <p className="truncate font-semibold">{exam?.title || `İmtahan #${examId}`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={inExam ? finishGuard.request : back}>Geri</Button>
          <Button size="sm" onClick={inExam ? finishGuard.request : handleSubmit} disabled={busy || loading || Boolean(result) || !questions.length}>
            {busy ? 'Yazılır…' : preview ? 'Yoxla (log yoxdur)' : 'Təhvil ver'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        {loading ? (
          <>
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </>
        ) : error ? (
          <Card>
            <FormError message={error} />
            <Button className="mt-3" variant="secondary" onClick={back}>Panelə qayıt</Button>
          </Card>
        ) : (
          <>
            {exam?.params?.week_id && (
              <p className="text-sm text-[#6B7280]">
                Həftə {exam.params.week_id}
                {exam.params.weekly_band ? ` · ${exam.params.weekly_band}` : ''}
                {exam.params.audience ? ` · ${exam.params.audience}` : ''}
              </p>
            )}
            {questions.map((question, index) => (
              <div key={question.id}>
                {question.situationTitle && (
                  <p className="mb-2 text-sm font-semibold text-[#4F46E5]">{question.situationTitle}</p>
                )}
                {question.stem && question.stem !== question.text && (
                  <p className="mb-2 text-sm text-[#6B7280]">{question.stem}</p>
                )}
                <QuestionCard
                  question={question}
                  index={index}
                  mode="student"
                  disabled={Boolean(result)}
                  selectedOptionId={
                    answers[question.id]?.letter
                      ? question.options.find((o) => o.letter === answers[question.id].letter)?.id
                      : (answers[question.id]?.text ? 'open' : null)
                  }
                  openText={answers[question.id]?.text || ''}
                  onSelect={(opt) => onSelect(question, opt)}
                  onOpenText={(text) => onOpenText(question, text)}
                />
              </div>
            ))}
            <FormError message={submitError} />
            {result && (
              <Card>
                <p className="font-extrabold">
                  Nəticə: {result.n_correct} / {result.n_total}
                </p>
                {preview && <p className="mt-1 text-sm text-[#6B7280]">Önbaxış — participation yazılmayıb.</p>}
                {result.localOnly && (
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Banka yazılmadı (PIPELINE_API_URL). Cavablar yalnız bu ekranda hesablandı. Çətinlik avtomatik dəyişmir.
                  </p>
                )}
                {result.participation_id && (
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Participation #{result.participation_id}. Hardness yalnız analiz + qəbuldan sonra dəyişir.
                  </p>
                )}
                <Button className="mt-3" onClick={back}>Panelə qayıt</Button>
              </Card>
            )}
          </>
        )}
      </main>
      <ExamFinishConfirm
        open={finishGuard.open}
        busy={busy}
        onStay={finishGuard.stay}
        onFinish={finishGuard.confirm}
      />
    </div>
  );
}

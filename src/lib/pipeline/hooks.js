import { useCallback, useEffect, useState } from 'react';
import {
  ensureWeeklyPair,
  fetchPipelineExam,
  fetchPreviousWeeks,
  fetchWeeklyArchive,
  orderTeacherQuiz,
  submitPipelineAttempts,
} from './client';
import { isoWeek, isPastWeek, pipelineErrorMessage } from './contract';

function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (fn) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (err) {
      setError(pipelineErrorMessage(err));
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

export function useTeacherQuizOrder() {
  const { busy, error, setError, run } = useAsyncAction();
  const [exam, setExam] = useState(null);
  const order = useCallback(async (input) => {
    const data = await run(() => orderTeacherQuiz(input));
    setExam(data);
    return data;
  }, [run]);
  return { busy, error, setError, exam, order };
}

export function useWeeklyPapers({
  grade = '11',
  groupId = 'general',
  subject = 'math',
  language = 'az',
  ensureOnLoad = false,
} = {}) {
  const { busy, error, setError, run } = useAsyncAction();
  const [week, setWeek] = useState(isoWeek);
  const [payload, setPayload] = useState(null);
  const [weeks, setWeeks] = useState([]);

  const loadArchive = useCallback(async (nextWeek = week) => {
    const data = await run(() => fetchWeeklyArchive({
      week: nextWeek, grade, groupId, subject,
    }));
    setWeek(nextWeek);
    setPayload(data);
    return data;
  }, [grade, groupId, run, subject, week]);

  const loadWeeks = useCallback(async () => {
    try {
      const data = await fetchPreviousWeeks({ grade, groupId, subject });
      setWeeks(data.weeks || []);
    } catch {
      setWeeks([]);
    }
  }, [grade, groupId, subject]);

  const generateThisWeek = useCallback(async () => {
    const current = isoWeek();
    const data = await run(() => ensureWeeklyPair({
      grade, groupId, subject, language, week: current,
    }));
    setWeek(current);
    setPayload(data);
    await loadWeeks();
    return data;
  }, [grade, groupId, language, loadWeeks, run, subject]);

  const refresh = useCallback(async (nextWeek = week) => {
    const target = nextWeek || isoWeek();
    if (isPastWeek(target)) {
      return loadArchive(target);
    }
    return generateThisWeek();
  }, [generateThisWeek, loadArchive, week]);

  useEffect(() => {
    if (isPastWeek(week) || !ensureOnLoad) {
      loadArchive(week).catch(() => {});
    } else {
      generateThisWeek().catch(() => {});
    }
    loadWeeks();
  }, [week, grade, subject, groupId, language, ensureOnLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    busy,
    error,
    setError,
    week,
    setWeek,
    payload,
    weeks,
    loadArchive,
    generateThisWeek,
    refresh,
  };
}

export function usePipelineExam(examId, lang = 'az') {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(Boolean(examId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!examId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchPipelineExam(examId, lang)
      .then((data) => {
        if (!cancelled) setExam(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setExam(null);
          setError(pipelineErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [examId, lang]);

  return { exam, loading, error };
}

export function useSubmitPipelineAttempts() {
  const { busy, error, setError, run } = useAsyncAction();
  const submit = useCallback((payload) => run(() => submitPipelineAttempts(payload)), [run]);
  return { busy, error, setError, submit };
}

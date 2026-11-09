/** 30 sual ≈ 60 dəq → təxminən 2 dəqiqə / sual. */
export const MINUTES_PER_QUESTION = 2;
export const REFERENCE_QUESTIONS = 30;
export const REFERENCE_MINUTES = 60;

export function durationMinutesForQuestionCount(count) {
  const n = Math.max(1, Math.round(Number(count) || 0));
  return Math.max(1, Math.round(n * MINUTES_PER_QUESTION));
}

export function durationHint(count) {
  const n = Math.max(1, Math.round(Number(count) || 0));
  const mins = durationMinutesForQuestionCount(n);
  return `${n} sual · ~${MINUTES_PER_QUESTION} dəq/sual · cəmi ${mins} dəq (${REFERENCE_QUESTIONS} sual ≈ ${REFERENCE_MINUTES} dəq)`;
}

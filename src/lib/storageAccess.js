export const STORAGE_PRICE = 30;
export const STORAGE_PRICE_BLOK = 40;
export const WATERMARK_PRICE = 5;
export const STORAGE_DAYS = 30;
export const STORAGE_QUIZZES_PER_WEEK = 6;

export const STORAGE_PLANS = [
  {
    id: 'buraxilis',
    title: 'Buraxılışadək',
    blurb: 'Bir dəfəlik. Buraxılış imtahanına qədər Anbar açıqdır',
    price: STORAGE_PRICE,
    examKind: 'buraxilis',
  },
  {
    id: 'blok',
    title: 'Blokadək',
    blurb: 'Bir dəfəlik. Blok imtahanına qədər Anbar açıqdır',
    price: STORAGE_PRICE_BLOK,
    examKind: 'blok',
  },
];

const paidKey = (id) => `exampulse_storage_paid_${id || 'me'}`;

function readPaid(userId) {
  try {
    const raw = localStorage.getItem(paidKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function nextSeasonEnd(monthIndex, day) {
  const now = new Date();
  const end = new Date(now.getFullYear(), monthIndex, day, 23, 59, 59, 999);
  if (now.getTime() > end.getTime()) end.setFullYear(end.getFullYear() + 1);
  return end;
}

export function planEndsAt(planId, from = new Date()) {
  const id = String(planId || 'buraxilis');
  if (id === 'blok') return nextSeasonEnd(6, 1);
  return nextSeasonEnd(4, 15);
}

export function planUntilLabel(planId) {
  return planEndsAt(planId).toLocaleDateString('az-AZ');
}

export function storagePlanById(planId) {
  return STORAGE_PLANS.find((row) => row.id === planId) || STORAGE_PLANS[0];
}

export function storageTotal(planId, watermark) {
  const plan = storagePlanById(planId);
  return plan.price + (watermark ? WATERMARK_PRICE : 0);
}

export function storageSubscription(user) {
  const row = readPaid(user?.id);
  if (!row?.endsAt) return null;
  if (new Date(row.endsAt).getTime() <= Date.now()) return null;
  return row;
}

export function teacherWatermarkText(teacherId) {
  if (teacherId == null || teacherId === '') return '';
  const row = readPaid(teacherId);
  if (!row?.watermark) return '';
  if (row.endsAt && new Date(row.endsAt).getTime() <= Date.now()) return '';
  return String(row.watermarkText || '').trim();
}

export function canUseStorageSelection(user) {
  if (!user) return false;
  if (user.role === 'Admin' || user.practice) return true;
  return user.role === 'Teacher';
}

export function completeStoragePayment(user, options = {}) {
  const paidAt = new Date();
  const planId = String(options.planId || options.examKind || 'buraxilis');
  const watermark = Boolean(options.watermark);
  const watermarkText = watermark ? String(options.watermarkText || '').trim() : '';
  const ends = options.endsAt ? new Date(options.endsAt) : planEndsAt(planId, paidAt);
  const amount = Number(options.amount) || storageTotal(planId, watermark);
  const row = {
    planId,
    examKind: planId,
    amount,
    paidAt: paidAt.toISOString(),
    endsAt: ends.toISOString(),
    watermark,
    watermarkText: watermark ? watermarkText : '',
  };
  localStorage.setItem(paidKey(user?.id), JSON.stringify(row));
  return row;
}

function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function weeklyPipelineQuizzes(date = new Date()) {
  const week = isoWeekKey(date);
  return Array.from({ length: STORAGE_QUIZZES_PER_WEEK }, (_, index) => ({
    id: `${week}-${index + 1}`,
    week,
    index: index + 1,
    title: `Həftəlik sınaq ${index + 1}`,
    status: 'pipeline',
  }));
}

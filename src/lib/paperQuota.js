/** Sınaq / Buraxılış = 25; Blok = 30 (son 3 situasiya). */
export function questionsPerPaper(kind) {
  const raw = String(kind || '').toLocaleLowerCase('az');
  if (/blok|block|specialty/.test(raw)) return 30;
  return 25;
}

export function isBlokKind(kind) {
  return /blok|block|specialty/i.test(String(kind || ''));
}

export function isBuraxilisKind(kind) {
  return /burax/i.test(String(kind || ''));
}

export function bankKindForExam(kind) {
  const raw = String(kind || '').toLocaleLowerCase('az');
  if (/blok|block|specialty/.test(raw)) return 'blok';
  if (/burax/.test(raw)) return 'buraxılış';
  return null;
}

/**
 * from-bank body: Blok/Buraxılış tip kvotaları (MCQ/yazılı/situasiya).
 * Sınaq: yalnız ümumi count.
 */
export function paperCopyQuota(kind, difficultyLevel, grade = '11') {
  const bankKind = bankKindForExam(kind);
  const bankAudience = bankKind === 'blok' ? 'specialty' : null;
  const g = String(grade || '11').replace(/\D/g, '') || '11';
  const base = {
    ...(bankAudience ? { audience: bankAudience } : {}),
    ...(bankKind ? { kind: bankKind } : {}),
    ...(difficultyLevel ? { difficultyLevel } : {}),
  };
  if (isBlokKind(kind)) {
    return {
      ...base,
      mcqCount: 22,
      writtenCount: 5,
      situationCount: 3,
    };
  }
  if (isBuraxilisKind(kind)) {
    if (g === '9') {
      return {
        ...base,
        mcqCount: 12,
        openCodedCount: 4,
        writtenCount: 6,
      };
    }
    return {
      ...base,
      mcqCount: 13,
      openCodedCount: 5,
      writtenCount: 7,
    };
  }
  return {
    ...base,
    count: questionsPerPaper(kind),
  };
}

/** Sınaq / Buraxılış = 25; Blok = 30 (son 3 situasiya). */
export function questionsPerPaper(kind) {
  const raw = String(kind || '').toLocaleLowerCase('az');
  if (/blok|block|specialty/.test(raw)) return 30;
  return 25;
}

export function isBlokKind(kind) {
  return /blok|block|specialty/i.test(String(kind || ''));
}

export function bankKindForExam(kind) {
  const raw = String(kind || '').toLocaleLowerCase('az');
  if (/blok|block|specialty/.test(raw)) return 'blok';
  if (/burax/.test(raw)) return 'buraxılış';
  return null;
}

/** from-bank body for one paper at a single difficulty. */
export function paperCopyQuota(kind, difficultyLevel) {
  const bankKind = bankKindForExam(kind);
  const bankAudience = bankKind === 'blok' ? 'specialty' : null;
  const base = {
    ...(bankAudience ? { audience: bankAudience } : {}),
    ...(bankKind ? { kind: bankKind } : {}),
    difficultyLevel,
  };
  if (isBlokKind(kind)) {
    // PaperQuotas: 22 MCQ + 5 yazılı + 3 situasiya = 30
    return {
      ...base,
      mcqCount: 22,
      writtenCount: 5,
      situationCount: 3,
    };
  }
  return {
    ...base,
    count: questionsPerPaper(kind),
  };
}

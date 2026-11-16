/**
 * Official DİM math chapters by grade (exam_rules.json).
 * Grade 10 has no native bank tests — 9/11 questions whose MainTopic is in
 * this list are also tagged grade 10 (multi-grade, keep 9/11).
 * Do not invent chapters from the grade-11 February send calendar.
 */

import { localDb } from './localDb.js';

export const MATH_GRADES = ['9', '10', '11'];

/** Chapters of the 9-year buraxılış program. */
export const GRADE_9_TOPICS = [
  'Həqiqi ədədlər',
  'Nisbət. Tənasüb. Faiz',
  'Rasional ifadələr',
  'n-ci dərəcədən kök. İrrasional ifadələr. Üstlü qüvvət',
  'Ölçmə. Statistika. Çoxluqlar. Birləşmələr və ehtimal',
  'Birdəyişənli tənliklər və məsələ həlli',
  'Tənliklər sistemi və məsələ həlli',
  'Bərabərsizliklər',
  'Funksiyalar və qrafiklər',
  'Sadə həndəsi fiqurlar',
  'Çevrə və dairə',
  'Üçbucaqlar',
  'Dördbucaqlılar və çoxbucaqlılar',
  'Fiqurların sahəsi',
  'Koordinatlar üsulu. Hərəkət. Oxşarlıq. Vektorlar',
  'Çoxüzlülər, onların səthi və həcmi',
];

/** 10th-grade DİM program — source of truth for grade-10 syllabus UI. */
export const GRADE_10_TOPICS = [
  'Həqiqi ədədlər',
  'Kompleks ədədlər',
  'Nisbət. Tənasüb. Faiz',
  'Rasional ifadələr',
  'n-ci dərəcədən kök. İrrasional ifadələr. Üstlü qüvvət',
  'Ölçmə. Statistika. Çoxluqlar. Birləşmələr və ehtimal',
  'Birdəyişənli tənliklər və məsələ həlli',
  'Tənliklər sistemi və məsələ həlli',
  'Bərabərsizliklər',
  'Funksiyalar və qrafiklər',
  'Triqonometrik funksiyalar. Triqonometrik tənliklər',
  'Üstlü və loqarifmik funksiyalar',
  'Üstlü və loqarifmik tənliklər və bərabərsizliklər',
  'Sadə həndəsi fiqurlar',
  'Çevrə və dairə',
  'Üçbucaqlar',
  'Dördbucaqlılar və çoxbucaqlılar',
  'Fiqurların sahəsi',
  'Fəzada nöqtə, düz xətt, müstəvi',
  'Çoxüzlülər, onların səthi və həcmi',
];

/** 11-year buraxılış program (not Blok calculus). */
export const GRADE_11_TOPICS = [
  'Həqiqi ədədlər',
  'Kompleks ədədlər',
  'Nisbət. Tənasüb. Faiz',
  'Rasional ifadələr',
  'n-ci dərəcədən kök. İrrasional ifadələr. Üstlü qüvvət',
  'Ölçmə. Statistika. Çoxluqlar. Birləşmələr və ehtimal',
  'Birdəyişənli tənliklər və məsələ həlli',
  'Tənliklər sistemi və məsələ həlli',
  'Bərabərsizliklər',
  'Ədədi ardıcıllıqlar. Silsilələr',
  'Funksiyalar və qrafiklər',
  'Triqonometrik funksiyalar. Triqonometrik tənliklər',
  'Üstlü və loqarifmik funksiyalar',
  'Üstlü və loqarifmik tənliklər və bərabərsizliklər',
  'Sadə həndəsi fiqurlar',
  'Çevrə və dairə',
  'Üçbucaqlar',
  'Dördbucaqlılar və çoxbucaqlılar',
  'Fiqurların sahəsi',
  'Koordinatlar üsulu. Hərəkət. Oxşarlıq. Vektorlar',
  'Fəzada nöqtə, düz xətt, müstəvi',
  'Çoxüzlülər, onların səthi və həcmi',
  'Fırlanma fiqurları, onların səthi və həcmi',
];

export const TOPICS_BY_GRADE = {
  9: GRADE_9_TOPICS,
  10: GRADE_10_TOPICS,
  11: GRADE_11_TOPICS,
};

/**
 * Which bank Grade labels may appear on a paper for this student grade.
 * Grade 10 has no native rows — Core should match questions tagged 9 and/or 11
 * whose MainTopic is in GRADE_10_TOPICS, also stored as Grade containing "10".
 */
export const INCLUDE_GRADES = {
  9: ['9'],
  10: ['9', '10', '11'],
  11: ['9', '10', '11'],
};

export function normalizeGrade(raw, fallback = '11') {
  const key = String(raw ?? '').trim();
  if (MATH_GRADES.includes(key)) return key;
  const digit = key.match(/\b(9|10|11)\b/);
  return digit ? digit[1] : fallback;
}

export function allowedTopicsForGrade(grade) {
  const key = normalizeGrade(grade);
  return TOPICS_BY_GRADE[key] || GRADE_11_TOPICS;
}

export function topicAllowedForGrade(title, grade) {
  return allowedTopicsForGrade(grade).includes(String(title || ''));
}

export function includeGradesFor(grade) {
  const key = normalizeGrade(grade);
  return INCLUDE_GRADES[key] || INCLUDE_GRADES[11];
}

/**
 * from-bank contract while Core Grade is still a single string that may list
 * several grades (`"9;10"` or `"9,11"`). Frontend always sends:
 *   grade: "10"
 *   grades: ["9","10","11"]   // PascalCase Grades accepted on the DTO
 * Core already matches with Grade.Contains(grade) (soft).
 */
export function fromBankGradeFields(grade) {
  const key = normalizeGrade(grade);
  const grades = includeGradesFor(key);
  return {
    grade: key,
    grades,
    Grades: grades,
    Grade: key,
  };
}

/** Bank chapter for a syllabus title — identity; names already match QuestionBank.MainTopic. */
export function bankTopicsForSyllabusTitle(title) {
  const name = String(title || '').trim();
  return name ? [name] : [];
}

export function studentGradeFromUser(user, fallback = '11') {
  if (!user) return fallback;
  return normalizeGrade(
    user.grade
    ?? user.Grade
    ?? user.classYear
    ?? user.ClassYear
    ?? user.sinif
    ?? user.Sinif,
    fallback,
  );
}

export function resolveStudentGrade(user, fallback = '11') {
  const stored = user?.id ? localDb.getStudentGrade(user.id) : '';
  return studentGradeFromUser({
    ...user,
    grade: user?.grade || user?.Grade || stored,
  }, fallback);
}

export function persistStudentGrade(user, grade) {
  const key = normalizeGrade(grade);
  if (user?.id) localDb.setStudentGrade(user.id, key);
  return key;
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PREFERENCE_OPTIONS } from './storageCatalog.js';
import {
  directoryRowFromUser,
  emptyTeacherSearch,
  filterSortTeachers,
  mergeTeacherDirectory,
  teacherSearchActive,
  uniqueRegions,
  uniqueTeacherSubjects,
} from './teacherSearch.js';

const teachers = [
  { id: 1, fullName: 'Azer Muellim', position: 'Bakı', subjects: ['Riyaziyyat'], weeklyExamCount: 2, avgScore: 80 },
  { id: 2, fullName: 'Nigar Həsənova', position: 'Gəncə', subjects: ['Riyaziyyat'], weeklyExamCount: 1, avgScore: 70 },
  { id: 3, fullName: 'Elvin Müəllim', position: 'Bakı', subjects: ['Fizika'], weeklyExamCount: 0, avgScore: 0, isAccessEnabled: false },
  { id: 4, fullName: 'Leyla Əliyeva', position: 'Sumqayıt', subjects: ['İngilis dili'], weeklyExamCount: 3, avgScore: 90 },
];

describe('teacher marketplace search', () => {
  it('empty filters return every teacher, including access-disabled', () => {
    const rows = filterSortTeachers(teachers, emptyTeacherSearch());
    assert.equal(rows.length, 4);
    assert.ok(rows.some((t) => t.id === 3));
  });

  it('search is inactive until a filter is filled', () => {
    assert.equal(teacherSearchActive(emptyTeacherSearch()), false);
    assert.equal(teacherSearchActive({ query: '  ', region: 'all', subject: 'all' }), false);
    assert.equal(teacherSearchActive({ query: 'nigar', region: 'all', subject: 'all' }), true);
    assert.equal(teacherSearchActive({ query: '', region: 'Bakı', subject: 'all' }), true);
    assert.equal(teacherSearchActive({ query: '', region: 'all', subject: 'Fizika' }), true);
  });

  it('filters by query, region, subject, and combinations', () => {
    assert.deepEqual(
      filterSortTeachers(teachers, { query: 'nigar', region: 'all', subject: 'all' }).map((t) => t.id),
      [2],
    );
    assert.deepEqual(
      filterSortTeachers(teachers, { query: '', region: 'Bakı', subject: 'all' }).map((t) => t.id).sort(),
      [1, 3],
    );
    assert.deepEqual(
      filterSortTeachers(teachers, { query: '', region: 'all', subject: 'Fizika' }).map((t) => t.id),
      [3],
    );
    assert.deepEqual(
      filterSortTeachers(teachers, { query: 'elvin', region: 'Bakı', subject: 'Fizika' }).map((t) => t.id),
      [3],
    );
    assert.deepEqual(
      filterSortTeachers(teachers, { query: 'nigar', region: 'Bakı', subject: 'all' }).map((t) => t.id),
      [],
    );
    assert.deepEqual(
      filterSortTeachers(teachers, { query: 'muellim', region: 'Bakı', subject: 'Riyaziyyat' }).map((t) => t.id),
      [1],
    );
  });

  it('maps teachingSubject and bio onto the directory row and keeps disabled teachers', () => {
    const row = directoryRowFromUser({
      id: 9,
      fullName: 'Sevinc',
      position: 'Şəki',
      teachingSubject: 'Kimya',
      about: 'Şəkidə kimya müəllimi.',
      isAccessEnabled: false,
    });
    assert.equal(row.isAccessEnabled, false);
    assert.equal(row.bio, 'Şəkidə kimya müəllimi.');
    assert.deepEqual(row.subjects, ['Kimya']);
    const merged = mergeTeacherDirectory([
      [{ id: 9, fullName: 'Sevinc', isAccessEnabled: false, teachingSubject: 'Kimya' }],
      [{ id: 9, subjects: ['Biologiya'] }],
    ]);
    assert.equal(merged.length, 1);
    assert.ok(merged[0].subjects.includes('Kimya'));
    assert.ok(merged[0].subjects.includes('Biologiya'));
  });

  it('region and subject lists include loaded teachers and catalog subjects', () => {
    assert.deepEqual(uniqueRegions(teachers), ['Bakı', 'Gəncə', 'Sumqayıt']);
    const subjects = uniqueTeacherSubjects(teachers);
    PREFERENCE_OPTIONS.subjects.forEach((name) => assert.ok(subjects.includes(name)));
    assert.ok(subjects.includes('Fizika'));
  });
});

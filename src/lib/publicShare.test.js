import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}
import {
  keepPublicCatalogExam,
  PUBLIC_EXAM_CATALOG_PATHS,
  publicExamCatalogPathsForTeacher,
  publicExamsOfTeacher,
} from './publicExams.js';
import { canShareExamPublic, resolvedShareVisibility, studentCanSeeExam } from './syllabus.js';

describe('teacher public share rules', () => {
  it('allows public only for a one-topic sınaq', () => {
    const one = { title: 'Kvadrat tənliklər', description: 'Tək mövzu', kind: 'teacher', subjectName: 'Riyaziyyat' };
    const mixed = { title: 'Blok sınaq', description: '[[MIXED]] bir neçə mövzu', kind: 'blok', subjectName: 'Riyaziyyat' };
    assert.equal(canShareExamPublic(one), true);
    assert.equal(canShareExamPublic(mixed), false);
    assert.equal(resolvedShareVisibility(one, 'public'), 'public');
    assert.equal(resolvedShareVisibility(mixed, 'public'), 'private');
    assert.equal(resolvedShareVisibility(one, 'private'), 'private');
  });

  it('lists Core catalog paths the student exams page calls', () => {
    assert.ok(PUBLIC_EXAM_CATALOG_PATHS.includes('/Exams/cards'));
    assert.ok(PUBLIC_EXAM_CATALOG_PATHS.some((path) => path.includes('isPublic=true')));
    assert.ok(PUBLIC_EXAM_CATALOG_PATHS.includes('/Exams/public'));
    const teacher = publicExamCatalogPathsForTeacher(53);
    assert.ok(teacher.some((path) => path.includes('teacherId=53') && path.includes('isPublic=true')));
  });

  it('keeps public one-topic papers on the student catalog and drops private / mixed', () => {
    const publicOne = {
      id: 'p1',
      title: 'Kvadrat tənliklər',
      isPublic: true,
      visibility: 'public',
      teacherId: 53,
      status: 'Live',
    };
    const privateOne = {
      id: 'pr1',
      title: 'Özəl hazırlıq',
      isPublic: false,
      visibility: 'private',
      teacherId: 53,
      status: 'Live',
    };
    const mixedPublic = {
      id: 'm1',
      title: 'Blok sınaq',
      description: '[[MIXED]]',
      kind: 'blok',
      isPublic: true,
      visibility: 'public',
      teacherId: 53,
      status: 'Live',
    };
    assert.equal(keepPublicCatalogExam(publicOne), true);
    assert.equal(keepPublicCatalogExam(privateOne), false);
    assert.equal(keepPublicCatalogExam(mixedPublic), false);
    assert.deepEqual(
      publicExamsOfTeacher([publicOne, privateOne, mixedPublic], 53).map((exam) => exam.id),
      ['p1'],
    );
  });

  it('lets every student see a public paper, not only the teacher’s own class', () => {
    const exam = {
      id: 10,
      title: 'Kvadrat tənliklər',
      isPublic: true,
      visibility: 'public',
      teacherId: 53,
      status: 'Live',
    };
    const otherStudent = { id: 's2', role: 'Student', teacherId: 99 };
    const ownStudent = { id: 's1', role: 'Student', teacherId: 53 };
    assert.equal(studentCanSeeExam(otherStudent, exam), true);
    assert.equal(studentCanSeeExam(ownStudent, exam), true);
    assert.equal(
      studentCanSeeExam(otherStudent, { ...exam, isPublic: false, visibility: 'private' }),
      false,
    );
  });
});

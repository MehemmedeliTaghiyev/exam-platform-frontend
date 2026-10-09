import API from '../api/axios';
import { localDb } from './localDb';
import { unwrapList, unwrapItem, unwrapOptions, uid, percent, resolveExamStatus, examPdfUrl, isOpenChoiceOption } from './utils';
import { driveFolderOpenUrl, isDriveMarkerQuestion, teacherDriveFolderUrl, wrapExamDescription, wrapTrialMessage } from './driveLinks';
import { examVisibility, withExamVisibility } from './examVisibility';
import { parseQuestionImage, stripQuestionImage } from './questionImage';
import { pointsForDifficulty } from './questionDifficulty';
import {
  isPractice,
  practiceRole,
  practiceFetchExams,
  practiceFetchExam,
  practiceCreateExam,
  practiceUpdateExam,
  practiceDeleteExam,
  practiceQuestions,
  practiceAddQuestion,
  savePracticeQuestions,
  practiceStartExam,
  practiceSubmitExam,
  practiceSubmissions,
  practiceUser,
  practiceFindReview,
  practiceWeeklyRankingSource,
} from './practice';

const FAST = { timeout: 20000 };

async function tryGet(url) {
  const res = await API.get(url, FAST);
  return res.data;
}

function withCounts(exams) {
  const submissions = localDb.getSubmissions();
  return exams.map((exam) => {
    const localCount = submissions.filter((s) => String(s.examId) === String(exam.id)).length;
    return {
      ...exam,
    teacherId: exam.teacherId ?? exam.TeacherId,
    teacherName: exam.teacherName || exam.TeacherName,
    visibility: examVisibility(exam),
    isPublic: examVisibility(exam) === 'public',
      subjectName: exam.subjectName || exam.subject || exam.SubjectName,
      totalQuestions: exam.totalQuestions ?? exam.questionCount ?? exam.TotalQuestions,
      durationMinutes: exam.durationMinutes ?? exam.DurationMinutes,
      startTime: exam.startTime || exam.StartTime,
      endTime: exam.endTime || exam.EndTime,
      status: resolveExamStatus(exam),
      submissionsCount: Math.max(exam.submissionsCount || 0, localCount),
    };
  });
}

export async function fetchSubjects() {
  if (isPractice()) return localDb.getSubjects();
  try {
    const data = await tryGet('/Subjects');
    const list = unwrapList(data).map((s) => ({
      id: s.id ?? s.subjectId,
      name: s.name || s.title || s.subjectName,
    })).filter((s) => s.id != null && s.name);
    if (list.length) {
      localDb.saveSubjects(list);
      return list;
    }
  } catch {
    /* local */
  }
  return localDb.getSubjects();
}

export async function createStudentAccount(payload) {
  const body = {
    fullName: payload.fullName,
    email: payload.email,
    userName: payload.userName,
    password: payload.password,
    groupName: payload.groupName,
    groupId: payload.groupId ? Number(payload.groupId) : null,
    firstName: payload.firstName,
    lastName: payload.lastName,
    fatherName: payload.fatherName,
    birthDate: payload.birthDate || null,
    contractStart: payload.contractStart || null,
    contractEnd: payload.contractEnd || null,
    photo: payload.photo || null,
    contractPhoto: payload.contractPhoto || null,
    closeAccess: Boolean(payload.closeAccess),
  };
  const paths = ['/Users/students', '/Users/create-student', '/Users'];
  let lastError;
  for (const path of paths) {
    try {
      const res = await API.post(path, body);
      return unwrapItem(res.data) || res.data;
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      if (status !== 404 && status !== 405) throw err;
    }
  }
  throw lastError;
}

function mapGroup(g) {
  return {
    id: g.id ?? g.Id,
    name: g.name || g.Name || '',
    number: g.number || g.Number || g.name || g.Name || '',
    schedule: g.schedule || g.Schedule || '',
    studentCount: g.studentCount ?? g.StudentCount ?? 0,
    createdAt: g.createdAt || g.CreatedAt,
    inviteCode: g.inviteCode || g.InviteCode || '',
  };
}

export const DUPLICATE_GROUP_MESSAGE = 'Bu adda qrup artıq var. Mövcud qrup əvəz olunmur.';

function groupNameKeys(g) {
  return [g?.name, g?.number]
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean);
}

export function groupsShareName(a, b) {
  const left = groupNameKeys(a);
  const right = groupNameKeys(b);
  return left.some((key) => right.includes(key));
}

function duplicateGroupError() {
  const err = new Error(DUPLICATE_GROUP_MESSAGE);
  err.isDuplicateGroup = true;
  return err;
}

function findDuplicateGroup(list, payload) {
  return (list || []).find((g) => groupsShareName(g, payload));
}

export function mapStudent(u) {
  if (!u) return null;
  return {
    id: u.id ?? u.Id,
    fullName: u.fullName || u.FullName,
    email: u.email || u.Email,
    userName: u.userName || u.UserName,
    groupName: u.groupName || u.GroupName || '',
    groupId: u.groupId ?? u.GroupId,
    firstName: u.firstName || u.FirstName,
    lastName: u.lastName || u.LastName,
    fatherName: u.fatherName || u.FatherName,
    birthDate: u.birthDate || u.BirthDate,
    contractStart: u.contractStart || u.ContractStart,
    contractEnd: u.contractEnd || u.ContractEnd,
    photo: u.photo || u.Photo,
    contractPhoto: u.contractPhoto || u.ContractPhoto,
    isAccessEnabled: (u.isAccessEnabled ?? u.IsAccessEnabled) !== false,
    createdAt: u.createdAt || u.CreatedAt,
    position: u.position || u.Position || '',
    phone: u.phone || u.Phone || '',
    teacherId: u.teacherId ?? u.TeacherId ?? null,
    role: u.role || u.Role,
    trialMessage: u.trialMessage || u.TrialMessage || '',
    driveFolderUrl: teacherDriveFolderUrl(u) || localDb.getTeacherDriveFolder(u.id ?? u.Id),
  };
}

export function isPendingApproval(u) {
  if (!u || u.isDeleted || u.IsDeleted) return false;
  const enabled = (u.isAccessEnabled ?? u.IsAccessEnabled) !== false;
  if (enabled) return false;
  const role = String(u.role || u.Role || '');
  const msg = String(u.trialMessage || u.TrialMessage || '');
  if (msg.includes('təsdiqini gözləyir') || msg.includes('tesdiqini gozleyir')) return true;
  if (/teacher/i.test(role) && !(u.trialStartsAt || u.TrialStartsAt)) return true;
  return false;
}

export function groupInviteSlug(group) {
  const code = String(group?.inviteCode || '').trim();
  if (code) return code;
  const id = Number(group?.id);
  if (Number.isFinite(id) && id > 0) return `g${id}`;
  return '';
}

export function groupInviteUrl(inviteCode, groupName = '') {
  const code = String(inviteCode || '').trim();
  if (!code) return '';
  const url = `${window.location.origin}/join/${encodeURIComponent(code)}`;
  const name = String(groupName || '').trim();
  return name ? `${url}?group=${encodeURIComponent(name)}` : url;
}

export async function fetchGroupInvite(code) {
  const res = await API.get(`/Groups/invite/${encodeURIComponent(code)}`, FAST);
  const data = unwrapItem(res.data) || res.data;
  return {
    inviteCode: data.inviteCode || data.InviteCode || code,
    groupName: data.groupName || data.GroupName || '',
    teacherName: data.teacherName || data.TeacherName || '',
  };
}

export async function registerStudentInvite(payload) {
  const res = await API.post('/Auth/register-student', payload);
  return unwrapItem(res.data) || res.data;
}

export async function registerOpenStudent(payload) {
  const body = {
    ...payload,
    role: 'Student',
    Role: 'Student',
    independent: true,
    Independent: true,
  };
  try {
    const res = await API.post('/Auth/register', body);
    return unwrapItem(res.data) || res.data;
  } catch {
    const res = await API.post('/Auth/register-student', body);
    return unwrapItem(res.data) || res.data;
  }
}

export async function fetchOwnProfile() {
  if (isPractice()) return practiceUser(practiceRole() || 'Teacher');
  const res = await API.get('/Users/me', FAST);
  const me = unwrapItem(res.data) || res.data || {};
  const id = me.id ?? me.Id;
  const folder = teacherDriveFolderUrl(me) || localDb.getTeacherDriveFolder(id);
  if (folder && id) localDb.setTeacherDriveFolder(id, folder);
  return { ...me, driveFolderUrl: folder };
}

export async function updateOwnProfile(payload) {
  if (isPractice()) return { ...practiceUser(practiceRole() || 'Teacher'), ...payload };
  const res = await API.patch('/Users/me', payload);
  return unwrapItem(res.data) || res.data;
}

function currentTeacherId() {
  return currentUserSnapshot().scope;
}

function withoutHiddenGroups(teacherId, list) {
  const hidden = new Set(localDb.hiddenGroupIds(teacherId));
  return (list || []).filter((g) => !hidden.has(String(g.id)));
}

export async function fetchGroups() {
  if (isPractice()) return [];
  const teacherId = currentTeacherId();
  try {
    const local = localDb.getGroups(teacherId);
    let remote = [];
    try {
      remote = unwrapList(await tryGet('/Groups')).map(mapGroup);
    } catch {
      remote = [];
    }
    for (const g of local) {
      if (Number(g.id) > 0) continue;
      if (!String(g.name || g.number || '').trim()) continue;
      if (findDuplicateGroup(remote, g)) continue;
      try {
        await API.post('/Groups', {
          name: g.name || g.number,
          number: g.number || g.name,
          schedule: g.schedule || '',
        });
      } catch {
        /* duplicate or offline */
      }
    }
    const data = await tryGet('/Groups');
    const list = withoutHiddenGroups(teacherId, unwrapList(data).map(mapGroup));
    if (list.length) {
      localDb.saveGroups(teacherId, list);
      return list;
    }
    const localOnly = withoutHiddenGroups(teacherId, localDb.getGroups(teacherId));
    return localOnly.length ? localOnly : list;
  } catch {
    return withoutHiddenGroups(teacherId, localDb.getGroups(teacherId));
  }
}

export async function createGroup(payload) {
  const teacherId = currentTeacherId();
  const incoming = {
    name: String(payload.name || '').trim(),
    number: String(payload.number || payload.name || '').trim(),
    schedule: payload.schedule || '',
  };
  if (findDuplicateGroup(localDb.getGroups(teacherId).filter((g) => Number(g.id) > 0), incoming)) {
    throw duplicateGroupError();
  }
  try {
    const res = await API.post('/Groups', {
      name: incoming.name,
      number: incoming.number,
      schedule: incoming.schedule,
    }, FAST);
    const group = mapGroup(unwrapItem(res.data) || res.data);
    if (Number(group?.id) > 0) {
      localDb.unhideGroup(teacherId, group.id);
      const current = localDb.getGroups(teacherId);
      const next = [group, ...current.filter((g) => String(g.id) !== String(group.id) && Number(g.id) > 0)];
      localDb.saveGroups(teacherId, next);
      return group;
    }
    throw new Error('Qrup serverə yazıldı, amma ID qayıtmadı.');
  } catch (err) {
    if (err?.isDuplicateGroup) throw err;
    const status = err?.response?.status;
    if (status === 409) throw duplicateGroupError();
    throw err;
  }
}

export async function ensureGroupOnServer(group) {
  if (Number(group?.id) > 0) {
    return { ...group, inviteCode: group.inviteCode || `g${group.id}` };
  }
  return createGroup({
    name: group?.name || group?.number,
    number: group?.number || group?.name,
    schedule: group?.schedule || '',
  });
}

export async function deleteGroup(id) {
  const teacherId = currentTeacherId();
  localDb.hideGroup(teacherId, id);
  const numeric = Number(id);
  if (Number.isFinite(numeric) && numeric > 0) {
    const attempts = [
      () => API.post('/Groups/remove', { id: numeric }, FAST),
      () => API.post('/Groups/delete', { id: numeric }, FAST),
      () => API.post(`/Groups/${id}/delete`, { id: numeric }, FAST),
      () => API.delete(`/Groups/${id}`, FAST),
    ];
    for (const send of attempts) {
      try {
        await send();
        break;
      } catch (err) {
        const status = err?.response?.status;
        if (status && ![401, 403, 404, 405].includes(status)) throw err;
      }
    }
  }
  const next = withoutHiddenGroups(teacherId, localDb.getGroups(teacherId).filter((g) => String(g.id) !== String(id)));
  localDb.saveGroups(teacherId, next);
  return next;
}

export async function fetchGroup(id) {
  try {
    const res = await API.get(`/Groups/${id}`, FAST);
    return mapGroup(unwrapItem(res.data) || res.data);
  } catch (err) {
    const local = localDb.getGroups(currentTeacherId()).find((g) => String(g.id) === String(id));
    if (local) return local;
    throw err;
  }
}

export async function fetchStudents() {
  if (isPractice()) return [];
  const list = await fetchUsersByRole('Student');
  return list.map(mapStudent).filter(Boolean);
}

export async function fetchUserById(id) {
  const res = await API.get(`/Users/${id}`, FAST);
  return mapStudent(unwrapItem(res.data) || res.data);
}

export async function setStudentAccess(id, enabled) {
  const res = await API.patch(`/Users/${id}/access`, { enabled });
  return unwrapItem(res.data) || res.data;
}

export async function updateStudentProfile(id, payload) {
  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    fatherName: payload.fatherName ?? '',
  };
  try {
    const res = await API.patch(`/Users/${id}/profile`, body);
    return mapStudent(unwrapItem(res.data) || res.data);
  } catch (err) {
    const status = err?.response?.status;
    if (status !== 404 && status !== 405) throw err;
    const res = await API.put(`/Users/${id}/profile`, body);
    return mapStudent(unwrapItem(res.data) || res.data);
  }
}

export async function createTeacherAccount(payload) {
  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    fullName: `${payload.firstName || ''} ${payload.lastName || ''}`.trim(),
    email: payload.email,
    phone: payload.phone,
    userName: payload.userName,
    password: payload.password,
    trialEndsAt: payload.trialEndsAt,
    trialStartsAt: payload.trialStartsAt,
    billingPlan: payload.billingPlan,
    trialDays: payload.trialDays,
    trialMessage: wrapTrialMessage(payload.trialMessage, payload.driveFolderUrl),
    aiEnabled: payload.aiEnabled === true,
    AiEnabled: payload.aiEnabled === true,
    driveFolderUrl: driveFolderOpenUrl(payload.driveFolderUrl),
    DriveFolderUrl: driveFolderOpenUrl(payload.driveFolderUrl),
  };
  const compact = {
    firstName: body.firstName,
    lastName: body.lastName,
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    userName: body.userName,
    password: body.password,
    trialEndsAt: body.trialEndsAt,
    trialStartsAt: body.trialStartsAt,
    billingPlan: body.billingPlan,
    trialMessage: body.trialMessage,
    driveFolderUrl: body.driveFolderUrl,
  };
  const paths = ['/Users/teachers', '/Users/create-teacher'];
  let lastError;
  for (const path of paths) {
    for (const data of [body, compact]) {
      try {
        const res = await API.post(path, data);
        const created = unwrapItem(res.data) || res.data;
        const folder = driveFolderOpenUrl(payload.driveFolderUrl);
        if (folder && created?.id) localDb.setTeacherDriveFolder(created.id, folder);
        return created;
      } catch (err) {
        lastError = err;
        const status = err?.response?.status;
        if (status === 400) continue;
        if (status !== 404 && status !== 405) throw err;
        break;
      }
    }
  }
  throw lastError;
}

export async function updateTeacherTrial(id, payload) {
  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    trialStartsAt: payload.trialStartsAt,
    trialEndsAt: payload.trialEndsAt,
    billingPlan: payload.billingPlan,
    trialDays: payload.trialDays,
    trialMessage: wrapTrialMessage(payload.trialMessage, payload.driveFolderUrl),
    aiEnabled: payload.aiEnabled,
    AiEnabled: payload.aiEnabled,
    driveFolderUrl: driveFolderOpenUrl(payload.driveFolderUrl),
    DriveFolderUrl: driveFolderOpenUrl(payload.driveFolderUrl),
  };
  const compact = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    trialStartsAt: payload.trialStartsAt,
    billingPlan: payload.billingPlan,
    trialMessage: wrapTrialMessage(payload.trialMessage, payload.driveFolderUrl),
    driveFolderUrl: driveFolderOpenUrl(payload.driveFolderUrl),
  };
  let lastError;
  for (const data of [body, compact]) {
    try {
      const res = await API.patch(`/Users/${id}/trial`, data);
      const updated = unwrapItem(res.data) || res.data;
      if (payload.aiEnabled != null) localDb.setTeacherAi(id, payload.aiEnabled === true);
      const folder = driveFolderOpenUrl(payload.driveFolderUrl);
      if (payload.driveFolderUrl != null) localDb.setTeacherDriveFolder(id, folder);
      return updated;
    } catch (err) {
      lastError = err;
      if (err?.response?.status !== 400) throw err;
    }
  }
  throw lastError;
}

export async function setTeacherAiEnabled(id, enabled) {
  localDb.setTeacherAi(id, enabled);
  const body = { aiEnabled: enabled, AiEnabled: enabled };
  try {
    const res = await API.patch(`/Users/${id}/trial`, body);
    return unwrapItem(res.data) || res.data || { id, aiEnabled: enabled };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 405 || status === 400) {
      try {
        const res = await API.patch(`/Users/${id}`, body);
        return unwrapItem(res.data) || res.data || { id, aiEnabled: enabled };
      } catch {
        return { id, aiEnabled: enabled };
      }
    }
    throw err;
  }
}

export async function deleteStudentAccount(id) {
  const res = await API.delete(`/Users/${id}`);
  return unwrapItem(res.data) || res.data;
}

export async function createSubject(name) {
  const trimmed = name.trim();
  if (isPractice()) return localDb.addSubject(trimmed);
  try {
    const res = await API.post('/Subjects', { name: trimmed, Name: trimmed }, FAST);
    const item = unwrapItem(res.data) || {};
    const subject = {
      id: item.id ?? item.subjectId ?? Date.now(),
      name: item.name || item.title || trimmed,
    };
    const existing = localDb.getSubjects();
    if (!existing.some((s) => String(s.id) === String(subject.id))) {
      localDb.saveSubjects([...existing, subject]);
    }
    return subject;
  } catch {
    return localDb.addSubject(trimmed);
  }
}

function examOwnerId(exam) {
  if (!exam) return null;
  const tid = exam.teacherId ?? exam.TeacherId;
  return tid == null || tid === '' ? null : tid;
}

function currentUserSnapshot() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return { role: null, scope: null, id: null };
    const user = JSON.parse(raw);
    const role = user.role || user.Role;
    const id = user.id || user.userId || null;
    if (role === 'Admin' || role === 0 || role === '0') return { role: 'Admin', scope: null, id };
    if (role === 'Teacher' || role === 1 || role === '1') {
      return { role: 'Teacher', scope: id || user.teacherId || null, id };
    }
    return { role: 'Student', scope: user.teacherId ?? user.TeacherId ?? null, id };
  } catch {
    return { role: null, scope: null, id: null };
  }
}

function visibleForCurrentUser(exams) {
  const { role, scope, id } = currentUserSnapshot();
  if (role === 'Admin') return exams;
  if (role === 'Teacher') {
    if (scope == null) return [];
    return exams.filter((exam) => String(examOwnerId(exam)) === String(scope));
  }
  const followed = new Set(localDb.followedTeacherIds(id));
  return exams.filter((exam) => {
    const owner = String(examOwnerId(exam) ?? '');
    if (scope != null && owner === String(scope)) return true;
    return examVisibility(exam) === 'public' && followed.has(owner);
  }).map(withExamVisibility);
}

export async function fetchExams() {
  if (isPractice()) return practiceFetchExams();
  let remoteOk = false;
  let remote = [];
  try {
    const data = await tryGet('/Exams');
    remote = unwrapList(data);
    remoteOk = true;
  } catch {
    remote = [];
  }

  // Do not merge the shared localStorage exam cache when the API answered —
  // that cache is per-browser, not per-teacher, and leaked other teachers' exams.
  const source = remoteOk ? remote : localDb.getExams();
  const mergedSource = remoteOk
    ? [...source, ...localDb.getExams().filter((e) => !source.some((r) => String(r.id ?? r.Id) === String(e.id)))]
    : source;
  const list = withCounts(mergedSource.filter((exam) => exam?.id != null).sort((a, b) => {
    const da = new Date(b.createdAt || 0).getTime();
    const db = new Date(a.createdAt || 0).getTime();
    return da - db;
  }));
  return visibleForCurrentUser(list);
}

export async function fetchPublicExamsForTeacher(teacherId) {
  if (!teacherId) return [];
  let remote = [];
  try {
    const data = await tryGet(`/Exams?teacherId=${encodeURIComponent(teacherId)}`);
    remote = unwrapList(data);
  } catch {
    remote = [];
  }
  const local = localDb.getExams().filter((e) => String(examOwnerId(e)) === String(teacherId));
  const map = new Map();
  [...remote, ...local].forEach((exam) => {
    const item = withCounts([exam])[0];
    if (item?.id != null) map.set(String(item.id), withExamVisibility(item));
  });
  return Array.from(map.values()).filter((e) => examVisibility(e) === 'public' && resolveExamStatus(e) !== 'Draft');
}

function currentTeacherScope() {
  return currentUserSnapshot().scope;
}

function toLocalExam(payload, created = {}, source = 'remote') {
  return {
    id: created.id ?? created.examId ?? created.Id ?? uid('exam'),
    title: created.title || created.Title || payload.title,
    subjectId: created.subjectId || created.SubjectId || payload.subjectId,
    subjectName: created.subjectName || created.SubjectName || payload.subjectName,
    totalQuestions: created.totalQuestions || created.TotalQuestions || payload.totalQuestions,
    durationMinutes: created.durationMinutes || created.DurationMinutes || payload.durationMinutes,
    description: created.description || created.Description || payload.description,
    teacherId: created.teacherId ?? created.TeacherId ?? payload.teacherId ?? currentTeacherScope(),
    createdAt: created.createdAt || created.CreatedAt || new Date().toISOString(),
    startTime: created.startTime || created.StartTime || payload.startTime,
    endTime: created.endTime || created.EndTime || payload.endTime,
    submissionsCount: created.submissionsCount || 0,
    isAiGenerated: created.isAiGenerated === true || created.IsAiGenerated === true || payload.isAiGenerated === true,
    pdfFileUrl: created.pdfFileUrl || created.PdfFileUrl || payload.pdfFileUrl || '',
    pdfFilePath: created.pdfFilePath || created.PdfFilePath || payload.pdfFilePath || payload.pdfFileUrl || '',
    visibility: examVisibility({ ...payload, ...created }),
    isPublic: examVisibility({ ...payload, ...created }) === 'public',
    status: resolveExamStatus({
      ...created,
      startTime: created.startTime || created.StartTime || payload.startTime,
      endTime: created.endTime || created.EndTime || payload.endTime,
      status: created.status || created.Status || payload.status || (payload.isDraft ? 'Draft' : 'Live'),
    }),
    source,
  };
}

export async function createExam(payload) {
  if (isPractice()) return practiceCreateExam(payload);
  const bodies = [
    {
      title: payload.title,
      totalQuestions: payload.totalQuestions,
      durationMinutes: payload.durationMinutes,
      teacherId: payload.teacherId,
      subjectId: payload.subjectId,
      subjectName: payload.subjectName,
      startTime: payload.startTime,
      endTime: payload.endTime,
      isDraft: payload.isDraft === true,
      status: payload.status,
      isAiGenerated: payload.isAiGenerated === true,
      pdfFileUrl: payload.pdfFileUrl,
      pdfFilePath: payload.pdfFilePath || payload.pdfFileUrl,
      description: wrapExamDescription(payload.description, payload.pdfFileUrl, payload.visibility),
      isPublic: payload.visibility === 'public' || payload.isPublic === true,
      visibility: payload.visibility || (payload.isPublic ? 'public' : 'private'),
    },
    {
      Title: payload.title,
      Description: payload.description,
      TotalQuestions: payload.totalQuestions,
      DurationMinutes: payload.durationMinutes,
      TeacherId: payload.teacherId,
      SubjectId: payload.subjectId,
      SubjectName: payload.subjectName,
      StartTime: payload.startTime,
      EndTime: payload.endTime,
      IsDraft: payload.isDraft === true,
      Status: payload.status,
      IsAiGenerated: payload.isAiGenerated === true,
      PdfFileUrl: payload.pdfFileUrl,
      PdfFilePath: payload.pdfFilePath || payload.pdfFileUrl,
      Description: wrapExamDescription(payload.description, payload.pdfFileUrl, payload.visibility),
      IsPublic: payload.visibility === 'public' || payload.isPublic === true,
      Visibility: payload.visibility || (payload.isPublic ? 'public' : 'private'),
    },
    {
      name: payload.title,
      Name: payload.title,
      subjectId: payload.subjectId,
      SubjectId: payload.subjectId,
      durationMinutes: payload.durationMinutes,
      questionCount: payload.totalQuestions,
    },
  ];

  for (const body of bodies) {
    try {
      const res = await API.post('/Exams', body, FAST);
      const created = unwrapItem(res.data) || res.data || {};
      const exam = toLocalExam(payload, created, 'remote');
      localDb.upsertExam(exam);
      if (exam.id) localDb.setExamVisibility(exam.id, examVisibility(exam));
      return exam;
    } catch {
      /* try next contract */
    }
  }

  const localExam = toLocalExam(payload, {}, 'local');
  localDb.upsertExam(localExam);
  if (localExam.id) localDb.setExamVisibility(localExam.id, examVisibility(localExam));
  return localExam;
}

export async function updateExam(id, payload) {
  if (isPractice()) return practiceUpdateExam(id, payload);
  const vis = payload.visibility || (payload.isPublic === true ? 'public' : payload.isPublic === false ? 'private' : undefined);
  const description = wrapExamDescription(payload.description, payload.pdfFileUrl || payload.pdfFilePath, vis);
  const body = {
    subjectId: payload.subjectId,
    SubjectId: payload.subjectId,
    title: payload.title,
    Title: payload.title,
    durationMinutes: payload.durationMinutes,
    DurationMinutes: payload.durationMinutes,
    totalQuestions: payload.totalQuestions,
    TotalQuestions: payload.totalQuestions,
    startTime: payload.startTime,
    StartTime: payload.startTime,
    endTime: payload.endTime,
    EndTime: payload.endTime,
    status: payload.status,
    Status: payload.status,
    isDraft: payload.isDraft,
    IsDraft: payload.isDraft,
    description,
    Description: description,
    pdfFileUrl: payload.pdfFileUrl,
    PdfFileUrl: payload.pdfFileUrl,
    pdfFilePath: payload.pdfFilePath || payload.pdfFileUrl,
    PdfFilePath: payload.pdfFilePath || payload.pdfFileUrl,
    isPublic: vis === 'public',
    IsPublic: vis === 'public',
    visibility: vis,
    Visibility: vis,
  };
  try {
    await API.put(`/Exams/${id}`, body, FAST);
  } catch (err) {
    if (err?.response?.status !== 400) throw err;
    const slim = { ...body };
    delete slim.pdfFileUrl;
    delete slim.PdfFileUrl;
    delete slim.pdfFilePath;
    delete slim.PdfFilePath;
    await API.put(`/Exams/${id}`, slim, FAST);
  }
  const visStored = vis || examVisibility({ ...payload, id, description });
  localDb.setExamVisibility(id, visStored);
  localDb.upsertExam({
    id,
    pdfFileUrl: payload.pdfFileUrl,
    pdfFilePath: payload.pdfFilePath || payload.pdfFileUrl,
    description,
    visibility: visStored,
    isPublic: visStored === 'public',
    status: payload.status,
    isDraft: payload.isDraft,
  });
}

export async function deleteExam(id) {
  if (isPractice()) {
    practiceDeleteExam(id);
    return;
  }
  await API.delete(`/Exams/${id}`, FAST);
  const exams = localDb.getExams().filter((e) => String(e.id) !== String(id));
  localDb.saveExams(exams);
}

export async function fetchExam(id) {
  if (isPractice()) return practiceFetchExam(id);
  let remote = null;
  try {
    const data = await tryGet(`/Exams/${id}`);
    remote = unwrapItem(data);
  } catch {
    remote = null;
  }
  const local = localDb.getExams().find((e) => String(e.id) === String(id)) || null;
  const merged = remote && (remote.title || remote.Title) && local
    ? { ...local, ...remote, title: remote.title || remote.Title || local.title }
    : (withCounts([remote || local].filter(Boolean))[0] || local || remote);
  if (!merged) return merged;
  const remoteOk = Boolean(remote && (remote.id || remote.Id || remote.title || remote.Title || remote.pdfFilePath || remote.PdfFilePath));
  if (currentUserSnapshot().role === 'Student' || !remoteOk) {
    const allowed = visibleForCurrentUser([merged]);
    if (!allowed.length) return null;
  }
  return {
    ...merged,
    id: merged.id ?? merged.Id ?? id,
    teacherId: examOwnerId(merged) ?? (remoteOk ? currentTeacherScope() : examOwnerId(merged)),
    subjectId: merged.subjectId ?? merged.SubjectId,
    status: merged.status || merged.Status,
    pdfFilePath: merged.pdfFilePath || merged.PdfFilePath || local?.pdfFilePath || '',
    pdfFileUrl: merged.pdfFileUrl || merged.PdfFileUrl || local?.pdfFileUrl || '',
    description: merged.description || merged.Description || local?.description || '',
    totalQuestions: merged.totalQuestions ?? merged.TotalQuestions ?? merged.questionCount ?? local?.totalQuestions,
    isAiGenerated: merged.isAiGenerated === true || merged.IsAiGenerated === true,
    visibility: examVisibility(merged),
    isPublic: examVisibility(merged) === 'public',
  };
}

export function paperQuestionsOf(list) {
  return (list || []).filter((q) => !isDriveMarkerQuestion(q));
}

export async function fetchQuestions(examId) {
  if (isPractice()) return practiceQuestions(examId);
  const paths = [`/Questions/exam/${examId}`, `/Exams/${examId}/questions`];
  for (const path of paths) {
    try {
      const res = await API.get(path, { timeout: 15000 });
      const list = Array.isArray(res.data) ? res.data : unwrapList(res.data);
      return list.map(normalizeQuestion);
    } catch {
      /* try next */
    }
  }
  return localDb.getQuestions(examId);
}

function normalizeQuestion(q) {
  const type = q.type ?? q.Type;
  const typeName = typeof type === 'number'
    ? ['SingleChoice', 'MultipleChoice', 'OpenEnded'][type] || 'SingleChoice'
    : (type || 'SingleChoice');
  const rawText = q.text || q.questionText || q.title;
  const imageUrl = parseQuestionImage({ ...q, text: rawText });
  return {
    ...q,
    id: q.id ?? q.questionId,
    text: stripQuestionImage(rawText),
    imageUrl,
    type: typeName,
    inputKind: q.inputKind || q.InputKind || (typeName === 'OpenEnded' ? 'Text' : 'Choice'),
    correctText: q.correctText ?? q.CorrectText ?? '',
    difficultyLevel: q.difficultyLevel || q.DifficultyLevel || '',
    points: Number(q.points ?? q.Points ?? pointsForDifficulty(q.difficultyLevel || q.DifficultyLevel)) || 1,
    options: (q.options || q.answers || []).map((opt) => ({
      ...opt,
      id: opt.id ?? opt.optionId,
      optionText: opt.optionText || opt.text,
      text: opt.text || opt.optionText,
    })),
  };
}

export async function addQuestion(examId, payload) {
  if (isPractice()) return practiceAddQuestion(examId, payload);
  const urls = [`/Questions/exam/${examId}`, `/Exams/${examId}/questions`];
  const bodies = [
    payload,
    {
      Text: payload.text,
      Points: payload.points ?? 1,
      Type: payload.type ?? 0,
      InputKind: payload.inputKind,
      CorrectText: payload.correctText,
      DifficultyLevel: payload.difficultyLevel,
      Options: payload.options,
      ImageUrl: payload.imageUrl || payload.ImageUrl || null,
      Image: payload.imageUrl || payload.Image || null,
    },
  ];

  let lastError;
  for (const url of urls) {
    for (const body of bodies) {
      try {
        await API.post(url, body, { timeout: 15000 });
        const list = await fetchQuestions(examId);
        if (list.length) return list[list.length - 1];
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error('Sual serverə yazılmadı.');
}

export async function ensurePaperQuestions(examId, count) {
  const existing = await fetchQuestions(examId);
  const paper = paperQuestionsOf(existing);
  if (paper.length) return existing;
  const n = Math.min(Math.max(Number(count) || 20, 1), 80);
  const urls = [`/Questions/exam/${examId}`, `/Exams/${examId}/questions`];
  for (let i = 1; i <= n; i += 1) {
    const payload = {
      text: `Sual ${i}`,
      points: 1,
      type: 'SingleChoice',
      inputKind: 'Choice',
      options: [
        { optionText: 'A', isCorrect: false },
        { optionText: 'B', isCorrect: false },
        { optionText: 'C', isCorrect: false },
        { optionText: 'D', isCorrect: false },
        { optionText: 'E', isCorrect: false },
        { optionText: 'Açıq', isCorrect: false },
      ],
    };
    const bodies = [
      payload,
      {
        Text: payload.text,
        Points: 1,
        Type: 0,
        InputKind: 'Choice',
        Options: payload.options,
      },
    ];
    let ok = false;
    for (const url of urls) {
      for (const body of bodies) {
        try {
          await API.post(url, body, { timeout: 15000 });
          ok = true;
          break;
        } catch {
          /* next contract */
        }
      }
      if (ok) break;
    }
  }
  return fetchQuestions(examId);
}

export async function saveDriveFileMarker(examId, fileId) {
  const id = String(fileId || '').trim();
  if (!examId || !id) return;
  const text = `__DRIVE__ DRVFILE:${id}`;
  const list = await fetchQuestions(examId);
  const marker = list.find(isDriveMarkerQuestion);
  if (marker?.id) {
    try {
      await updateQuestion(examId, marker.id, {
        text,
        points: 0,
        type: 'OpenEnded',
        inputKind: 'Text',
        options: [],
        correctText: '',
      });
      return;
    } catch {
      /* add a new marker */
    }
  }
  await addQuestion(examId, {
    text,
    points: 0,
    type: 'OpenEnded',
    inputKind: 'Text',
    options: [],
    correctText: '',
  });
}

export async function updateQuestion(examId, questionId, payload) {
  if (isPractice()) {
    const list = practiceQuestions(examId).map((q) => (
      String(q.id) === String(questionId) ? { ...q, ...payload, id: q.id } : q
    ));
    savePracticeQuestions(examId, list);
    return list.find((q) => String(q.id) === String(questionId));
  }
  const urls = [
    `/Questions/${questionId}`,
    `/Exams/${examId}/questions/${questionId}`,
    `/Questions/exam/${examId}/${questionId}`,
  ];
  const bodies = [
    payload,
    {
      Text: payload.text,
      Points: payload.points ?? 1,
      Type: payload.type ?? 'SingleChoice',
      InputKind: payload.inputKind,
      CorrectText: payload.correctText,
      DifficultyLevel: payload.difficultyLevel,
      Options: payload.options,
      ImageUrl: payload.imageUrl || payload.ImageUrl || null,
      Image: payload.imageUrl || payload.Image || null,
    },
  ];
  let lastError;
  for (const url of urls) {
    for (const method of ['put', 'patch']) {
      for (const body of bodies) {
        try {
          await API[method](url, body, { timeout: 15000 });
          return (await fetchQuestions(examId)).find((q) => String(q.id) === String(questionId));
        } catch (err) {
          lastError = err;
        }
      }
    }
  }
  throw lastError || new Error('Sual yenilənmədi.');
}

export async function extractDrivePdfText(fileId) {
  if (isPractice()) throw new Error('Məşq rejimində Drive AI yoxdur. Real hesabla daxil olun.');
  const id = String(fileId || '').trim();
  if (!id) throw new Error('Drive fayl linki yoxdur.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  const res = await fetch(`/drive-extract?id=${encodeURIComponent(id)}`, { signal: ctrl.signal }).finally(() => {
    clearTimeout(timer);
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || 'Drive PDF oxunmadı.');
  const text = String(data.text || '').trim();
  if (text.length < 40) throw new Error('PDF-dən mətn çıxmadı. Mətnli PDF lazımdır.');
  return text;
}

const pdfBytesCache = new Map();

export async function fetchExamPdfBytes(exam) {
  if (isPractice()) return null;
  const examId = exam?.id ?? exam?.Id;
  const cacheKey = examId != null ? `id:${examId}` : `path:${examPdfUrl(exam)}`;
  const cached = pdfBytesCache.get(cacheKey);
  if (cached) return cached;

  const path = examPdfUrl(exam);
  const token = localStorage.getItem('token');
  let notFound = false;

  const asBuffer = async (res) => {
    if (!res) return null;
    if (res.data instanceof ArrayBuffer) return res.data;
    if (res.data instanceof Blob) return res.data.arrayBuffer();
    return res.data;
  };

  if (examId) {
    try {
      const res = await API.get(`/Exams/${examId}/pdf`, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: { Accept: 'application/pdf' },
      });
      const buf = await asBuffer(res);
      if (isPdfBuffer(buf)) {
        pdfBytesCache.set(cacheKey, buf);
        return buf;
      }
    } catch (err) {
      if (err?.response?.status === 404) notFound = true;
    }
  }

  const urls = [];
  const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '');
  const origin = String(apiBase).replace(/\/api\/?$/, '');
  if (path.startsWith('/uploads') && origin && origin.startsWith('http')) {
    urls.push(`${origin}${path}`);
  } else if (/^https?:\/\//i.test(path)) {
    urls.push(path);
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (isPdfBuffer(buf)) {
        pdfBytesCache.set(cacheKey, buf);
        return buf;
      }
    } catch {
      /* next */
    }
  }

  const err = new Error('PDF tapılmadı');
  err.response = { status: notFound ? 404 : 0 };
  throw err;
}

function isPdfBuffer(buf) {
  if (!buf) return false;
  const bytes = new Uint8Array(buf);
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function authHeaders() {
  const token = localStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}`, 'X-Access-Token': token };
}

export async function tryGradeAiQuestions(questions, { soft = true } = {}) {
  if (isPractice()) return null;
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) return null;
  const body = {
    questions: list.map((q) => ({
      text: q.text,
      options: unwrapOptions(q.options).map((o, idx) => ({
        letter: o.letter || ['A', 'B', 'C', 'D', 'E'][idx],
        text: o.text || o.optionText,
        isCorrect: Boolean(o.isCorrect),
      })),
      correctLetter: q.correctLetter || 'A',
      correctText: q.correctText || null,
      difficultyLevel: q.difficultyLevel || 'orta',
    })),
  };
  try {
    const res = await API.post('/Ai/answers', body, {
      timeout: 120000,
      headers: authHeaders(),
    });
    const data = unwrapItem(res.data) || res.data || {};
    const answers = unwrapList(data.answers || data);
    if (!answers.length) return null;
    return answers.map((a) => ({
      index: Number(a.index ?? a.Index) || 0,
      correctLetter: String(a.correctLetter || a.answer || 'A').toUpperCase(),
      correctText: a.correctText || a.openAnswer || '',
      difficultyLevel: a.difficultyLevel || a.difficulty || 'orta',
    }));
  } catch (err) {
    const status = err?.response?.status;
    if (!status || status === 404) return null;
    if (soft && status === 405) return null;
    throw err;
  }
}

export function applyAiAnswers(questions, answers) {
  const list = Array.isArray(questions) ? questions : [];
  const grades = Array.isArray(answers) ? answers : [];
  if (!list.length || !grades.length) return list;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return list.map((q, i) => {
    const grade = grades.find((a) => Number(a.index) === i + 1) || grades[i];
    const letter = String(grade?.correctLetter || '').toUpperCase();
    if (!['A', 'B', 'C', 'D', 'E', 'OPEN'].includes(letter)) return q;
    return {
      ...q,
      correctLetter: letter,
      correctText: letter === 'OPEN' ? String(grade.correctText || q.correctText || '').trim() : '',
      difficultyLevel: grade.difficultyLevel || q.difficultyLevel || 'orta',
      options: letters.map((L) => {
        const found = unwrapOptions(q.options).find((o) => o.letter === L);
        return { letter: L, text: found?.text || L, isCorrect: L === letter };
      }),
    };
  });
}

export async function tryGenerateAiQuestions(payload, { soft = false } = {}) {
  if (isPractice()) {
    if (soft) return null;
    throw new Error('Məşq rejimində AI yoxdur. Real hesabla daxil olun.');
  }
  const body = {
    title: payload.title,
    topic: payload.topic,
    subjectName: payload.subjectName,
    brief: String(payload.brief || '').slice(0, 24000),
    questionCount: payload.questionCount,
    easy: payload.easy,
    medium: payload.medium,
    hard: payload.hard,
    source: payload.source,
  };
  try {
    const res = await API.post('/Ai/questions', body, { timeout: 90000 });
    const data = unwrapItem(res.data) || res.data || {};
    const list = unwrapList(data.questions || data);
    if (!list.length) return null;
    return list.map((q) => ({
      text: q.text || q.questionText || q.stem,
      options: unwrapOptions(q.options).map((o, idx) => ({
        letter: o.letter || ['A', 'B', 'C', 'D', 'E'][idx],
        text: o.text || o.optionText,
        isCorrect: Boolean(o.isCorrect),
      })),
      correctLetter: q.correctLetter
        || unwrapOptions(q.options).find((o) => o.isCorrect)?.letter
        || 'A',
      difficultyLevel: q.difficultyLevel || q.difficulty || 'orta',
    }));
  } catch (err) {
    const status = err?.response?.status;
    if (!status || status === 404 || (soft && [401, 403, 405, 502, 503].includes(status))) return null;
    throw err;
  }
}

export async function uploadExamPdfPack(examId, file, questionCount) {
  const form = new FormData();
  form.append('file', file, file.name || 'exam.pdf');
  form.append('questionCount', String(questionCount));
  const paths = [`/Exams/${examId}/pdf-pack`, `/Exams/${examId}/upload-pdf`];
  let lastError;
  for (const path of paths) {
    try {
      const res = await API.post(path, form, {
        timeout: 120000,
      });
      return unwrapItem(res.data) || res.data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('PDF yüklənmədi.');
}

export async function saveAnswerKey(examId, answers) {
  if (isPractice()) {
    const list = practiceQuestions(examId);
    savePracticeQuestions(examId, list);
    return list;
  }
  const res = await API.put(`/Questions/exam/${examId}/answer-key`, { answers }, { timeout: 15000 });
  const list = Array.isArray(res.data) ? res.data : unwrapList(res.data);
  return list.map(normalizeQuestion);
}

export async function fetchQuestionDifficulty(examId) {
  if (isPractice()) return [];
  try {
    const res = await API.get(`/Questions/exam/${examId}/difficulty`, { timeout: 8000 });
    return unwrapList(res.data);
  } catch {
    return [];
  }
}

export async function fetchExamSubmissions(examId) {
  if (isPractice()) {
    return practiceSubmissions().filter((s) => String(s.examId) === String(examId));
  }
  try {
    const data = await API.get(`/Submissions/exam/${examId}`, { timeout: 8000 }).then((r) => r.data);
    const list = unwrapList(data);
    if (list.length || Array.isArray(data)) return list;
  } catch {
    /* local */
  }
  return localDb.getSubmissions().filter((s) => String(s.examId) === String(examId));
}

export async function fetchWeeklyRankingSource() {
  if (isPractice()) return practiceWeeklyRankingSource();
  const exams = (await fetchExams()).filter((exam) => resolveExamStatus(exam) !== 'Draft');
  let students = [];
  try {
    students = (await fetchStudents()).filter(Boolean);
  } catch {
    students = [];
  }
  const lists = [];
  const chunk = 6;
  for (let i = 0; i < exams.length; i += chunk) {
    const part = exams.slice(i, i + chunk);
    lists.push(
      ...(await Promise.all(part.map((exam) => fetchExamSubmissions(exam.id).catch(() => [])))),
    );
  }
  const submissions = lists.flat().map(normalizeSubmission).filter(Boolean);
  return { exams, students, submissions };
}

export async function fetchExamReview(studentExamId) {
  if (isPractice()) return practiceFindReview(studentExamId);
  const res = await API.get(`/Submissions/review/${studentExamId}`, { timeout: 8000 });
  return unwrapItem(res.data) || res.data;
}

export async function fetchExamReviewByExam(examId) {
  if (isPractice()) return practiceFindReview(examId);
  const res = await API.get(`/Submissions/exam/${examId}/review`, { timeout: 8000 });
  return unwrapItem(res.data) || res.data;
}

export async function fetchUsersByRole(role = 'Student') {
  if (isPractice()) return [];
  const res = await API.get('/Users', { params: { role, includeDeleted: false }, timeout: 8000 });
  return unwrapList(res.data);
}

export async function fetchTeacherDirectory() {
  if (isPractice()) return [];
  const fromLocal = localDb.getPublicTeachers();
  let remote = [];
  try {
    remote = (await fetchUsersByRole('Teacher')).map(mapStudent).filter(Boolean);
  } catch {
    remote = [];
  }
  const map = new Map();
  [...fromLocal, ...remote].forEach((t) => {
    const id = t?.id;
    if (id == null) return;
    map.set(String(id), {
      id,
      fullName: t.fullName || t.email || `Müəllim #${id}`,
      position: t.position || t.Position || 'Digər',
      email: t.email,
    });
  });
  return Array.from(map.values()).sort((a, b) =>
    String(a.position).localeCompare(String(b.position), 'az') || String(a.fullName).localeCompare(String(b.fullName), 'az'),
  );
}

export async function fetchStudentHistoryById(studentId) {
  if (!studentId) return [];
  const res = await API.get(`/Submissions/history/${studentId}`, { timeout: 8000 });
  return unwrapList(res.data).map(normalizeSubmission);
}

export async function fetchStudentHistory(studentId) {
  if (isPractice()) {
    return practiceSubmissions().filter((s) => !studentId || String(s.studentId) === String(studentId));
  }
  const remote = [];
  try {
    const res = await API.get('/Submissions/history/me', { timeout: 8000 });
    remote.push(...unwrapList(res.data).map(normalizeSubmission));
  } catch {
    if (studentId) {
      try {
        const res = await API.get(`/Submissions/history/${studentId}`, { timeout: 8000 });
        remote.push(...unwrapList(res.data).map(normalizeSubmission));
      } catch {
        /* local */
      }
    }
  }

  const local = localDb.getSubmissions()
    .filter((s) => !studentId || String(s.studentId) === String(studentId))
    .map(normalizeSubmission);

  const map = new Map();
  [...remote, ...local].forEach((item) => {
    const key = String(item.studentExamId || item.id || item.examId);
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

export async function saveExamProgress(payload) {
  if (isPractice()) return;
  if (!payload?.studentExamId) return;
  await API.post('/Submissions/progress', {
    studentExamId: Number(payload.studentExamId) || 0,
    examId: payload.examId,
    studentId: payload.studentId,
    answers: payload.answers || [],
  }, { timeout: 8000 });
}

export async function startExam({ examId, studentId }) {
  if (isPractice()) return practiceStartExam(examId);
  const res = await API.post('/Submissions', { examId, studentId }, { timeout: 25000 });
  return unwrapItem(res.data) || res.data;
}

export async function submitExam(payload) {
  if (isPractice()) return practiceSubmitExam(payload);
  try {
    const res = await API.post('/Submissions/submit', {
      studentExamId: payload.studentExamId || 0,
      examId: payload.examId,
      studentId: payload.studentId,
      answers: payload.answers || [],
    }, { timeout: 15000 });
    const created = unwrapItem(res.data) || res.data;
    const normalized = normalizeSubmission({
      ...created,
      examId: created.examId || payload.examId,
      studentId: created.studentId || payload.studentId,
      studentName: created.studentName || payload.studentName,
    });
    localDb.addSubmission(normalized);
    return normalized;
  } catch {
    const questions = localDb.getQuestions(payload.examId);
    let correct = 0;
    payload.answers.forEach((a) => {
      const q = questions.find((x) => String(x.id) === String(a.questionId));
      const opt = q?.options?.find((o) => String(o.id) === String(a.selectedOptionId));
      const openPick = isOpenChoiceOption(opt);
      const text = String(a.textAnswer || '').trim().toLowerCase();
      const expected = String(q?.correctText || '').trim().toLowerCase();
      if (openPick) {
        if (text && expected && text === expected) correct += 1;
      } else if (opt?.isCorrect) {
        correct += 1;
      }
    });
    const total = questions.length || payload.answers.length || 1;
    const exam = localDb.getExams().find((e) => String(e.id) === String(payload.examId));
    const submission = {
      id: payload.studentExamId || uid('sub'),
      studentExamId: payload.studentExamId,
      examId: payload.examId,
      examTitle: exam?.title,
      studentId: payload.studentId,
      studentName: payload.studentName,
      score: percent(correct, total),
      percent: percent(correct, total),
      correctAnswersCount: correct,
      totalQuestions: total,
      submittedAt: new Date().toISOString(),
      answers: payload.answers,
    };
    localDb.addSubmission(submission);
    return submission;
  }
}

function normalizeSubmission(item) {
  if (!item || typeof item !== 'object') return item;
  const id = item.id ?? item.studentExamId;
  const total = item.totalQuestions || 1;
  const correct = item.correctAnswersCount ?? 0;
  const percentValue = item.percent ?? item.score ?? percent(correct, total);
  const durationSeconds = item.durationSeconds
    ?? (item.startedAt && item.submittedAt
      ? Math.max(0, Math.round((new Date(item.submittedAt) - new Date(item.startedAt)) / 1000))
      : 0);
  return {
    ...item,
    id,
    studentExamId: item.studentExamId ?? item.id,
    score: percentValue,
    percent: Number(percentValue) || 0,
    durationSeconds,
  };
}

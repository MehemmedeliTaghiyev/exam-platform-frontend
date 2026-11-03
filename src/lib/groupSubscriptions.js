import { localDb } from './localDb';

const SUBS_KEY = 'group_subscriptions';
const CATALOG_KEY = 'group_catalog';
const MEMBERS_KEY = 'group_subscribers';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(`exampulse_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(`exampulse_${key}`, JSON.stringify(value));
}

export function groupKeyOf(group) {
  const id = group?.groupId ?? group?.id;
  if (id != null && id !== '') return `id:${id}`;
  const code = String(group?.inviteCode || '').trim().toLowerCase();
  if (code) return `code:${code}`;
  const name = String(group?.groupName || group?.name || group?.number || '').trim().toLowerCase();
  const teacherId = group?.teacherId ?? '';
  if (name) return `name:${teacherId}:${name}`;
  return '';
}

export function listCatalogGroups() {
  const list = read(CATALOG_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function publishGroupCatalog(group) {
  const key = groupKeyOf(group);
  if (!key) return null;
  const row = {
    key,
    groupId: group.groupId ?? group.id ?? null,
    groupName: String(group.groupName || group.name || group.number || 'Qrup').trim(),
    teacherId: group.teacherId ?? null,
    teacherName: String(group.teacherName || '').trim(),
    teachingSubject: String(group.teachingSubject || group.subject || '').trim(),
    inviteCode: String(group.inviteCode || '').trim(),
    updatedAt: new Date().toISOString(),
  };
  const list = listCatalogGroups().filter((item) => item.key !== key);
  list.unshift(row);
  write(CATALOG_KEY, list.slice(0, 200));
  return row;
}

export function trendingGroups({ limit = 12, excludeKeys = [] } = {}) {
  const skip = new Set((excludeKeys || []).map(String));
  return listCatalogGroups()
    .map((item) => ({
      ...item,
      followers: groupSubscriberCount(item),
    }))
    .filter((item) => item.key && !skip.has(item.key))
    .sort((a, b) => {
      if (b.followers !== a.followers) return b.followers - a.followers;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    })
    .slice(0, limit);
}

export function findCatalogGroup(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  return listCatalogGroups().find((item) => (
    String(item.inviteCode || '').toLowerCase() === q
    || String(item.groupId || '') === q
    || item.key === q
    || item.key === `code:${q}`
    || item.key === `id:${q}`
    || String(item.groupName || '').toLowerCase() === q
  )) || null;
}

export function studentSubscriptions(studentId) {
  const map = read(SUBS_KEY, {});
  const list = map[String(studentId || '')] || [];
  return Array.isArray(list) ? list : [];
}

export function isSubscribedToGroup(studentId, group) {
  const key = groupKeyOf(group);
  if (!key) return false;
  return studentSubscriptions(studentId).some((item) => item.key === key);
}

export function subscribedTeacherIds(studentId) {
  return [...new Set(
    studentSubscriptions(studentId)
      .map((item) => item.teacherId)
      .filter((id) => id != null && id !== '')
      .map(String),
  )];
}

export function groupSubscriberCount(group) {
  const key = groupKeyOf(group);
  if (!key) return 0;
  const map = read(MEMBERS_KEY, {});
  const list = map[key] || [];
  return Array.isArray(list) ? list.length : 0;
}

export function groupSubscribers(group) {
  const key = groupKeyOf(group);
  if (!key) return [];
  const map = read(MEMBERS_KEY, {});
  const list = map[key] || [];
  return Array.isArray(list) ? list : [];
}

function rememberMember(group, student) {
  const key = groupKeyOf(group);
  if (!key || !student?.id) return;
  const map = read(MEMBERS_KEY, {});
  const list = Array.isArray(map[key]) ? map[key] : [];
  const next = list.filter((row) => String(row.studentId) !== String(student.id));
  next.unshift({
    studentId: String(student.id),
    fullName: student.fullName || student.email || `Tələbə #${student.id}`,
    at: new Date().toISOString(),
  });
  map[key] = next.slice(0, 500);
  write(MEMBERS_KEY, map);
}

function forgetMember(group, studentId) {
  const key = groupKeyOf(group);
  if (!key || !studentId) return;
  const map = read(MEMBERS_KEY, {});
  map[key] = (Array.isArray(map[key]) ? map[key] : []).filter((row) => String(row.studentId) !== String(studentId));
  write(MEMBERS_KEY, map);
}

export function subscribeToGroup(student, group) {
  if (!student?.id) return null;
  const published = publishGroupCatalog(group);
  const key = published?.key || groupKeyOf(group);
  if (!key) return null;
  const row = {
    key,
    groupId: published?.groupId ?? group.groupId ?? group.id ?? null,
    groupName: published?.groupName || String(group.groupName || group.name || group.number || 'Qrup').trim(),
    teacherId: published?.teacherId ?? group.teacherId ?? null,
    teacherName: published?.teacherName || String(group.teacherName || '').trim(),
    inviteCode: published?.inviteCode || String(group.inviteCode || '').trim(),
    at: new Date().toISOString(),
  };
  const map = read(SUBS_KEY, {});
  const sid = String(student.id);
  const list = Array.isArray(map[sid]) ? map[sid] : [];
  map[sid] = [row, ...list.filter((item) => item.key !== key)].slice(0, 100);
  write(SUBS_KEY, map);
  rememberMember(row, student);
  if (row.teacherId) localDb.followTeacher(student.id, row.teacherId);
  return row;
}

export function unsubscribeFromGroup(studentId, group) {
  const key = groupKeyOf(typeof group === 'string' ? { inviteCode: group, groupId: group } : group)
    || (typeof group === 'object' ? group?.key : '');
  if (!studentId || !key) return false;
  const map = read(SUBS_KEY, {});
  const sid = String(studentId);
  const list = Array.isArray(map[sid]) ? map[sid] : [];
  const target = list.find((item) => item.key === key) || group;
  map[sid] = list.filter((item) => item.key !== key);
  write(SUBS_KEY, map);
  forgetMember(target, studentId);
  return true;
}

export function ensurePrimarySubscription(user) {
  if (!user?.id || (user.role !== 'Student' && !user.practice)) return null;
  const groupId = user.groupId ?? user.GroupId;
  const groupName = user.groupName || user.GroupName;
  if (groupId == null && !groupName) return null;
  return subscribeToGroup(user, {
    groupId,
    groupName,
    teacherId: user.teacherId ?? user.TeacherId,
    teacherName: '',
    inviteCode: groupId != null ? `g${groupId}` : '',
  });
}

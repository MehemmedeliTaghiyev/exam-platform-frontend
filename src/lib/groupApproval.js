import { isPublicGroupName } from './publicGroup';

const MARK = /\[\[APPR:(0|1)\]\]/;

export function stripApprovalMark(schedule) {
  return String(schedule || '').replace(/\n?\[\[APPR:[01]\]\]/g, '').trimEnd();
}

export function withApprovalMark(schedule, approvalRequired) {
  const clean = stripApprovalMark(schedule);
  const mark = approvalRequired ? '[[APPR:1]]' : '[[APPR:0]]';
  return clean ? `${clean}\n${mark}` : mark;
}

export function groupNeedsApproval(group) {
  if (!group) return true;
  if (isPublicGroupName(group.name) || isPublicGroupName(group.number)) return false;
  if (group.approvalRequired === false) return false;
  if (group.approvalRequired === true) return true;
  const raw = String(group.schedule || '');
  const match = raw.match(MARK);
  if (match) return match[1] === '1';
  return true;
}

export function studentMatchesGroup(student, group) {
  if (!student || !group) return false;
  if (student.groupId != null && group.id != null && String(student.groupId) === String(group.id)) return true;
  const keys = [group.number, group.name].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  const name = String(student.groupName || '').trim().toLowerCase();
  return Boolean(name && keys.includes(name));
}

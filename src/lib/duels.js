import { localDb } from './localDb';

function groupKey(user) {
  if (user?.groupId != null && user.groupId !== '') return `id:${user.groupId}`;
  const name = String(user?.groupName || '').trim().toLowerCase();
  return name ? `name:${name}` : '';
}

export function listDuels(user) {
  const key = groupKey(user);
  const id = String(user?.id || '');
  if (!key || !id) return [];
  return localDb.getDuels()
    .filter((duel) => duel.groupKey === key && (String(duel.fromId) === id || String(duel.toId) === id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function sendDuel(from, to) {
  const key = groupKey(from);
  if (!key || !from?.id || !to?.id) throw new Error('Eyni qrupdan şagird seçin.');
  if (String(from.id) === String(to.id)) throw new Error('Özünüzə duello göndərmək olmaz.');
  const list = localDb.getDuels();
  const open = list.some((duel) => (
    duel.groupKey === key
    && duel.status === 'pending'
    && String(duel.fromId) === String(from.id)
    && String(duel.toId) === String(to.id)
  ));
  if (open) throw new Error('Bu şagirdə artıq gözləyən duello var.');
  const duel = {
    id: `duel-${Date.now()}`,
    groupKey: key,
    fromId: String(from.id),
    fromName: from.fullName || from.email || 'Şagird',
    toId: String(to.id),
    toName: to.fullName || to.email || 'Şagird',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  list.unshift(duel);
  localDb.saveDuels(list);
  return duel;
}

export function answerDuel(id, status) {
  const list = localDb.getDuels().map((duel) => (
    String(duel.id) === String(id) && duel.status === 'pending'
      ? { ...duel, status, answeredAt: new Date().toISOString() }
      : duel
  ));
  localDb.saveDuels(list);
  return list.find((duel) => String(duel.id) === String(id)) || null;
}

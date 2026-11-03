import { localDb } from './localDb';
import { isPractice } from './practice';
import { fetchDuelLookup, fetchMyDuels, patchDuel, postDuel } from './examApi';
import { normalizeDuelCode, practiceStudentByCode, studentDuelCode } from './studentCode';

function apiMessage(err, fallback) {
  return err?.response?.data?.message || err?.response?.data?.Message || err?.message || fallback;
}

function mapDuel(row) {
  if (!row) return null;
  return {
    id: row.id ?? row.Id,
    fromId: String(row.fromId ?? row.FromId ?? ''),
    fromName: row.fromName || row.FromName || 'Şagird',
    toId: String(row.toId ?? row.ToId ?? ''),
    toName: row.toName || row.ToName || 'Şagird',
    status: String(row.status || row.Status || 'pending').toLowerCase(),
    createdAt: row.createdAt || row.CreatedAt || new Date().toISOString(),
    answeredAt: row.answeredAt || row.AnsweredAt || null,
  };
}

function remember(duel) {
  const mapped = mapDuel(duel);
  if (!mapped?.id) return mapped;
  const list = localDb.getDuels();
  const index = list.findIndex((item) => String(item.id) === String(mapped.id));
  if (index >= 0) list[index] = { ...list[index], ...mapped };
  else list.unshift(mapped);
  localDb.saveDuels(list);
  return mapped;
}

export async function lookupDuelStudent(code, me) {
  const normalized = normalizeDuelCode(code);
  if (!normalized) throw new Error('Abituriyent kodunu yazın.');
  const mine = studentDuelCode(me);
  if (mine && mine === normalized) throw new Error('Öz kodunuza duello göndərmək olmaz.');
  const practice = practiceStudentByCode(normalized);
  if (practice) {
    if (String(practice.id) === String(me?.id)) throw new Error('Öz kodunuza duello göndərmək olmaz.');
    return { id: practice.id, fullName: practice.fullName, duelCode: practice.code };
  }
  if (isPractice()) throw new Error('Bu kodla şagird tapılmadı.');
  try {
    const found = await fetchDuelLookup(normalized);
    if (!found?.id) throw new Error('Bu kodla şagird tapılmadı.');
    if (String(found.id) === String(me?.id)) throw new Error('Öz kodunuza duello göndərmək olmaz.');
    return found;
  } catch (err) {
    throw new Error(apiMessage(err, 'Bu kodla şagird tapılmadı.'));
  }
}

export async function listDuels(user) {
  const id = String(user?.id || '');
  if (!id) return [];
  let remote = [];
  if (!isPractice()) {
    try {
      remote = (await fetchMyDuels()).map(mapDuel).filter(Boolean);
    } catch {
      remote = [];
    }
  }
  const local = localDb.getDuels()
    .map(mapDuel)
    .filter((duel) => duel && (String(duel.fromId) === id || String(duel.toId) === id));
  const map = new Map();
  [...remote, ...local].forEach((duel) => map.set(String(duel.id), duel));
  return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function sendDuel(from, to) {
  if (!from?.id || !to?.id) throw new Error('Şagird kodunu yazın.');
  if (String(from.id) === String(to.id)) throw new Error('Özünüzə duello göndərmək olmaz.');
  if (!isPractice()) {
    try {
      const created = await postDuel({
        toId: Number.isFinite(Number(to.id)) ? Number(to.id) : undefined,
        code: to.duelCode || studentDuelCode(to),
      });
      if (created) return remember(created);
    } catch (err) {
      if (err?.response?.status && err.response.status !== 404) {
        throw new Error(apiMessage(err, 'Duello göndərilmədi.'));
      }
    }
  }
  const list = localDb.getDuels();
  const open = list.some((duel) => (
    duel.status === 'pending'
    && String(duel.fromId) === String(from.id)
    && String(duel.toId) === String(to.id)
  ));
  if (open) throw new Error('Bu şagirdə artıq gözləyən duello var.');
  const duel = {
    id: `duel-${Date.now()}`,
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

export async function sendDuelByCode(from, code) {
  const to = await lookupDuelStudent(code, from);
  return sendDuel(from, to);
}

export async function answerDuel(id, status) {
  if (!isPractice() && !String(id).startsWith('duel-')) {
    try {
      const updated = await patchDuel(id, status);
      if (updated) return remember(updated);
    } catch (err) {
      if (err?.response?.status && err.response.status !== 404) {
        throw new Error(apiMessage(err, 'Cavab göndərilmədi.'));
      }
    }
  }
  const list = localDb.getDuels().map((duel) => (
    String(duel.id) === String(id) && duel.status === 'pending'
      ? { ...duel, status, answeredAt: new Date().toISOString() }
      : duel
  ));
  localDb.saveDuels(list);
  return list.find((duel) => String(duel.id) === String(id)) || null;
}

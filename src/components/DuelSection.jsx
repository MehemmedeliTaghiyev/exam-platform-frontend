import { useEffect, useState } from 'react';
import { Button, Card, Select } from './ui';
import { fetchGroupmates, fetchOwnProfile } from '../lib/examApi';
import { answerDuel, listDuels, sendDuel } from '../lib/duels';

function statusLabel(status) {
  if (status === 'accepted') return 'Qəbul olundu';
  if (status === 'declined') return 'Rədd olundu';
  return 'Gözləyir';
}

export default function DuelSection({ user }) {
  const [profile, setProfile] = useState(user);
  const [mates, setMates] = useState([]);
  const [duels, setDuels] = useState([]);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');

  const refresh = (person) => {
    setDuels(listDuels(person));
  };

  useEffect(() => {
    let live = true;
    (async () => {
      let person = user;
      if (user && !user.practice && !user.groupName && user.groupId == null) {
        try {
          const me = await fetchOwnProfile();
          person = { ...user, groupName: me.groupName || me.GroupName || '', groupId: me.groupId ?? me.GroupId ?? null };
        } catch {
          person = user;
        }
      }
      const peers = await fetchGroupmates(person);
      if (!live) return;
      setProfile(person);
      setMates(peers);
      setTarget(peers[0] ? String(peers[0].id) : '');
      refresh(person);
    })();
    return () => {
      live = false;
    };
  }, [user]);

  const send = () => {
    const mate = mates.find((item) => String(item.id) === String(target));
    if (!mate) {
      setError('Eyni qrupdan şagird seçin.');
      return;
    }
    try {
      sendDuel(profile, mate);
      setError('');
      refresh(profile);
    } catch (err) {
      setError(err.message || 'Duello göndərilmədi.');
    }
  };

  const answer = (id, status) => {
    answerDuel(id, status);
    refresh(profile);
  };

  const mine = String(profile?.id || '');
  const incoming = duels.filter((duel) => String(duel.toId) === mine);
  const outgoing = duels.filter((duel) => String(duel.fromId) === mine);

  return (
    <div className="duel-board mb-10">
      <h2 className="mb-2 text-lg font-extrabold">Sinif yoldaşlarına meydan oxu! ⚔️</h2>
      <p className="mb-4 text-sm text-[#5c564e]">Eyni qrupda olduğun şagirdlərə duello dəvəti göndərərək biliklərini yarışdıra bilərsən. Göndərdiyin dəvətlərin vəziyyətini şəxsi kabinetindən izlə.</p>
      <Card className="duel-board-card">
        {mates.length === 0 ? (
          <p className="text-sm text-[#5c564e]">(Hazırda qrupunda aktiv başqa şagird tapılmadı).</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Select label="Qrup yoldaşı" value={target} onChange={(e) => setTarget(e.target.value)}>
                {mates.map((mate) => (
                  <option key={mate.id} value={mate.id}>{mate.fullName || mate.email}</option>
                ))}
              </Select>
            </div>
            <Button onClick={send}>Duello göndər</Button>
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Gələn</p>
            {incoming.length === 0 ? <p className="mt-2 text-sm text-gray-500">Gələn duello yoxdur.</p> : (
              <ul className="mt-2 space-y-2">
                {incoming.map((duel) => (
                  <li key={duel.id} className="rounded-xl border border-gray-200 px-3 py-3 text-sm dark:border-slate-700">
                    <p className="font-medium">{duel.fromName}</p>
                    <p className="text-gray-500">{statusLabel(duel.status)}</p>
                    {duel.status === 'pending' ? (
                      <div className="mt-2 flex gap-2">
                        <Button onClick={() => answer(duel.id, 'accepted')}>Qəbul et</Button>
                        <Button variant="secondary" onClick={() => answer(duel.id, 'declined')}>Rədd et</Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">Göndərilən</p>
            {outgoing.length === 0 ? <p className="mt-2 text-sm text-gray-500">Hələ duello göndərməmisiniz.</p> : (
              <ul className="mt-2 space-y-2">
                {outgoing.map((duel) => (
                  <li key={duel.id} className="rounded-xl border border-gray-200 px-3 py-3 text-sm dark:border-slate-700">
                    <p className="font-medium">{duel.toName}</p>
                    <p className="text-gray-500">{statusLabel(duel.status)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

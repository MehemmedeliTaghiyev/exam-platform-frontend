import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button, Card, Input, Select } from './ui';
import { fetchGroupmates, fetchOwnProfile } from '../lib/examApi';
import { answerDuel, listDuels, sendDuel, sendDuelByCode } from '../lib/duels';
import { studentDuelCode } from '../lib/studentCode';

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
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const myCode = studentDuelCode(profile);

  const refresh = async (person) => {
    setDuels(await listDuels(person));
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
      const peers = await fetchGroupmates(person).catch(() => []);
      if (!live) return;
      setProfile(person);
      setMates(peers);
      setTarget(peers[0] ? String(peers[0].id) : '');
      await refresh(person);
    })();
    return () => {
      live = false;
    };
  }, [user]);

  const sendFromSelect = async () => {
    const mate = mates.find((item) => String(item.id) === String(target));
    if (!mate) {
      setError('Qrup yoldaşı seçin və ya abituriyent kodunu yazın.');
      return;
    }
    setBusy(true);
    try {
      await sendDuel(profile, { ...mate, duelCode: studentDuelCode(mate) });
      setError('');
      await refresh(profile);
    } catch (err) {
      setError(err.message || 'Duello göndərilmədi.');
    } finally {
      setBusy(false);
    }
  };

  const sendFromCode = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await sendDuelByCode(profile, code);
      setCode('');
      setError('');
      await refresh(profile);
    } catch (err) {
      setError(err.message || 'Duello göndərilmədi.');
    } finally {
      setBusy(false);
    }
  };

  const answer = async (id, status) => {
    try {
      await answerDuel(id, status);
      setError('');
      await refresh(profile);
    } catch (err) {
      setError(err.message || 'Cavab göndərilmədi.');
    }
  };

  const copyCode = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const mine = String(profile?.id || '');
  const incoming = duels.filter((duel) => String(duel.toId) === mine);
  const outgoing = duels.filter((duel) => String(duel.fromId) === mine);

  return (
    <div className="duel-board mb-10">
      <h2 className="mb-2 text-lg font-extrabold">Duello</h2>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Abituriyent kodunu yazıb istənilən şagirdə duello göndər. Eyni kod qalib kuponu üçün də işləyir.
      </p>
      <Card className="duel-board-card">
        <div className="rounded-2xl bg-[var(--bg)] px-4 py-3">
          <p className="text-xs font-bold text-[var(--muted)]">Sənin abituriyent kodun</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-mono text-xl font-black tracking-wide">{myCode || '—'}</p>
            <Button type="button" variant="secondary" onClick={copyCode}>
              <Copy size={14} /> {copied ? 'Kopyalandı' : 'Kopyala'}
            </Button>
          </div>
        </div>

        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={sendFromCode}>
          <div className="min-w-0 flex-1">
            <Input
              label="Rəqibin abituriyent kodu"
              placeholder="EP-00001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
          <Button type="submit" disabled={busy || !code.trim()}>Duello göndər</Button>
        </form>

        {mates.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Select label="Və ya qrup yoldaşı" value={target} onChange={(e) => setTarget(e.target.value)}>
                {mates.map((mate) => (
                  <option key={mate.id} value={mate.id}>{mate.fullName || mate.email}</option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" type="button" disabled={busy} onClick={sendFromSelect}>Göndər</Button>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Gələn</p>
            {incoming.length === 0 ? <p className="mt-2 text-sm text-[var(--muted)]">Gələn duello yoxdur.</p> : (
              <ul className="mt-2 space-y-2">
                {incoming.map((duel) => (
                  <li key={duel.id} className="rounded-xl border border-[var(--line)] px-3 py-3 text-sm">
                    <p className="font-medium">{duel.fromName}</p>
                    <p className="text-[var(--muted)]">{statusLabel(duel.status)}</p>
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
            {outgoing.length === 0 ? <p className="mt-2 text-sm text-[var(--muted)]">Hələ duello göndərməmisiniz.</p> : (
              <ul className="mt-2 space-y-2">
                {outgoing.map((duel) => (
                  <li key={duel.id} className="rounded-xl border border-[var(--line)] px-3 py-3 text-sm">
                    <p className="font-medium">{duel.toName}</p>
                    <p className="text-[var(--muted)]">{statusLabel(duel.status)}</p>
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

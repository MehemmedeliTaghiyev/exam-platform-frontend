import { useEffect, useState } from 'react';
import UniversityBanner from './UniversityBanner';
import { Button, Input, Select } from './ui';
import { AZERBAIJAN_UNIVERSITIES, resolveUniversity } from '../lib/azerbaijanUniversities';
import { claimDream, saveDream } from '../lib/dreamUniversity';
import { localDb } from '../lib/localDb';

export default function DreamUniversityCard({ user }) {
  const [dream, setDream] = useState(null);
  const [editing, setEditing] = useState(false);
  const [universityId, setUniversityId] = useState('');
  const [major, setMajor] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const next = claimDream(user.id, user.email) || localDb.getDream(user.id);
    const uni = resolveUniversity(next);
    setDream(next);
    setUniversityId(uni?.id || '');
    setMajor(next?.major || '');
    if (next?.university && !uni) setEditing(true);
  }, [user?.id, user?.email]);

  const selected = AZERBAIJAN_UNIVERSITIES.find((row) => row.id === universityId) || resolveUniversity(dream);
  const display = {
    ...dream,
    universityId: selected?.id || dream?.universityId,
    university: selected?.name || dream?.university,
    major: editing ? major : dream?.major,
  };

  const save = () => {
    if (!selected) {
      setError('Siyahıdan universitet seçin.');
      return;
    }
    const next = saveDream(user.id, {
      universityId: selected.id,
      university: selected.name,
      major,
      image: selected.image || '',
    });
    setDream(next);
    setEditing(false);
    setError('');
  };

  return (
    <div className="dream-uni mb-8 overflow-hidden rounded-[28px] bg-[#1a222c] text-white ring-1 ring-white/10">
      <UniversityBanner dream={display} />
      <div className="p-4">
        {editing ? (
          <div className="grid gap-3">
            <Select label="Universitet" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
              <option value="">Azərbaycan universitetlərindən seç</option>
              {AZERBAIJAN_UNIVERSITIES.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </Select>
            <Input label="İxtisas" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Məsələn: Kompüter mühəndisliyi" />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={save}>Saxla</Button>
              <Button variant="secondary" onClick={() => { setEditing(false); setError(''); }}>Ləğv et</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/45">Hədəf universitet</p>
              <h2 className="mt-1 text-[22px] font-black leading-tight tracking-tight">
                {selected?.name || dream?.university || 'Universitet seçilməyib'}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/55">
                {dream?.major || 'İxtisasını yaz'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="dream-change shrink-0 rounded-full px-4 py-2 text-sm font-extrabold"
            >
              {dream?.university ? 'Dəyiş' : 'Qeyd et'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

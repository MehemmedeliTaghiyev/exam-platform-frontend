import { useEffect, useState } from 'react';
import { Button, Card, Input } from './ui';
import { claimDream, crestHue, crestInitials, readDreamImage, saveDream } from '../lib/dreamUniversity';
import { localDb } from '../lib/localDb';

function Crest({ name, image }) {
  if (image) {
    return <img src={image} alt="" className="h-28 w-28 rounded-2xl object-cover shadow-sm" />;
  }
  const hue = crestHue(name);
  return (
    <div
      className="flex h-28 w-28 items-center justify-center rounded-2xl text-2xl font-semibold text-white shadow-sm"
      style={{ background: `linear-gradient(145deg, hsl(${hue} 48% 42%), hsl(${(hue + 28) % 360} 42% 24%))` }}
    >
      {crestInitials(name)}
    </div>
  );
}

export default function DreamUniversityCard({ user }) {
  const [dream, setDream] = useState(null);
  const [editing, setEditing] = useState(false);
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const next = claimDream(user.id, user.email) || localDb.getDream(user.id);
    setDream(next);
    setUniversity(next?.university || '');
    setMajor(next?.major || '');
    setImage(next?.image || '');
  }, [user?.id, user?.email]);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      setImage(await readDreamImage(file));
    } catch (err) {
      setError(err.message || 'Şəkil açılmadı.');
    }
  };

  const save = () => {
    if (!university.trim()) {
      setError('Universitetin adını yazın.');
      return;
    }
    const next = saveDream(user.id, { university, major, image });
    setDream(next);
    setEditing(false);
    setError('');
  };

  return (
    <Card className="mb-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Crest name={dream?.university || university} image={editing ? image : dream?.image} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Dream university</p>
          {editing ? (
            <div className="mt-3 grid gap-3">
              <Input label="Universitet" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Məsələn: ADA Universiteti" />
              <Input label="İxtisas" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Məsələn: Kompüter mühəndisliyi" />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Universitetin şəkli</span>
                <input type="file" accept="image/*" onChange={onFile} className="block w-full text-sm text-gray-500" />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={save}>Saxla</Button>
                <Button variant="secondary" onClick={() => { setEditing(false); setError(''); }}>Ləğv et</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xl font-bold">{dream?.university || 'Hələ qeyd olunmayıb'}</p>
              <p className="mt-1 text-sm text-gray-500">{dream?.major || 'İxtisası da buraya yazın.'}</p>
              <Button className="mt-4" variant="secondary" onClick={() => setEditing(true)}>
                {dream?.university ? 'Dəyiş' : 'Qeyd et'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

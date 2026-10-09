import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Button, Card, EmptyState, Input, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchPublicExamsForTeacher, fetchTeacherDirectory } from '../lib/examApi';
import { localDb } from '../lib/localDb';

export default function BrowseTeachers() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [exams, setExams] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const followed = localDb.followedTeacherIds(user?.id);

  const load = async () => {
    setLoading(true);
    try {
      const [list] = await Promise.all([fetchTeacherDirectory()]);
      setTeachers(list);
      if (id) {
        localDb.followTeacher(user?.id, id);
        setExams(await fetchPublicExamsForTeacher(id));
      } else {
        setExams([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user?.id, id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      `${t.fullName} ${t.position}`.toLowerCase().includes(q),
    );
  }, [teachers, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      const key = t.position || 'Digər';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const selected = teachers.find((t) => String(t.id) === String(id));

  if (id) {
    return (
      <AppShell title="Müəllimin imtahanları">
        <Button variant="ghost" onClick={() => navigate('/student/teachers')}>← Müəllimlər</Button>
        <h2 className="mt-4 text-xl font-bold">{selected?.fullName || 'Müəllim'}</h2>
        <p className="mt-1 text-sm text-gray-500">{selected?.position || 'Bölgə göstərilməyib'} · yalnız açıq imtahanlar</p>
        {loading ? <Skeleton className="mt-6 h-40" /> : null}
        {!loading && !exams.length ? (
          <EmptyState title="Açıq imtahan yoxdur" text="Bu müəllim hələ açıq imtahan dərc etməyib." />
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onOpen={() => navigate(`/student/exams/${exam.id}`)} actionLabel="İmtahana başla" />
            ))}
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell title="Müəllimlər">
      <p className="mb-4 text-sm text-gray-500">
        Bölgəyə görə müəllim seçin. Açıq imtahanlarına qoşula bilərsiniz. Öz repetitorunuz varsa, onunla əlaqə saxlayın — o sizi özəl imtahanlara buraxacaq.
      </p>
      <Input label="Axtar (ad və ya bölgə)" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Bakı, Gəncə..." />
      {loading ? <Skeleton className="mt-6 h-40" /> : null}
      {!loading && !filtered.length ? (
        <EmptyState title="Müəllim tapılmadı" text="Açıq dərc edən müəllimlər burada, bölgələrinə görə görünəcək." />
      ) : null}
      <div className="mt-6 space-y-8">
        {grouped.map(([region, list]) => (
          <section key={region}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-400">
              <MapPin size={14} /> {region}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((t) => (
                <Card key={t.id} onClick={() => navigate(`/student/teachers/${t.id}`)} className="cursor-pointer">
                  <p className="font-bold">{t.fullName}</p>
                  <p className="mt-1 text-sm text-gray-500">{t.position}</p>
                  {followed.includes(String(t.id)) ? (
                    <p className="mt-2 text-xs font-medium text-emerald-700">İzlənilir · açıq imtahanlar sizin siyahıdadır</p>
                  ) : (
                    <p className="mt-2 text-xs text-brand-600">Açıq imtahanlara bax →</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

import { useContext, useEffect, useMemo, useState } from 'react';
import { BookOpen, GraduationCap, Trophy, Upload, UserCheck, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Skeleton } from '../components/ui';
import { fetchGroupsForTeacher } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';
import { unwrapList } from '../lib/utils';
import API from '../api/axios';
import {
  difficultyLabelAz,
  memorizeRepublicPlan,
  patchRepublicWinner,
  republicAdminExams,
  republicMonthLabel,
  republicNextMonthKey,
  republicPlan,
  republicResults,
  republicTopicOptions,
  republicWinners,
  saveRepublicPlan,
  winnerSlotsFor,
} from '../lib/republicExam';
import { practiceAdminStudents, practiceAdminTeachers, PRACTICE_TEACHER_ID } from '../lib/practice';

function isActiveStudent(u) {
  if (u.isDeleted) return false;
  const enabled = u.isAccessEnabled ?? u.IsAccessEnabled;
  return enabled !== false;
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'A') + (parts[1]?.[0] || '')).toUpperCase();
}

function Seg({ options, value, onChange }) {
  return (
    <div className="flex rounded-full bg-[#12141a] p-1">
      {options.map(([id, label]) => {
        const on = String(value) === String(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`min-h-10 flex-1 rounded-full px-2 text-[13px] font-extrabold ${
              on ? 'bg-[#7c6aff] text-white' : 'text-white/40'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const nextMonth = republicNextMonthKey();
  const topics = republicTopicOptions();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherGroups, setTeacherGroups] = useState({});
  const [plan, setPlan] = useState(() => republicPlan(nextMonth));
  const [tick, setTick] = useState(0);

  const patchPlan = (patch) => setPlan(saveRepublicPlan(nextMonth, patch));

  useEffect(() => {
    if (user?.practice && !plan.pdfArrived) {
      setPlan(saveRepublicPlan(nextMonth, { pdfArrived: true, pdfName: 'Respublika sınağı.pdf' }));
    }
  }, [user?.practice, nextMonth, plan.pdfArrived]);

  useEffect(() => {
    const run = async () => {
      if (user?.practice) {
        const teacherList = practiceAdminTeachers();
        setTeachers(teacherList);
        setStudents(practiceAdminStudents());
        setTeacherGroups({
          [PRACTICE_TEACHER_ID]: [{ id: 'practice-group', name: 'Məşq qrupu', number: '11A' }],
        });
        setLoading(false);
        return;
      }
      try {
        const [teacherRes, studentRes] = await Promise.all([
          API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } }),
          API.get('/Users', { params: { role: 'Student', includeDeleted: false } }),
        ]);
        const teacherList = unwrapList(teacherRes.data);
        setTeachers(teacherList);
        setStudents(unwrapList(studentRes.data));
        const groupMap = {};
        await Promise.all(teacherList.map(async (teacher) => {
          const id = teacher.id ?? teacher.Id;
          if (!id) return;
          try {
            groupMap[id] = await fetchGroupsForTeacher(id);
          } catch {
            groupMap[id] = [];
          }
        }));
        setTeacherGroups(groupMap);
      } catch {
        setTeachers([]);
        setStudents([]);
      }
      setLoading(false);
    };
    run();
  }, [user?.practice]);

  const activeStudents = students.filter(isActiveStudent);
  const activeTeachers = teachers.filter((t) => (t.isAccessEnabled ?? t.IsAccessEnabled) !== false);
  const exams = useMemo(() => republicAdminExams(), [tick, plan]);
  const winners = republicWinners();
  const canMemorize = Boolean(plan.pdfArrived || plan.pdfDataUrl);

  const onPdf = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      patchPlan({
        pdfArrived: true,
        pdfName: file.name,
        pdfDataUrl: String(reader.result || ''),
        memorizedAt: '',
      });
    };
    reader.readAsDataURL(file);
  };

  const stats = [
    { icon: BookOpen, label: 'İmtahanlar', value: exams.length },
    { icon: GraduationCap, label: 'Müəllimlər', value: activeTeachers.length },
    { icon: UserCheck, label: 'Aktiv tələbələr', value: activeStudents.length },
    { icon: Users, label: 'Bütün tələbələr', value: students.length },
  ];

  return (
    <AppShell title="Ev">
      {loading ? (
        <div className="grid gap-3 grid-cols-2">
          <Skeleton className="h-28 bg-[#171a22]" />
          <Skeleton className="h-28 bg-[#171a22]" />
          <Skeleton className="h-28 bg-[#171a22]" />
          <Skeleton className="h-28 bg-[#171a22]" />
        </div>
      ) : (
        <div className="space-y-4 pb-24">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#7c6aff] px-3 py-1 text-xs font-extrabold">Admin</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((row) => {
              const Icon = row.icon;
              return (
                <section key={row.label} className="rounded-[26px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#7c6aff]/15 text-[#9d93ff]">
                    <Icon size={18} />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-white/45">{row.label}</p>
                  <p className="mt-1 text-3xl font-black">{row.value}</p>
                </section>
              );
            })}
          </div>
          <p className="flex items-start gap-2 text-sm font-semibold text-white/45">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[10px]">i</span>
            Aktiv tələbə: silinməyib və girişi açıqdır.
          </p>

          <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">Müəllimlər və qruplar</h3>
                <p className="mt-0.5 text-sm font-semibold text-white/40">Baza üzrə</p>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {activeTeachers.map((teacher) => {
                const id = teacher.id ?? teacher.Id;
                const name = teacher.fullName || teacher.FullName || teacher.email;
                const groups = teacherGroups[id] || [];
                return (
                  <li key={id} className="flex items-center gap-3 rounded-[22px] bg-[#12141a] px-3 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7c6aff] text-sm font-black">
                      {initials(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{name}</p>
                      <p className="text-sm font-semibold text-white/40">{groups.map((g) => g.name || g.number).join(', ') || 'Qrup yoxdur'}</p>
                    </div>
                    <span className="text-sm font-extrabold text-white/45">{groups.length} qrup</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">Sınağın çətinliyi</h3>
                <p className="mt-1 text-sm font-extrabold text-[#9d93ff]">Respublika sınağı · {republicMonthLabel(nextMonth)}</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-white/45">
                  Sual sayı, mövzu aralığı və dərəcəni siz seçirsiniz. PDF əvvəlcədən gəlir — baxıb yaddaşa vurun, növbəti imtahan ayın sonunda paylaşılır.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#7c6aff] px-3 py-1 text-xs font-extrabold">
                İndi: {difficultyLabelAz(plan.difficulty)}
              </span>
            </div>

            <p className="mt-4 mb-2 text-xs font-extrabold uppercase tracking-wide text-white/35">Çətinlik</p>
            <Seg
              options={[['asan', 'Asan'], ['orta', 'Orta'], ['çətin', 'Çətin']]}
              value={plan.difficulty}
              onChange={(id) => patchPlan({ difficulty: id, memorizedAt: '' })}
            />

            <p className="mt-4 mb-2 text-xs font-extrabold uppercase tracking-wide text-white/35">Dərəcə</p>
            <Seg
              options={[['9', '9'], ['10', '10'], ['11', '11']]}
              value={plan.grade}
              onChange={(id) => patchPlan({ grade: id, memorizedAt: '' })}
            />

            <p className="mt-4 mb-2 text-xs font-extrabold uppercase tracking-wide text-white/35">Sual sayı</p>
            <Seg
              options={[['20', '20'], ['25', '25'], ['30', '30'], ['40', '40']]}
              value={String(plan.questionCount)}
              onChange={(id) => patchPlan({ questionCount: Number(id), memorizedAt: '' })}
            />

            <p className="mt-4 mb-2 text-xs font-extrabold uppercase tracking-wide text-white/35">Mövzu aralığı</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-white/40">
                Başlanğıc
                <select
                  className="mt-1 h-11 w-full rounded-2xl bg-[#12141a] px-3 text-sm font-extrabold text-white outline-none ring-1 ring-white/10"
                  value={plan.topicFrom}
                  onChange={(e) => patchPlan({ topicFrom: Number(e.target.value), memorizedAt: '' })}
                >
                  {topics.map((topic, index) => (
                    <option key={`from-${index}`} value={index}>{topic}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-white/40">
                Son
                <select
                  className="mt-1 h-11 w-full rounded-2xl bg-[#12141a] px-3 text-sm font-extrabold text-white outline-none ring-1 ring-white/10"
                  value={plan.topicTo}
                  onChange={(e) => patchPlan({ topicTo: Number(e.target.value), memorizedAt: '' })}
                >
                  {topics.map((topic, index) => (
                    <option key={`to-${index}`} value={index}>{topic}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-[22px] bg-[#12141a] p-3 ring-1 ring-white/[0.06]">
              <p className="text-sm font-extrabold">{plan.pdfArrived ? 'PDF gəlib' : 'PDF gözlənilir'}</p>
              <p className="mt-1 text-sm font-semibold text-white/45">
                {plan.pdfName || 'Növbəti ayın respublika PDF-i'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white/[0.06] px-4 text-sm font-extrabold">
                  <Upload size={16} />
                  PDF seç
                  <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => onPdf(e.target.files?.[0])} />
                </label>
                {plan.pdfDataUrl ? (
                  <a
                    href={plan.pdfDataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-full bg-white/[0.06] px-4 text-sm font-extrabold"
                  >
                    PDF-ə bax
                  </a>
                ) : null}
                <button
                  type="button"
                  disabled={!canMemorize}
                  onClick={() => {
                    setPlan(memorizeRepublicPlan(nextMonth));
                    setTick((n) => n + 1);
                  }}
                  className="inline-flex min-h-11 items-center rounded-full bg-[#7c6aff] px-4 text-sm font-extrabold disabled:opacity-40"
                >
                  {plan.memorizedAt ? 'Yaddaşda' : 'Yaddaşa vur'}
                </button>
              </div>
              {plan.memorizedAt ? (
                <p className="mt-3 text-sm font-semibold leading-snug text-[#f0b429]">
                  Növbəti imtahan ayın sonunda paylaşılacaq.
                </p>
              ) : (
                <p className="mt-3 text-sm font-semibold leading-snug text-white/40">
                  Yaddaşa vurmadansa paylaşılmır.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
            <h3 className="text-lg font-black">Respublika sınağı qalibləri</h3>
            <p className="mt-1 text-sm font-extrabold text-white/40">{republicMonthLabel()}</p>
            <div className="mt-3 space-y-2 text-sm font-semibold text-white/55">
              <p className="flex items-center gap-2"><Trophy size={16} className="text-[#f0b429]" /> Yer sayı iştirakçıya görədir: {winnerSlotsFor(republicResults().length) || 0}</p>
              <p>Şəkil ana səhifədə müəllim adı ilə görünür</p>
              <p>Kuponla 2 ₼ geri qaytarılır</p>
            </div>
            {winners.length ? winners.map((row, index) => (
              <div key={row.userId} className="mt-3 rounded-[22px] bg-[#12141a] p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white/10">
                    {row.photo ? <img src={row.photo} alt="" className="h-full w-full object-cover" /> : <Users size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{row.fullName}</p>
                    <p className="text-sm font-semibold text-white/40">{row.percent}% · {row.teacherName || 'Müəllim yoxdur'}</p>
                  </div>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0b429] text-sm font-black text-[#3a2a08]">{index + 1}</span>
                </div>
                <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] text-sm font-extrabold">
                  Şəkil seç
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        patchRepublicWinner(row.month, { ...row, photo: String(reader.result || '') });
                        setTick((n) => n + 1);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            )) : (
              <p className="mt-3 text-sm font-semibold text-white/40">Bu ay qalib yoxdur.</p>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

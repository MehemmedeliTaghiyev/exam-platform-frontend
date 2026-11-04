import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import { EmptyState } from '../components/ui';
import { createExam } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import {
  canUseStorageSelection,
  STORAGE_PRICE,
  STORAGE_PRICE_BLOK,
  WATERMARK_PRICE,
  weeklyPipelineQuizzes,
} from '../lib/storageAccess';
import { Bell, Club, Download, Droplet, Eye, Gift, Minus, Package, Plus } from 'lucide-react';
import { PREFERENCE_OPTIONS, catalogPacks, defaultPreferences, driveDownloadUrl, driveViewUrl, gradeLabel, kindsForGrade, packLatexSource, pickStoragePacks, teacherSubjectOf } from '../lib/storageCatalog';
import { loadQuizCatalog } from '../lib/quizPipeline';
import { compileLatexPdf, saveAndOpenPdf } from '../lib/latexPdf';
import LatexText from '../components/LatexText';
import { errorMessage } from '../lib/utils';
import { isMixedExamKind, withMixedMark } from '../lib/syllabus';
import {
  markStorageRequestSeen,
  requestStorageExam,
  teacherTokenRequests,
  TOKEN_COSTS,
  tokenCostForMix,
  useTeacherTokens,
  WEEKLY_TOKENS,
} from '../lib/tokens';

const prefKey = (id) => `exampulse_storage_pref_${id || 'me'}`;
const sharedKey = (id) => `exampulse_storage_shared_${id || 'me'}`;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function resolveTeacherSubject(user) {
  return teacherSubjectOf(user) || localDb.getTeacherSubject(user?.id, user?.email) || '';
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

function ShareChoice({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 flex-1 rounded-full px-2 text-[13px] font-extrabold ${
        active ? 'bg-[#7c6aff] text-white' : 'text-white/40'
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({ label, hint, value, onChange }) {
  const n = Math.max(0, Number(value) || 0);
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 min-[768px]:flex-col min-[768px]:items-stretch min-[768px]:rounded-[20px] min-[768px]:bg-[#12141a] min-[768px]:px-4 min-[768px]:py-4">
      <div>
        <p className="text-[17px] font-black">{label}</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[#f0b429]">
          <Club size={11} fill="currentColor" /> {hint}
        </p>
      </div>
      <div className="flex items-center gap-2 min-[768px]:mt-3 min-[768px]:justify-between">
        <button
          type="button"
          aria-label="Azalt"
          onClick={() => onChange(Math.max(0, n - 1))}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#12141a] text-white/80 ring-1 ring-white/10 min-[768px]:bg-[#171a22]"
        >
          <Minus size={16} />
        </button>
        <span className="w-6 text-center text-lg font-black tabular-nums">{n}</span>
        <button
          type="button"
          aria-label="Artır"
          onClick={() => onChange(n + 1)}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#7c6aff] text-white"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default function TeacherStorage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const subject = resolveTeacherSubject(user);
  const [prefs, setPrefs] = useState(() => ({
    ...defaultPreferences(),
    ...readJson(prefKey(user?.id), {}),
    subject,
  }));
  const [shared, setShared] = useState(() => readJson(sharedKey(user?.id), {}));
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [mix, setMix] = useState({ asan: 4, orta: 2, çətin: 0 });
  const [language, setLanguage] = useState('az');
  const [payWall, setPayWall] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloadId, setDownloadId] = useState('');
  const [allNotes, setAllNotes] = useState(false);
  const [catalog, setCatalog] = useState({ packs: [], weekly: [], connected: false });
  const tokens = useTeacherTokens(user);
  const unlocked = canUseStorageSelection(user);
  const allowedKinds = useMemo(() => kindsForGrade(prefs.grade), [prefs.grade]);
  const packs = useMemo(
    () => pickStoragePacks({ ...prefs, subject }, catalog.packs.length ? catalog.packs : catalogPacks()),
    [prefs, subject, catalog.packs],
  );
  const requestCost = tokenCostForMix(mix);
  const availableJetons = tokens.unlimited
    ? (user?.practice ? WEEKLY_TOKENS : Number.POSITIVE_INFINITY)
    : Number(tokens.balance || 0);
  const overBudget = Number.isFinite(availableJetons) && requestCost > availableJetons;
  const requests = teacherTokenRequests(user);
  const quizzes = catalog.weekly.length ? catalog.weekly : weeklyPipelineQuizzes();

  useEffect(() => {
    loadQuizCatalog().then(setCatalog).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subject) return;
    setPrefs((prev) => (prev.subject === subject ? prev : { ...prev, subject }));
  }, [subject]);

  useEffect(() => {
    if (allowedKinds.includes(prefs.kind)) return;
    setPrefs((prev) => ({ ...prev, kind: allowedKinds[0] }));
  }, [allowedKinds, prefs.kind]);

  useEffect(() => {
    localStorage.setItem(prefKey(user?.id), JSON.stringify({ ...prefs, subject }));
  }, [prefs, subject, user?.id]);

  useEffect(() => {
    document.documentElement.classList.toggle('jeton-over', overBudget);
    return () => document.documentElement.classList.remove('jeton-over');
  }, [overBudget]);

  const setPref = (key, value) => setPrefs((prev) => ({ ...prev, [key]: value }));

  const remember = (next) => {
    setShared(next);
    localStorage.setItem(sharedKey(user?.id), JSON.stringify(next));
  };

  const share = async (pack, visibility) => {
    if (!unlocked || busyId) return;
    const mixed = isMixedExamKind(pack.kind);
    if (mixed && visibility === 'public') {
      setError('Blok və Buraxılış (qarışıq mövzu) yalnız öz tələbələrinizlə paylaşılır.');
      return;
    }
    setBusyId(pack.id);
    setError('');
    try {
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const exam = await createExam({
        title: pack.title,
        description: withMixedMark(`${pack.title}\n[[STORAGE:${pack.id}]]`, mixed),
        totalQuestions: pack.totalQuestions,
        durationMinutes: pack.durationMinutes,
        teacherId: user?.id,
        subjectName: pack.subject,
        startTime: new Date().toISOString(),
        endTime: end.toISOString(),
        visibility: mixed ? 'private' : visibility,
        status: 'Live',
        pdfFileUrl: driveViewUrl(pack.driveFileId || pack.pdfUrl) || pack.pdfUrl,
      });
      remember({
        ...shared,
        [pack.id]: { examId: exam?.id, visibility, at: new Date().toISOString() },
      });
    } catch (err) {
      setError(errorMessage(err, 'Paylaşılmadı.'));
    } finally {
      setBusyId('');
    }
  };

  const keep = (pack) => {
    if (!unlocked) return;
    remember({
      ...shared,
      [pack.id]: { examId: '', visibility: 'held', at: new Date().toISOString() },
    });
  };

  const openPdf = (pack) => {
    if (!unlocked) return;
    const url = driveViewUrl(pack.driveFileId);
    if (!url) {
      window.alert('PDF hələ bağlanmayıb. Drive faylı bazaya yazılanda buradan açılacaq. İstəsəniz «PDF yüklə» ilə LaTeX/TikZ-dən çevirin.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadPack = async (pack) => {
    if (!unlocked || downloadId) return;
    setDownloadId(pack.id);
    setError('');
    try {
      const filename = `${String(pack.title || 'material').replace(/[^\w.\-əöüğçşıİƏÖÜĞÇŞ ]+/gi, '') || 'material'}.pdf`;
      const driveUrl = driveDownloadUrl(pack.driveFileId);
      if (driveUrl && pack.driveFileId) {
        window.open(driveUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const { blob } = await compileLatexPdf(packLatexSource(pack), {
        title: pack.title,
        filename,
      });
      await saveAndOpenPdf(blob, filename);
    } catch (err) {
      setError(errorMessage(err, 'PDF yüklənmədi.'));
    } finally {
      setDownloadId('');
    }
  };

  const sendRequest = async () => {
    if (!unlocked || sending) return;
    if (overBudget) {
      setPayWall(false);
      setError(`Jetonunuz artıqdır. Bu tələb ${requestCost} jetondur, sizdə ${availableJetons} jeton var.`);
      return;
    }
    setSending(true);
    setError('');
    setPayWall(false);
    try {
      const row = await requestStorageExam(user, mix, {
        language,
        subject,
        grade: prefs.grade,
        kind: prefs.kind,
      });
      const questions = row?.paper?.questions || [];
      const latex = questions.map((q) => q.latex || q.text).filter(Boolean).join('\n\n')
        || row?.paper?.latexSource
        || '';
      if (latex) {
        try {
          const { blob } = await compileLatexPdf(latex, { title: row.title || 'Quiz' });
          await saveAndOpenPdf(blob, `${String(row.title || 'quiz').slice(0, 40)}.pdf`);
        } catch {
          /* bildirişdə LaTeX qalır, PDF sonra */
        }
      }
    } catch (err) {
      if (err?.code === 'JETON_YOX') {
        setPayWall(true);
        setError(`Pulsuz ${WEEKLY_TOKENS} jeton bitib. Bu tələb ${requestCost} jeton istəyir.`);
        navigate('/teacher/cabinet#odenis');
      } else if (err?.code === 'SUAL_YOX') {
        setError('Quiz tələb etmək üçün asan, orta və ya çətin sual sayını yazın.');
      } else {
        setError(errorMessage(err, 'Quiz tələb edilmədi.'));
      }
    } finally {
      setSending(false);
    }
  };

  const questionCount = (Number(mix.asan) || 0) + (Number(mix.orta) || 0) + (Number(mix.çətin) || 0);
  const notes = requests.map((row) => ({
    id: row.id,
    title: row.asan != null
      ? `${row.kind && row.kind !== 'Quiz' ? row.kind : 'Quiz tələbi'} · ${row.asan} asan, ${row.orta} orta, ${row.çətin} çətin`
      : row.title,
    lang: String(row.language || 'az').toUpperCase(),
    waiting: row.status !== 'ready',
    cost: row.cost,
    row,
  }));
  const weeklyPacks = useMemo(
    () => quizzes.map((quiz, index) => ({
      id: `weekly-${quiz.id || index + 1}`,
      title: quiz.title || `Həftəlik sınaq ${index + 1}`,
      subject: subject || 'Riyaziyyat',
      grade: prefs.grade || '11',
      kind: 'Sınaq',
      durationMinutes: 90,
      totalQuestions: 25,
      weeklyGift: true,
      week: quiz.week,
      driveFileId: quiz.driveFileId || '',
      pdfUrl: quiz.pdfUrl || '',
    })),
    [quizzes, subject, prefs.grade],
  );
  const shownNotes = allNotes ? notes : notes.slice(0, 3);

  return (
    <AppShell title="Anbar">
      <div className="desk-page space-y-4 text-white">
        <section className={`rounded-[28px] p-4 min-[768px]:p-6 ${overBudget ? 'bg-[#4a1d24]' : 'bg-[#171a22]'} ring-1 ring-white/[0.06]`}>
          <p className="text-[17px] font-black">Quiz tələbi üçün jeton qiyməti</p>
          <p className="mt-1 text-sm font-semibold text-white/45">Hər sual üçün</p>
          <div className="mt-4 grid grid-cols-3 gap-2 min-[1100px]:max-w-xl">
            {[
              [TOKEN_COSTS.asan, 'Asan'],
              [TOKEN_COSTS.orta, 'Orta'],
              [TOKEN_COSTS.çətin, 'Çətin'],
            ].map(([n, label]) => (
              <div key={label} className="rounded-[20px] bg-[#12141a] py-4 text-center ring-1 ring-white/[0.04]">
                <p className="inline-flex items-center gap-1 text-3xl font-black tabular-nums text-[#f0b429]">
                  {n} <Club size={16} fill="currentColor" />
                </p>
                <p className="mt-1 text-xs font-bold text-white/55">{label}</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 grid gap-2 text-sm font-semibold text-white/70 min-[768px]:grid-cols-3">
            <li className="flex items-center gap-2"><Gift size={16} className="text-[#f0b429]" /> İlk {WEEKLY_TOKENS} jeton pulsuzdur</li>
            <li className="flex items-center gap-2"><Package size={16} className="text-[#f0b429]" /> Buraxılış paketi {STORAGE_PRICE}, blok paketi {STORAGE_PRICE_BLOK} jetondur</li>
            <li className="flex items-center gap-2"><Droplet size={16} className="text-[#f0b429]" /> Watermark +{WATERMARK_PRICE} jeton</li>
          </ul>
        </section>

        <div className="desk-split desk-split-anbar">
        {!subject ? (
          <section className="rounded-[28px] bg-[#171d27] p-4 ring-1 ring-white/10">
            <p className="font-extrabold">Fənn hələ qeyd olunmayıb</p>
            <p className="mt-1 text-sm font-semibold text-white/50">Anbar qeydiyyatdakı fənnə görə açılır.</p>
            <Link to="/teacher/cabinet" className="mt-3 inline-flex text-sm font-extrabold text-[#f0b429]">
              Kabinetə keç
            </Link>
          </section>
        ) : (
          <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06] min-[768px]:p-5">
            <h2 className="text-xl font-black">Quiz tələb et</h2>
            <div className="mt-4 grid gap-4 min-[768px]:grid-cols-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">Sinif</p>
                <div className="mt-2">
                  <Seg
                    value={prefs.grade}
                    onChange={(grade) => setPref('grade', grade)}
                    options={PREFERENCE_OPTIONS.grades.map((grade) => [grade, gradeLabel(grade)])}
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">İmtahan növü</p>
                <div className="mt-2">
                  <Seg
                    value={prefs.kind}
                    onChange={(kind) => setPref('kind', kind)}
                    options={allowedKinds.map((kind) => [kind, kind])}
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">Dil</p>
                <div className="mt-2">
                  <Seg
                    value={language}
                    onChange={setLanguage}
                    options={[
                      ['az', 'Azərbaycan'],
                      ['ru', 'Rus'],
                      ['en', 'İngilis'],
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 divide-y divide-white/[0.06] min-[768px]:mt-4 min-[768px]:grid min-[768px]:grid-cols-3 min-[768px]:gap-3 min-[768px]:divide-y-0">
              <Stepper
                label="Asan"
                hint={`${TOKEN_COSTS.asan} / sual`}
                value={mix.asan}
                onChange={(n) => setMix((prev) => ({ ...prev, asan: n }))}
              />
              <Stepper
                label="Orta"
                hint={`${TOKEN_COSTS.orta} / sual`}
                value={mix.orta}
                onChange={(n) => setMix((prev) => ({ ...prev, orta: n }))}
              />
              <Stepper
                label="Çətin"
                hint={`${TOKEN_COSTS.çətin} / sual`}
                value={mix.çətin}
                onChange={(n) => setMix((prev) => ({ ...prev, çətin: n }))}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="min-w-0 flex-1 rounded-[22px] bg-[#12141a] px-4 py-3">
                <p className="text-xs font-semibold text-white/45">Bu göndəriş · {questionCount} sual</p>
                <p className={`mt-1 inline-flex items-center gap-1 text-3xl font-black tabular-nums ${overBudget ? 'text-[#fb7185]' : 'text-[#f0b429]'}`}>
                  {requestCost} <Club size={18} fill="currentColor" />
                </p>
              </div>
              <button
                type="button"
                disabled={!unlocked || sending || requestCost <= 0}
                onClick={sendRequest}
                className={`shrink-0 rounded-full px-5 py-4 text-sm font-extrabold disabled:opacity-50 ${
                  overBudget
                    ? 'bg-[#3a3230] text-white/35 shadow-inner'
                    : 'bg-[#7c6aff] text-white'
                }`}
              >
                {sending ? 'Göndərilir...' : 'Quiz tələb et'}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm font-semibold text-[#fb7185]">{error}</p> : null}
            {payWall ? (
              <p className="mt-3 text-sm font-semibold text-[#f0b429]">
                Pulsuz jeton bitib.{' '}
                <Link to="/teacher/cabinet#odenis" className="underline">Ödənişə keç</Link>
              </p>
            ) : null}
          </section>
        )}

        <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-extrabold"><Bell size={16} /> Bildirişlər</p>
            {notes.length > 3 ? (
              <button type="button" onClick={() => setAllNotes((on) => !on)} className="text-sm font-extrabold text-white/50">
                {allNotes ? 'Gizlət' : 'Hamsına bax'}
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-white/45">
            Tələb etdiyiniz quizlər hazır olanda burada görünür.
          </p>
          <ul className="mt-3 space-y-2">
            {shownNotes.length ? shownNotes.map((note) => (
              <li key={note.id} className="rounded-[20px] bg-[#12141a] px-4 py-3">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => note.row && markStorageRequestSeen(user, note.row.id)}
                >
                  <span>
                    <span className="block font-extrabold leading-snug">{note.title}</span>
                    <span className="mt-2 inline-flex items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-extrabold text-white/70">{note.lang}</span>
                      {note.waiting ? (
                        <span className="rounded-full bg-[#f0b429]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#f0b429]">Gözlənilir</span>
                      ) : (
                        <span className="rounded-full bg-[#7c6aff]/20 px-2 py-0.5 text-[11px] font-extrabold text-[#b4abff]">{note.cost} jeton</span>
                      )}
                    </span>
                  </span>
                </button>
                {note.row?.paper?.questions?.slice(0, 4).map((q, qi) => (
                  <div key={q.id || qi} className="mt-2 text-xs font-medium text-white/70">
                    <LatexText text={q.latex || q.text} />
                  </div>
                ))}
              </li>
            )) : (
              <li className="rounded-[20px] bg-[#1c2430] px-4 py-3 text-sm font-semibold text-white/40">
                Hələ bildiriş yoxdur.
              </li>
            )}
          </ul>
        </section>
        </div>

        <section>
          <h2 className="text-2xl font-black tracking-tight">Hazır imtahanlar</h2>
          <p className="mt-1 mb-4 text-sm font-semibold text-white/45">PDF-ə bax, yüklə və paylaşım səviyyəsini seç.</p>
          {subject && !packs.length && !weeklyPacks.length ? (
            <EmptyState title="PDF tapılmadı" text="Bu fənn üçün uyğun PDF hələ bağlanmayıb." />
          ) : null}
          <div className="grid gap-3 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {[...weeklyPacks, ...packs].map((pack) => {
              const state = shared[pack.id];
              const sharedOut = state?.examId;
              const vis = sharedOut ? state.visibility : state?.visibility;
              const mixed = isMixedExamKind(pack.kind);
              const shortTitle = pack.weeklyGift
                ? (pack.title || 'Həftəlik sınaq')
                : `${pack.kind} ${String(pack.id).split('-').pop() || ''}`.trim();
              return (
                <article key={pack.id} className="rounded-[26px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {pack.weeklyGift ? (
                        <span className="mb-2 inline-flex rounded-full bg-[#7c6aff]/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b4abff]">
                          Hər həftə əlavə sınaq
                        </span>
                      ) : null}
                      <p className={`text-[22px] font-black leading-none ${pack.weeklyGift ? 'mt-2' : ''}`}>{shortTitle}</p>
                      <p className="mt-2 text-sm font-semibold text-white/45">
                        {pack.subject} · {gradeLabel(pack.grade)} sinif · {pack.durationMinutes} dəq
                      </p>
                      {mixed ? (
                        <p className="mt-2 text-sm font-semibold text-white/50">Qarışıq sınaq · yalnız öz tələbələr</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-sm font-extrabold text-white/55">
                      {pack.totalQuestions} sual
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => openPdf(pack)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-[#7c6aff] text-sm font-extrabold text-white disabled:opacity-50"
                    >
                      <Eye size={16} /> PDF-ə bax
                    </button>
                    <button
                      type="button"
                      disabled={!unlocked || Boolean(downloadId)}
                      onClick={() => downloadPack(pack)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-[#12141a] text-sm font-extrabold text-[#9d93ff] ring-1 ring-white/[0.06] disabled:opacity-50"
                    >
                      <Download size={16} /> {downloadId === pack.id ? 'Yüklənir...' : 'PDF yüklə'}
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/35">Paylaşım</p>
                  <div className="mt-2 flex rounded-full bg-[#12141a] p-1">
                    <ShareChoice active={vis === 'held'} onClick={() => unlocked && keep(pack)}>
                      Paylaşma
                    </ShareChoice>
                    <ShareChoice active={vis === 'private' && Boolean(sharedOut)} onClick={() => unlocked && share(pack, 'private')}>
                      {busyId === pack.id ? '...' : 'Şəxsi'}
                    </ShareChoice>
                    {mixed ? null : (
                      <ShareChoice active={vis === 'public' && Boolean(sharedOut)} onClick={() => unlocked && share(pack, 'public')}>
                        Hamı ilə
                      </ShareChoice>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

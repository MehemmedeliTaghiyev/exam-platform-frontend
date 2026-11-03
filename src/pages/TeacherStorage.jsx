import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import { Button, Card, EmptyState, Input } from '../components/ui';
import { createExam } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import {
  canUseStorageSelection,
  STORAGE_QUIZZES_PER_WEEK,
  weeklyPipelineQuizzes,
} from '../lib/storageAccess';
import { Bell, Download } from 'lucide-react';
import { PREFERENCE_OPTIONS, catalogPacks, defaultPreferences, driveDownloadUrl, driveViewUrl, packLatexSource, pickStoragePacks, STORAGE_PACK_LIMIT, teacherSubjectOf } from '../lib/storageCatalog';
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
  const [catalog, setCatalog] = useState({ packs: [], weekly: [], connected: false });
  const tokens = useTeacherTokens(user);
  const unlocked = canUseStorageSelection(user);
  const packs = useMemo(
    () => pickStoragePacks({ ...prefs, subject }, catalog.packs.length ? catalog.packs : catalogPacks()),
    [prefs, subject, catalog.packs],
  );
  const requestCost = tokenCostForMix(mix);
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
    localStorage.setItem(prefKey(user?.id), JSON.stringify({ ...prefs, subject }));
  }, [prefs, subject, user?.id]);

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
    if (!window.confirm('Bu PDF anbarda qalsın? Şagirdlər görməyəcək.')) return;
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

  return (
    <AppShell title="Anbar">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold">İmtahan anbarı</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Fənn qeydiyyatdan avtomatik gəlir — burada seçmək lazım deyil. İstəyə uyğun ən çox {STORAGE_PACK_LIMIT} PDF görünür.
            Quiz tələb edəndə jeton düşür: asan {TOKEN_COSTS.asan}, orta {TOKEN_COSTS.orta}, çətin {TOKEN_COSTS.çətin}.
            İlk {WEEKLY_TOKENS} jeton pulsuzdur. Bitəndə 30 ₼ buraxılış / 40 ₼ blok paketi bir dəfəlikdir. Watermark +5 ₼.
          </p>
        </div>

        {!subject ? (
          <Card className="space-y-3">
            <p className="font-extrabold">Fənn hələ qeyd olunmayıb</p>
            <p className="text-sm text-[var(--muted)]">
              Anbar qeydiyyatda seçdiyiniz fənnə görə açılır. Fənni kabinetdəki şəxsi məlumatlardan yazın.
            </p>
            <Link to="/teacher/cabinet" className="inline-flex text-sm font-extrabold text-[#1f7a3a] underline">
              Kabinetə keç
            </Link>
          </Card>
        ) : (
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-bold text-[var(--muted)]">Sizin fənn (qeydiyyatdan)</p>
              <p className="mt-1 text-lg font-extrabold">{subject} müəllimi</p>
            </div>
            {[
              ['grade', 'Sinif', PREFERENCE_OPTIONS.grades],
              ['kind', 'İmtahan növü', PREFERENCE_OPTIONS.kinds],
            ].map(([key, label, options]) => (
              <div key={key}>
                <p className="mb-2 text-sm font-bold">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPref(key, option)}
                      className={`rounded-full px-4 py-2 text-sm font-bold ${prefs[key] === option ? 'bg-[#2f7a45] text-white' : 'bg-[#f3ecdf] text-[#1d2430] dark:bg-[#243028] dark:text-[#f3f0ea]'}`}
                    >
                      {key === 'grade' ? `${option}-ci` : option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )}

        {subject ? (
          <Card className="space-y-4">
            <div>
              <p className="font-extrabold">Quiz tələb et</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Asan, orta və çətin sayını özünüz seçirsiniz. Quiz bazadan Anbara bildiriş kimi gəlir, sonra LaTeX çevrilir.
                Hesabda {tokens.unlimited ? 'limitsiz' : `${tokens.balance} jeton`} var.
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">İmtahanın dili</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['az', 'Azərbaycan'],
                  ['ru', 'Rus'],
                  ['en', 'İngilis'],
                ].map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${language === code ? 'bg-[#2f7a45] text-white' : 'bg-[#f3ecdf] text-[#1d2430] dark:bg-[#243028] dark:text-[#f3f0ea]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label={`Asan (${TOKEN_COSTS.asan} jeton)`}
                type="number"
                min={0}
                value={mix.asan}
                onChange={(e) => setMix((prev) => ({ ...prev, asan: e.target.value }))}
              />
              <Input
                label={`Orta (${TOKEN_COSTS.orta} jeton)`}
                type="number"
                min={0}
                value={mix.orta}
                onChange={(e) => setMix((prev) => ({ ...prev, orta: e.target.value }))}
              />
              <Input
                label={`Çətin (${TOKEN_COSTS.çətin} jeton)`}
                type="number"
                min={0}
                value={mix.çətin}
                onChange={(e) => setMix((prev) => ({ ...prev, çətin: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-extrabold">Bu göndəriş: {requestCost} jeton</p>
              <Button disabled={!unlocked || sending || requestCost <= 0} onClick={sendRequest}>
                {sending ? 'Tələb edilir...' : 'Quiz tələb et'}
              </Button>
            </div>
            {payWall ? (
              <div className="rounded-2xl border border-[#ead9a8] bg-[#fff8e8] px-4 py-3 text-sm font-semibold text-[#3a2a00]">
                Pulsuz jeton bitib. Paketləri görmək və bir dəfəlik ödəmək üçün kabinetə keçin.
                <Link to="/teacher/cabinet#odenis" className="ml-2 font-extrabold underline">Ödənişə keç</Link>
              </div>
            ) : !tokens.subscribed && !tokens.unlimited ? (
              <p className="text-xs font-semibold text-[#6d655c]">
                {WEEKLY_TOKENS} pulsuz jeton bitəndə{' '}
                <Link to="/teacher/cabinet#odenis" className="font-extrabold text-[#1f7a3a] underline">ödəniş pəncərəsi</Link> açılır.
              </p>
            ) : null}
          </Card>
        ) : null}

        {requests.length || quizzes.length ? (
          <Card>
            <p className="flex items-center gap-2 font-extrabold"><Bell size={16} /> Anbar bildirişləri</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Tələb etdiyiniz quizlər bazadan bura düşür. LaTeX suallar çevrilir.
            </p>
            <ul className="mt-3 space-y-2">
              {requests.map((row) => (
                <li key={row.id} className={`rounded-2xl px-4 py-3 text-sm ${row.seen ? 'bg-[#f3ecdf]' : 'bg-[#e7f6ea]'}`}>
                  <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => markStorageRequestSeen(user, row.id)}>
                    <span>
                      <span className="block font-bold">{row.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-[var(--muted)]">
                        {row.language?.toUpperCase() || 'AZ'} · {row.status === 'ready' ? 'bazadan gəldi' : row.status === 'waiting' ? 'pipeline gözlənilir' : row.status === 'error' ? (row.error || 'xəta') : 'gözlənilir'}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-extrabold text-[#2f7a45]">{row.cost} jeton</span>
                  </button>
                  {(row.paper?.questions || []).slice(0, 8).map((q, qi) => (
                    <div key={q.id || qi} className="mt-2 text-xs font-medium text-[var(--text)]">
                      <LatexText text={q.latex || q.text} />
                    </div>
                  ))}
                  {!row.paper?.questions?.length && row.paper?.latexSource ? (
                    <div className="mt-2 text-xs font-medium text-[var(--text)]">
                      <LatexText text={row.paper.latexSource} />
                    </div>
                  ) : null}
                </li>
              ))}
              {quizzes.slice(0, Math.max(0, STORAGE_QUIZZES_PER_WEEK - requests.length)).map((quiz) => (
                <li key={quiz.id} className="flex items-center justify-between rounded-2xl bg-[#f3ecdf] px-4 py-3 text-sm font-bold">
                  <span>{quiz.title}</span>
                  <span className="text-xs text-[var(--muted)]">Gözlənilir</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        {subject && !packs.length ? (
          <EmptyState title="PDF tapılmadı" text="Bu fənn üçün uyğun PDF hələ bağlanmayıb." />
        ) : null}

        {packs.map((pack, index) => {
          const state = shared[pack.id];
          const sharedOut = state?.examId;
          const held = state?.visibility === 'held';
          return (
            <Card key={pack.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-extrabold">{index + 1}. {pack.title}</p>
                <p className="shrink-0 text-xs font-bold text-[var(--muted)]">{pack.totalQuestions} sual</p>
              </div>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                {pack.durationMinutes} dəqiqə · {pack.driveFileId ? 'PDF bağlıdır' : 'PDF bazadan gələcək'}
              </p>
              {sharedOut ? (
                <p className="mt-2 text-sm font-bold text-[#2f7a45]">
                  Paylaşıldı · {state.visibility === 'public' ? 'Açıq zona' : 'Şəxsi'}
                </p>
              ) : null}
              {held && !sharedOut ? <p className="mt-2 text-sm font-bold text-[var(--muted)]">Anbarda saxlanıldı</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!unlocked} onClick={() => openPdf(pack)}>PDF-ə bax</Button>
                <Button variant="secondary" disabled={!unlocked || Boolean(downloadId)} onClick={() => downloadPack(pack)}>
                  <Download size={16} /> {downloadId === pack.id ? 'Yüklənir...' : 'PDF yüklə'}
                </Button>
                {!sharedOut ? (
                  <>
                    <Button variant="secondary" disabled={!unlocked || Boolean(busyId)} onClick={() => share(pack, 'private')}>
                      {busyId === pack.id ? 'Paylaşılır...' : 'Şəxsi paylaş'}
                    </Button>
                    {isMixedExamKind(pack.kind) ? (
                      <p className="w-full text-xs font-semibold text-[var(--muted)]">Qarışıq sınaq — yalnız öz tələbələr</p>
                    ) : (
                      <Button variant="secondary" disabled={!unlocked || Boolean(busyId)} onClick={() => share(pack, 'public')}>Hamı ilə paylaş</Button>
                    )}
                    <Button variant="secondary" disabled={!unlocked || Boolean(busyId)} onClick={() => keep(pack)}>Paylaşma</Button>
                  </>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

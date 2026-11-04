import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, FileDown, BarChart3, Upload } from 'lucide-react';
import AppShell from '../components/AppShell';
import PaperPreview from '../components/PaperPreview';
import PdfViewer from '../components/PdfViewer';
import { Button, Card, Input, Skeleton } from '../components/ui';
import { addQuestion, fetchExam, fetchOwnProfile, fetchQuestions, paperQuestionsOf, saveAnswerKey, saveDriveFileMarker, updateExam } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { errorMessage, examCanEdit, isLetterOption, isOpenChoiceOption, optionLetter } from '../lib/utils';
import { driveFileViewUrl, examDriveFileId, parseDriveFileId } from '../lib/driveLinks';
import DrivePreview from '../components/DrivePreview';
import { dropTeacherPdf, peekTeacherPdf, stashTeacherPdf } from '../lib/teacherPdfCache';
import { exportExamToDocx } from '../lib/exportDocx';

const LETTERS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'OPEN', label: 'Açıq' },
];

function isOpenQuestion(question) {
  const type = String(question?.type || '');
  const kind = String(question?.inputKind || '');
  return type === 'OpenEnded' || ['Text', 'Integer', 'Decimal', 'Number'].includes(kind);
}

function letterOf(question) {
  if (isOpenQuestion(question)) return '';
  const correct = (question.options || []).find((o) => o.isCorrect);
  if (correct && isOpenChoiceOption(correct)) return 'OPEN';
  if (correct && isLetterOption(correct)) return optionLetter(correct);
  const idx = (question.options || []).findIndex((o) => o.isCorrect);
  if (idx < 0) return 'A';
  return LETTERS[idx]?.value || 'A';
}

export default function QuestionBuilder() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('edit');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfCount, setPdfCount] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [driveBusy, setDriveBusy] = useState(false);
  const [answerKey, setAnswerKey] = useState({});
  const [openKeys, setOpenKeys] = useState({});
  const [kinds, setKinds] = useState({});
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [examData, qs, me] = await Promise.all([
        fetchExam(id),
        fetchQuestions(id),
        fetchOwnProfile().catch(() => null),
      ]);
      setExam(examData);
      const fileId = examDriveFileId(examData);
      setDriveLink(fileId ? driveFileViewUrl(fileId) : '');
      setFolderUrl(me?.driveFolderUrl || '');
      setQuestions(qs);
      const nextKey = {};
      const nextOpen = {};
      const nextKinds = {};
      qs.forEach((q) => {
        nextKinds[q.id] = isOpenQuestion(q) ? (q.inputKind || 'Text') : 'Choice';
        nextKey[q.id] = letterOf(q);
        nextOpen[q.id] = q.correctText || '';
      });
      setAnswerKey(nextKey);
      setOpenKeys(nextOpen);
      setKinds(nextKinds);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const cached = peekTeacherPdf(id);
    if (cached) setPdfFile(cached);
  }, [id]);

  const refuseEdit = () => {
    if (!exam || examCanEdit(exam)) return false;
    setMessage('Bu imtahan yaradılandan 7 gün sonra yenidən redaktə üçün açılır.');
    return true;
  };

  const handleSaveDrive = async (e) => {
    if (refuseEdit()) {
      e?.preventDefault?.();
      return;
    }
    e.preventDefault();
    const fileId = parseDriveFileId(driveLink);
    if (!fileId) {
      setMessage('Google Drive fayl linkini yapışdırın (qovluq yox, konkret PDF).');
      return;
    }
    setDriveBusy(true);
    setMessage('');
    try {
      const pdfFileUrl = driveFileViewUrl(fileId);
      await updateExam(id, {
        subjectId: exam?.subjectId,
        title: exam?.title,
        durationMinutes: exam?.durationMinutes,
        totalQuestions: questions.length || exam?.totalQuestions || 1,
        startTime: exam?.startTime,
        endTime: exam?.endTime,
        status: exam?.status || 'Draft',
        isDraft: true,
        description: exam?.description,
        pdfFileUrl,
      });
      await saveDriveFileMarker(id, fileId);
      setDriveLink(pdfFileUrl);
      await load();
      setMessage('PDF bağlandı. Sual sayını yazıb hər sual üçün düzgün cavabı əl ilə daxil edin.');
    } catch (err) {
      setMessage(errorMessage(err, 'Drive linki saxlanılmadı.'));
    } finally {
      setDriveBusy(false);
    }
  };

  const paperQuestions = () => questions.filter((q) => !String(q.text || '').includes('__DRIVE__'));

  const seedAnswerSlots = async (count) => {
    const wanted = Math.max(1, Math.min(200, Number(count) || 0));
    const existing = paperQuestions();
    for (let i = existing.length; i < wanted; i += 1) {
      await addQuestion(id, {
        text: `Sual ${i + 1}`,
        points: 1,
        type: 'SingleChoice',
        inputKind: 'Choice',
        options: [
          { optionText: 'A', isCorrect: i === 0 },
          { optionText: 'B', isCorrect: false },
          { optionText: 'C', isCorrect: false },
          { optionText: 'D', isCorrect: false },
          { optionText: 'E', isCorrect: false },
          { optionText: 'Açıq', isCorrect: false },
        ],
      });
    }
  };

  const handlePdfAttach = async (e) => {
    e.preventDefault();
    if (refuseEdit()) return;
    if (!pdfFile) {
      setMessage('PDF seçin.');
      return;
    }
    setPdfBusy(true);
    setMessage('');
    try {
      stashTeacherPdf(id, pdfFile);
      const wanted = parseInt(pdfCount, 10);
      if (Number.isFinite(wanted) && wanted > 0) await seedAnswerSlots(wanted);
      await load();
      setMessage('PDF yükləndi. Suallar PDF-dən çıxarılmır — aşağıda hər sual üçün düzgün cavabı özünüz seçin.');
    } catch (err) {
      setMessage(errorMessage(err, 'PDF saxlanılmadı.'));
    } finally {
      setPdfBusy(false);
    }
  };

  const handleOpenAnswerSlots = async (e) => {
    e.preventDefault();
    if (refuseEdit()) return;
    const wanted = parseInt(pdfCount, 10);
    if (!Number.isFinite(wanted) || wanted < 1) {
      setMessage('Əvvəl sual sayını yazın.');
      return;
    }
    setPdfBusy(true);
    setMessage('');
    try {
      await seedAnswerSlots(wanted);
      await load();
      setMessage(`${wanted} sual yeri açıldı. Hər sualın düzgün variantını əl ilə seçin.`);
    } catch (err) {
      setMessage(errorMessage(err, 'Cavab yerləri açılmadı.'));
    } finally {
      setPdfBusy(false);
    }
  };

  const persistKey = async (nextKey, nextOpen = openKeys) => {
    const answers = questions.map((q) => {
      const kind = kinds[q.id] || (isOpenQuestion(q) ? q.inputKind : 'Choice');
      if (kind !== 'Choice') {
        return {
          questionId: q.id,
          type: 'OpenEnded',
          inputKind: kind,
          correctText: nextOpen[q.id] || '',
          correctLetter: '',
        };
      }
      const letter = nextKey[q.id] || 'A';
      return {
        questionId: q.id,
        type: 'SingleChoice',
        inputKind: 'Choice',
        correctLetter: letter,
        correctText: letter === 'OPEN' ? (nextOpen[q.id] || '') : '',
      };
    });
    const list = await saveAnswerKey(id, answers);
    setQuestions(list);
  };

  const handleMarkCorrect = async (question, letter) => {
    if (refuseEdit()) return;
    const nextKey = { ...answerKey, [question.id]: letter };
    setAnswerKey(nextKey);
    try {
      await persistKey(nextKey);
    } catch (err) {
      setMessage(errorMessage(err, 'Düzgün variant yazılmadı.'));
    }
  };

  const publishDraft = async (visibility = 'private') => {
    if (refuseEdit()) return;
    if (!exam) return;
    try {
      const start = exam.startTime || new Date().toISOString();
      const duration = exam.durationMinutes || 45;
      const end = exam.endTime || new Date(Date.now() + duration * 60 * 1000).toISOString();
      const status = new Date(start).getTime() > Date.now() ? 'Scheduled' : 'Live';
      const paperCount = paperQuestionsOf(questions).length;
      const fileId = examDriveFileId({ ...exam, pdfFileUrl: driveLink || exam.pdfFileUrl });
      if (!paperCount && !fileId) {
        setMessage('Əvvəl PDF-i bağlayın və ya sual sayını yazıb cavabları daxil edin, sonra dərc edin.');
        return;
      }
      if (fileId) await saveDriveFileMarker(id, fileId);
      await updateExam(id, {
        subjectId: exam.subjectId,
        title: exam.title,
        durationMinutes: duration,
        totalQuestions: paperCount || exam.totalQuestions || 1,
        startTime: start,
        endTime: end,
        status,
        isDraft: false,
        visibility,
        isPublic: visibility === 'public',
        description: exam.description,
        pdfFileUrl: driveFileViewUrl(examDriveFileId({ ...exam, pdfFileUrl: driveLink || exam.pdfFileUrl })),
      });
      if (user?.id) {
        const prev = localDb.getPublicTeachers().find((t) => String(t.id) === String(user.id));
        const subjects = new Set(prev?.subjects || []);
        if (exam.subjectName) subjects.add(exam.subjectName);
        localDb.upsertPublicTeacher({
          id: user.id,
          fullName: user.fullName || user.email,
          position: user.position || 'Digər',
          email: user.email,
          subjects: Array.from(subjects),
        });
      }
      dropTeacherPdf(id);
      setPdfFile(null);
      setMessage(
        paperCount
          ? (visibility === 'public'
            ? 'İmtahan açıq dərc olundu. Ümumi zonada fənninizə görə görünür.'
            : 'İmtahan özəl dərc olundu. Yalnız sizin şagirdləriniz görəcək.')
          : (visibility === 'public'
            ? 'İmtahan açıq dərc olundu. Şagirdlər PDF-i görəcək, cavablar sizin daxil etdiyiniz açardır.'
            : 'İmtahan özəl dərc olundu. Şagirdlər PDF-i görəcək, cavablar sizin daxil etdiyiniz açardır.'),
      );
      await load();
    } catch (err) {
      setMessage(errorMessage(err, 'İmtahan dərc olunmadı.'));
    }
  };

  return (
    <AppShell title="İmtahan vərəqi">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/teacher')}>
            <ArrowLeft size={16} /> Geri
          </Button>
          <div>
            <h2 className="text-xl font-bold">{exam?.title || `İmtahan #${id}`}</h2>
            <p className="text-sm text-gray-500">{exam?.subjectName} · {questions.length} sual</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="border border-gray-300 bg-white text-gray-900"
            onClick={() => publishDraft('private')}
          >
            Özəl dərc et
          </Button>
          <Button
            className="bg-brand-600 text-white"
            onClick={() => publishDraft('public')}
          >
            Açıq dərc et
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/teacher/exams/${id}/stats`)}>
            <BarChart3 size={16} /> Statistika
          </Button>
          <Button variant="secondary" onClick={() => exportExamToDocx(exam, questions)}>
            <FileDown size={16} /> Word export
          </Button>
        </div>
      </div>

      {location.state?.localSaved && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          İmtahan bu cihazda saxlanıldı. Sualları əlavə edin — vərəq görünüşü və Word export hazır olacaq.
        </div>
      )}

      <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100">
        Öz sınağınızda PDF yükləyin və hər sualın düzgün cavabını əl ilə seçin. AI ilə kartlara çevirmə yoxdur.
      </div>

      {exam && !examCanEdit(exam) ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Bu imtahan yaradılandan 7 gün sonra yenidən redaktə üçün açılır.
        </p>
      ) : null}

      {message && (
        <p className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100">
          {message}
        </p>
      )}

      <div className="mb-6 flex w-fit gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => setTab('edit')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            tab === 'edit' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-gray-500'
          }`}
        >
          Sualları idarə et
        </button>
        <button
          onClick={() => setTab('paper')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            tab === 'paper' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-gray-500'
          }`}
        >
          Vərəq görünüşü
        </button>
      </div>

      {tab === 'paper' ? (
        loading ? (
          <Skeleton className="h-[480px]" />
        ) : (
          <PaperPreview exam={exam} questions={questions} />
        )
      ) : (
        <div className="space-y-8">
          <Card>
            <h3 className="mb-2 text-base font-bold">1. PDF-i imtahana bağla</h3>
            <p className="mb-4 text-sm text-gray-500">
              Faylı “linki olanlar baxa bilər” edin, sonra <strong>faylın</strong> (qovluq yox) linkini yazın.
              Suallar PDF-dən çıxarılmır — şagird PDF-i görür, düzgün cavabları siz əl ilə yazırsınız.
            </p>
            {folderUrl ? (
              <a
                className="mb-4 inline-block text-sm font-medium text-brand-700 underline dark:text-brand-300"
                href={folderUrl}
                target="_blank"
                rel="noreferrer"
              >
                Sizin Drive qovluğunu açın
              </a>
            ) : null}
            <form onSubmit={handleSaveDrive} className="space-y-4">
              <Input
                label="Bu imtahanın Drive fayl linki"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view"
              />
              <Button type="submit" disabled={driveBusy}>
                {driveBusy ? 'Saxlanılır...' : 'Faylı imtahana bağla'}
              </Button>
            </form>
          </Card>

          <Card>
            <h3 className="mb-2 text-base font-bold">2. PDF yüklə və cavabları əl ilə yaz</h3>
            <p className="mb-4 text-sm text-gray-500">
              PDF-dən sual çıxarılmır. Sual sayını yazın, hər sual üçün A–E və ya Açıq düzgün cavabı seçin.
            </p>
            <form onSubmit={handlePdfAttach} className="space-y-4">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white"
              />
              <Input
                label="Sual sayı"
                type="number"
                min="1"
                max="200"
                value={pdfCount}
                onChange={(e) => setPdfCount(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pdfBusy}>
                  <Upload size={16} /> {pdfBusy ? 'Saxlanılır...' : 'PDF-i yüklə'}
                </Button>
                <Button type="button" variant="secondary" disabled={pdfBusy} onClick={handleOpenAnswerSlots}>
                  Cavab yerlərini aç
                </Button>
              </div>
            </form>
          </Card>

          {examDriveFileId({ ...exam, pdfFileUrl: driveLink }) ? (
            <DrivePreview exam={{ ...exam, pdfFileUrl: driveLink }} title="Bu imtahanın PDF-i" />
          ) : null}

          {loading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : (
            <div className={pdfFile ? 'grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]' : ''}>
              {pdfFile ? (
                <PdfViewer file={pdfFile} title="Orijinal PDF — yalnız müəllim" />
              ) : null}
              <div className="space-y-4">
          {questions.filter((q) => !String(q.text || '').includes('__DRIVE__')).length === 0 ? (
            <Card className="text-sm text-gray-500">
              PDF-i yükləyin və sual sayını yazın. Sonra hər sualın düzgün cavabını əl ilə seçin.
            </Card>
          ) : (
            questions.filter((q) => !String(q.text || '').includes('__DRIVE__')).map((q, idx) => (
              <Card key={q.id || idx} className="space-y-3">
                <p className="text-sm font-extrabold">Sual {idx + 1}</p>
                <div className="flex flex-wrap gap-2">
                  {LETTERS.map((letter) => {
                    const current = answerKey[q.id] || letterOf(q);
                    const on = current === letter.value;
                    return (
                      <button
                        key={letter.value}
                        type="button"
                        onClick={() => handleMarkCorrect(q, letter.value)}
                        className={`min-h-10 min-w-10 rounded-full px-3 text-sm font-extrabold ${
                          on ? 'bg-[#7c6aff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'
                        }`}
                      >
                        {letter.label}
                      </button>
                    );
                  })}
                </div>
                {(answerKey[q.id] || letterOf(q)) === 'OPEN' ? (
                  <Input
                    label="Açıq düzgün cavab"
                    value={openKeys[q.id] || ''}
                    onChange={(e) => {
                      const nextOpen = { ...openKeys, [q.id]: e.target.value };
                      setOpenKeys(nextOpen);
                    }}
                    onBlur={() => persistKey(answerKey, { ...openKeys })}
                  />
                ) : null}
              </Card>
            ))
          )}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

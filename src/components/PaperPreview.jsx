import { isLetterOption, isOpenChoiceOption, optionLetter } from '../lib/utils';

function isFullyOpen(question) {
  const type = String(question?.type || '');
  const kind = String(question?.inputKind || '');
  return type === 'OpenEnded' || ['Text', 'Integer', 'Decimal', 'Number'].includes(kind);
}

export default function PaperPreview({ exam, questions }) {
  return (
    <div className="paper-sheet mx-auto min-h-[297mm] max-w-[210mm] rounded-sm border border-amber-100 px-10 py-12 text-[#1f2937]">
      <div className="border-b border-dashed border-gray-300 pb-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">ExamPulse · İmtahan vərəqi</p>
        <h2 className="mt-3 text-2xl font-bold">{exam?.title || 'İmtahan'}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {exam?.subjectName || 'Fənn'} · {questions.length} sual · {exam?.durationMinutes || '—'} dəqiqə
        </p>
      </div>
      <div className="mt-8 flex gap-8 text-sm">
        <p>Ad, soyad: _______________________</p>
        <p>Tarix: ____________</p>
      </div>
      <ol className="mt-10 space-y-8">
        {questions.map((q, idx) => (
          <li key={q.id || idx}>
            <p className="font-medium leading-relaxed">
              <span className="mr-2 font-bold">{idx + 1}.</span>
              {q.text}
            </p>
            {isFullyOpen(q) ? (
              <p className="mt-3 pl-6 text-sm">Açıq cavab: _______________________</p>
            ) : (
              <div className="mt-3 space-y-1.5 pl-6 text-sm">
                {(q.options || []).filter((opt) => !isOpenChoiceOption(opt)).map((opt, oi) => {
                  const letter = isLetterOption(opt) ? optionLetter(opt) : String.fromCharCode(65 + oi);
                  const label = String(opt.optionText || opt.text || '').trim();
                  const shown = /^[A-E]$/i.test(label) ? letter : `${letter}) ${label}`;
                  return <p key={opt.id || oi}>{shown}</p>;
                })}
                <p>○ Açıq — ________________________________</p>
              </div>
            )}
          </li>
        ))}
      </ol>
      {!questions.length && (
        <p className="mt-10 text-center text-sm text-gray-400">Hələ sual yoxdur.</p>
      )}
    </div>
  );
}

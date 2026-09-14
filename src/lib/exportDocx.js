import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export async function exportExamToDocx(exam, questions) {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: exam?.title || 'İmtahan', bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `${exam?.subjectName || 'Fənn'}  ·  ${questions.length} sual  ·  ${exam?.durationMinutes || '—'} dəqiqə`,
          italics: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Ad, soyad: ______________________     ', size: 22 }),
        new TextRun({ text: 'Tarix: ____________', size: 22 }),
      ],
    }),
  ];

  questions.forEach((q, idx) => {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: q.text || '' }),
        ],
      }),
    );
    (q.options || []).forEach((opt, oi) => {
      const letter = String.fromCharCode(65 + oi);
      children.push(
        new Paragraph({
          indent: { left: 360 },
          children: [new TextRun({ text: `${letter}) ${opt.optionText || opt.text || ''}` })],
        }),
      );
    });
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  const blob = await Packer.toBlob(doc);
  const safe = (exam?.title || 'imtahan').replace(/[^\w\-]+/g, '_');
  saveAs(blob, `${safe}.docx`);
}

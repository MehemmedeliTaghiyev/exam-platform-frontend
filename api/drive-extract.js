import { extractTextFromPdfBuffer, loadDrivePdfBuffer, parseDrivePdfId } from './drivePdf.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const id = parseDrivePdfId(req.query?.id || req.body?.id);
  if (!id) {
    res.status(400).json({ error: 'bad id' });
    return;
  }
  try {
    const buf = await loadDrivePdfBuffer(id);
    if (!buf) {
      res.status(404).json({ error: 'pdf yoxdur' });
      return;
    }
    const text = String(await extractTextFromPdfBuffer(buf) || '').trim();
    if (text.length < 40) {
      res.status(422).json({ error: 'PDF-dən mətn çıxmadı. Mətnli PDF lazımdır.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ text: text.slice(0, 24000) });
  } catch (err) {
    const detail = String(err?.message || err || '').slice(0, 180);
    res.status(502).json({ error: 'PDF oxunmadı.', detail });
  }
}

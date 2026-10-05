import { loadDrivePdfBuffer, parseDrivePdfId } from './drivePdf.js';

export default async function handler(req, res) {
  const id = parseDrivePdfId(req.query?.id);
  if (!id) {
    res.status(400).send('bad id');
    return;
  }
  const buf = await loadDrivePdfBuffer(id);
  if (!buf) {
    res.status(404).send('pdf yoxdur');
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="exam.pdf"');
  res.setHeader('Cache-Control', 'public, max-age=120');
  res.setHeader('Content-Length', String(buf.length));
  res.status(200).send(buf);
}

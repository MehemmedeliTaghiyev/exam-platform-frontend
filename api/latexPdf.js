import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true, windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', () => resolve({ ok: false, stderr }))
    child.on('close', (code) => resolve({ ok: code === 0, stderr }))
  })
}

function simplePdf(title = 'ExamPulse') {
  const text = String(title || 'ExamPulse').replace(/[()\\]/g, ' ').slice(0, 80)
  const stream = `BT /F1 18 Tf 72 760 Td (${text}) Tj T* /F1 12 Tf 0 -28 Td (LaTeX/TikZ PDF. TeX installed deyilse yerli sablon.) Tj ET`
  const body = `<< /Length ${stream.length} >> stream\n${stream}\nendstream`
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj ${body} endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${obj}\n`
  })
  const start = Buffer.byteLength(pdf)
  pdf += `xref\n0 6\n0000000000 65535 f \n`
  for (let i = 1; i <= 5; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`
  return Buffer.from(pdf, 'utf8')
}

export async function compileLatexToPdfBuffer(source, title = 'ExamPulse') {
  const tex = String(source || '').trim()
  if (!tex) return { buffer: simplePdf(title), fallback: true }
  const dir = await mkdtemp(join(tmpdir(), 'exampulse-tex-'))
  try {
    await writeFile(join(dir, 'main.tex'), tex, 'utf8')
    const tectonic = await run('tectonic', ['-X', 'compile', 'main.tex'], dir)
    let pdfPath = join(dir, 'main.pdf')
    if (!tectonic.ok) {
      const pdflatex = await run('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'main.tex'], dir)
      if (!pdflatex.ok) {
        return { buffer: simplePdf(title), fallback: true, error: pdflatex.stderr || tectonic.stderr }
      }
    }
    const buffer = await readFile(pdfPath)
    return { buffer, fallback: false }
  } catch (err) {
    return { buffer: simplePdf(title), fallback: true, error: String(err?.message || err) }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

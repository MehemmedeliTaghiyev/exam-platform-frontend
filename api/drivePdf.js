const ID_RE = /^[a-zA-Z0-9_-]{20,}$/;

export function parseDrivePdfId(raw) {
  const s = String(raw || '').trim();
  return ID_RE.test(s) ? s : '';
}

export async function loadDrivePdfBuffer(id) {
  const safe = parseDrivePdfId(id);
  if (!safe) return null;
  const urls = [
    `https://drive.google.com/uc?export=download&id=${safe}`,
    `https://drive.google.com/uc?export=download&id=${safe}&confirm=t`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'application/pdf,*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 5 && buf.subarray(0, 5).toString() === '%PDF-') return buf;
    } catch {
      /* next url */
    }
  }
  return null;
}

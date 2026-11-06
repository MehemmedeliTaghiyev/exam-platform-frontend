import fs from 'fs';
import path from 'path';

const FILE_NAME = 'exampulse-urgent-hub.json';

function emptyStore() {
  return { messages: [], subscriptions: [] };
}

function localPath() {
  return path.join(process.cwd(), '.data', FILE_NAME);
}

function parseStore(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    return {
      messages: Array.isArray(data.messages) ? data.messages : [],
      subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
    };
  } catch {
    return emptyStore();
  }
}

function useDrive() {
  return Boolean(process.env.VERCEL || process.env.URGENT_DRIVE);
}

async function driveToken() {
  if (!useDrive()) return '';
  const refresh = String(process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim();
  const clientId = String(process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  if (!refresh || !clientId || !clientSecret) return '';
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(4000),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? String(data.access_token || '') : '';
}

async function findDriveFile(token) {
  const parent = String(process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '').trim();
  let q = `name='${FILE_NAME}' and trashed=false`;
  if (parent) q += ` and '${parent}' in parents`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000) });
  const data = await res.json().catch(() => ({}));
  return data.files?.[0]?.id || '';
}

async function createDriveFile(token, store) {
  const parent = String(process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '').trim();
  const metadata = { name: FILE_NAME };
  if (parent) metadata.parents = [parent];
  const boundary = `exampulse_${Date.now()}`;
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(store)}\r\n--${boundary}--`;
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(4000),
  });
  const data = await res.json().catch(() => ({}));
  return data.id || '';
}

function readLocal() {
  try {
    return parseStore(fs.readFileSync(localPath(), 'utf8'));
  } catch {
    return emptyStore();
  }
}

function writeLocal(store) {
  try {
    const dir = path.dirname(localPath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath(), JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export async function loadUrgentStore() {
  const local = readLocal();
  try {
    const token = await driveToken();
    if (token) {
      const id = await findDriveFile(token);
      if (id) {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) return parseStore(await res.text());
      }
    }
  } catch {
    return local;
  }
  return local;
}

export async function saveUrgentStore(store) {
  const next = {
    messages: (store.messages || []).slice(0, 50),
    subscriptions: store.subscriptions || [],
  };
  writeLocal(next);
  try {
    const token = await driveToken();
    if (!token) return next;
    let id = await findDriveFile(token);
    if (!id) id = await createDriveFile(token, next);
    else {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(next),
        signal: AbortSignal.timeout(4000),
      });
    }
  } catch {
    /* local already written */
  }
  return next;
}

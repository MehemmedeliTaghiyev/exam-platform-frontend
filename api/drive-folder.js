function folderNameOf(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  return name.slice(0, 120);
}

async function driveAccessToken() {
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
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || 'Drive icazəsi alınmadı');
    err.status = res.status;
    throw err;
  }
  return String(data.access_token || '');
}

export async function createTeacherDriveFolder(name) {
  const folderName = folderNameOf(name);
  if (!folderName) {
    const err = new Error('Müəllim adı lazımdır');
    err.status = 400;
    throw err;
  }
  const token = await driveAccessToken();
  if (!token) {
    const err = new Error('Drive qovluğu üçün Google OAuth açarı yoxdur');
    err.status = 503;
    throw err;
  }
  const parent = String(process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '').trim();
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parent) metadata.parents = [parent];
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    const err = new Error(data.error?.message || 'Drive qovluğu yaranmadı');
    err.status = res.status || 502;
    throw err;
  }
  const share = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(data.id)}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!share.ok) {
    const shareBody = await share.json().catch(() => ({}));
    const err = new Error(shareBody.error?.message || 'Qovluq public paylaşılmadı');
    err.status = share.status || 502;
    throw err;
  }
  return {
    id: data.id,
    name: data.name || folderName,
    url: `https://drive.google.com/drive/folders/${data.id}?usp=sharing`,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Yalnız POST' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const folder = await createTeacherDriveFolder(body.name);
    res.status(200).json(folder);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err.message || 'Drive qovluğu yaranmadı') });
  }
}

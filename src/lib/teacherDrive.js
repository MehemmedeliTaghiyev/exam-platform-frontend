export function teacherFolderName(teacher) {
  const full = String(
    teacher?.fullName
    || [teacher?.firstName, teacher?.lastName].filter(Boolean).join(' ')
    || '',
  ).replace(/\s+/g, ' ').trim();
  return full;
}

export async function createTeacherDriveFolder(name) {
  const folderName = teacherFolderName({ fullName: name });
  if (!folderName) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let res;
  try {
    res = await fetch('/drive-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    const err = new Error(data.error || 'Drive qovluğu yaranmadı');
    err.status = res.status;
    throw err;
  }
  return data;
}

const EMAIL_KEY = 'exampulse_remember_login';
const FLAGS_KEY = 'exampulse_remember_flags';
const SECRET_KEY = 'exampulse_remember_secret';

function readFlags() {
  try {
    const raw = JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}');
    return {
      rememberEmail: Boolean(raw.rememberEmail),
      rememberPassword: Boolean(raw.rememberPassword),
    };
  } catch {
    return { rememberEmail: false, rememberPassword: false };
  }
}

export function readRemembered() {
  const flags = readFlags();
  const email = flags.rememberEmail ? String(localStorage.getItem(EMAIL_KEY) || '').trim() : '';
  let password = '';
  if (flags.rememberPassword && email) {
    try {
      const raw = JSON.parse(localStorage.getItem(SECRET_KEY) || 'null');
      if (raw && String(raw.email || '').trim().toLowerCase() === email.toLowerCase()) {
        password = String(raw.password || '');
      }
    } catch {
      password = '';
    }
  }
  return {
    email,
    password,
    rememberEmail: Boolean(email) || flags.rememberEmail,
    rememberPassword: Boolean(password) || flags.rememberPassword,
  };
}

function storeBrowserCredential(email, password) {
  if (!email || !password || typeof window === 'undefined') return;
  try {
    if (window.PasswordCredential) {
      navigator.credentials.store(new window.PasswordCredential({ id: email, password })).catch(() => {});
    }
  } catch {
    /* WebView may not support Credential Management */
  }
}

export async function readBrowserCredential() {
  try {
    if (!navigator.credentials?.get) return null;
    const cred = await navigator.credentials.get({ password: true, mediation: 'silent' });
    if (cred && cred.password) {
      return { email: String(cred.id || '').trim(), password: String(cred.password || '') };
    }
  } catch {
    /* user dismissed or unsupported */
  }
  return null;
}

export function saveRemembered({ email, password, rememberEmail, rememberPassword }) {
  const keepEmail = Boolean(rememberEmail || rememberPassword);
  const keepPassword = Boolean(rememberPassword && keepEmail);
  const trimmed = String(email || '').trim();
  if (keepEmail && trimmed) localStorage.setItem(EMAIL_KEY, trimmed);
  else localStorage.removeItem(EMAIL_KEY);

  localStorage.setItem(FLAGS_KEY, JSON.stringify({
    rememberEmail: keepEmail,
    rememberPassword: keepPassword,
  }));

  if (keepPassword && trimmed && password) {
    localStorage.setItem(SECRET_KEY, JSON.stringify({ email: trimmed, password: String(password) }));
    storeBrowserCredential(trimmed, password);
  } else {
    localStorage.removeItem(SECRET_KEY);
  }
}

const API = process.env.EXAM_API || 'https://exampulse.az/api';
const PASS = process.env.SINAQ_PASSWORD || 'Sinaq2026a';
const TEACHERS = 15;
const STUDENTS = 25;

function pad(n, w = 2) {
  return String(n).padStart(w, '0');
}

function unwrap(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  return data.data || data.result || data.user || data;
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} ${res.status}: ${text.slice(0, 240)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function registerTeacher(i) {
  const nn = pad(i);
  const email = `sinaq${nn}_muellim@gmail.com`;
  const trialStartsAt = new Date().toISOString();
  const ends = new Date();
  ends.setDate(ends.getDate() + 20);
  const payload = {
    firstName: 'Sinaq',
    lastName: `Muellim${nn}`,
    fullName: `Sinaq Muellim${nn}`,
    position: 'Bakı',
    phone: `05010000${nn}`,
    email,
    password: PASS,
    role: 'Teacher',
    Role: 'Teacher',
    isAccessEnabled: true,
    IsAccessEnabled: true,
    trialDays: 20,
    TrialDays: 20,
    trialStartsAt,
    TrialStartsAt: trialStartsAt,
    trialEndsAt: ends.toISOString(),
    TrialEndsAt: ends.toISOString(),
    billingPlan: 'FreeTrial',
    BillingPlan: 'FreeTrial',
    trialMessage: '20 günlük sınaq müddəti avtomatik başladı.',
  };
  try {
    await req('POST', '/Auth/register', payload);
    return { email, created: true };
  } catch (err) {
    if (err.status === 400 || err.status === 409) return { email, created: false, exists: true };
    throw err;
  }
}

async function login(email) {
  const data = await req('POST', '/Auth/login', { email, password: PASS });
  const token = data.token || data.accessToken;
  const user = unwrap(data) || data;
  return { token, user };
}

async function ensureGroup(token, i) {
  const name = `Sinaq ${pad(i)}`;
  try {
    const created = unwrap(await req('POST', '/Groups', { name, number: name, schedule: 'Sınaq' }, token));
    return created;
  } catch {
    const list = unwrap(await req('GET', '/Groups', null, token));
    const groups = Array.isArray(list) ? list : [];
    return groups.find((g) => String(g.name || g.Name || g.number || '') === name) || groups[0] || null;
  }
}

function inviteOf(group) {
  if (!group) return '';
  return group.inviteCode || group.InviteCode || (group.id || group.Id ? `g${group.id || group.Id}` : '');
}

async function registerStudent(teacherIndex, studentIndex, inviteCode) {
  const tn = pad(teacherIndex);
  const sn = pad(studentIndex);
  const email = `sinaq${tn}.t${sn}_ata@gmail.com`;
  const payload = {
    inviteCode,
    InviteCode: inviteCode,
    firstName: `Telebe${sn}`,
    lastName: `Sinaq${tn}`,
    fatherName: 'Ata',
    phone: `051${tn}${sn}00`,
    email,
    password: PASS,
    role: 'Student',
    independent: false,
  };
  try {
    const created = unwrap(await req('POST', '/Auth/register-student', payload));
    return { email, id: created?.id || created?.Id, created: true };
  } catch (err) {
    if (err.status === 400 || err.status === 409) return { email, created: false, exists: true };
    throw err;
  }
}

async function enableStudent(token, id) {
  if (!id) return;
  await req('PATCH', `/Users/${id}/access`, { enabled: true }, token);
}

const summary = { teachersOk: 0, teachersSkip: 0, studentsOk: 0, studentsSkip: 0, errors: [] };

for (let i = 1; i <= TEACHERS; i += 1) {
  try {
    const t = await registerTeacher(i);
    if (t.created) summary.teachersOk += 1;
    else summary.teachersSkip += 1;
    await sleep(150);
    const session = await login(t.email);
    await sleep(150);
    const group = await ensureGroup(session.token, i);
    const invite = inviteOf(group);
    if (!invite) {
      summary.errors.push(`teacher ${i}: qrup invite yoxdur`);
      continue;
    }
    for (let s = 1; s <= STUDENTS; s += 1) {
      try {
        const st = await registerStudent(i, s, invite);
        if (st.created) summary.studentsOk += 1;
        else summary.studentsSkip += 1;
        if (st.id && session.token) {
          try {
            await enableStudent(session.token, st.id);
          } catch {
            /* teacher may not patch until approved */
          }
        }
      } catch (err) {
        summary.errors.push(`t${i}s${s}: ${err.message}`);
      }
      await sleep(80);
    }
    console.log(`teacher ${i}/${TEACHERS} done ${t.email}`);
  } catch (err) {
    summary.errors.push(`teacher ${i}: ${err.message}`);
    console.error(err.message);
  }
}

console.log(JSON.stringify(summary, null, 2));

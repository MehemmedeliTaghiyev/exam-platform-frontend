import webpush from 'web-push';
import { loadUrgentStore, saveUrgentStore } from './urgentStore.js';
import { VAPID_MAILTO, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY } from './vapid.js';

webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    return {};
  }
}

function validSub(row) {
  return row && row.endpoint && row.keys?.p256dh && row.keys?.auth;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const store = await loadUrgentStore();
    json(res, 200, {
      vapidPublicKey: VAPID_PUBLIC_KEY,
      messages: store.messages.slice(0, 20),
    });
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Yalnız GET/POST' });
    return;
  }

  const body = await readBody(req);
  const action = String(body.action || '');

  if (action === 'subscribe') {
    const sub = body.subscription || body;
    if (!validSub(sub)) {
      json(res, 400, { error: 'Abunə tapılmadı' });
      return;
    }
    const store = await loadUrgentStore();
    const next = {
      ...store,
      subscriptions: [
        { endpoint: sub.endpoint, keys: sub.keys, userId: body.userId ?? null, at: new Date().toISOString() },
        ...store.subscriptions.filter((row) => row.endpoint !== sub.endpoint),
      ].slice(0, 4000),
    };
    await saveUrgentStore(next);
    json(res, 200, { ok: true });
    return;
  }

  if (action === 'send') {
    const text = String(body.text || '').trim().slice(0, 800);
    if (!text) {
      json(res, 400, { error: 'Mətn boşdur' });
      return;
    }
    const row = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      at: new Date().toISOString(),
      fromName: String(body.fromName || 'Admin').slice(0, 80),
      fromId: body.fromId ?? null,
    };
    const store = await loadUrgentStore();
    const payload = JSON.stringify({
      title: 'Təcili mesaj',
      body: text,
      url: '/',
      id: row.id,
    });
    const alive = [];
    let delivered = 0;
    await Promise.all(store.subscriptions.map(async (sub) => {
      if (!validSub(sub)) return;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        delivered += 1;
        alive.push(sub);
      } catch (err) {
        const status = Number(err?.statusCode || 0);
        if (status !== 404 && status !== 410) alive.push(sub);
      }
    }));
    await saveUrgentStore({
      messages: [row, ...store.messages],
      subscriptions: alive,
    });
    json(res, 200, { ok: true, message: row, delivered, subscribers: alive.length });
    return;
  }

  json(res, 400, { error: 'Naməlum əməliyyat' });
}

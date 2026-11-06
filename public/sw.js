self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Təcili mesaj';
  const body = data.body || data.text || 'ExamPulse-dən yeni mesaj';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/app-icon-1024.png',
      badge: '/logo.svg',
      tag: data.id || 'exampulse-urgent',
      renotify: true,
      data: { url: data.url || '/', id: data.id || '' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows[0]) {
      await windows[0].focus();
      if (windows[0].navigate) await windows[0].navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});

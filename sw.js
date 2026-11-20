/* AbertoCore: service worker só para notificações push (não guarda cache do app). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var m = {};
  try { m = e.data ? e.data.json() : {}; } catch (err) { m = { corpo: e.data && e.data.text() }; }
  var titulo = m.titulo || 'AbertoCore';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: m.corpo || '',
    tag: m.tag || undefined,
    renotify: !!m.tag,
    icon: 'icone-192.png',
    badge: 'icone-192.png',
    data: { url: m.url || '/#mensagens', contato: m.contato || null, ia: !!m.ia }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var d = e.notification.data || {};
  var alvo = new URL(d.url || '/#mensagens', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      if (c.url.indexOf(self.registration.scope) === 0) {
        c.postMessage({ abertocoreNotif: true, contato: d.contato, ia: d.ia });
        return c.focus();
      }
    }
    var u = alvo + (d.ia ? '' : (d.contato ? (alvo.indexOf('?') < 0 ? '?' : '&') + 'c=' + d.contato : ''));
    if (d.ia) u = alvo + (alvo.indexOf('?') < 0 ? '?' : '&') + 'ia=1';
    return self.clients.openWindow(u);
  }));
});

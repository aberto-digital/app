// AbertoCore: envio de notificações push (Web Push / VAPID).
// Só é acessível dentro da rede do docker (o PocketBase chama http://ad-push:3000).
// As chaves VAPID são criadas no primeiro uso e ficam em /data/vapid.json (volume).
'use strict';
const http = require('http');
const fs = require('fs');
const webpush = require('web-push');

const ARQ = '/data/vapid.json';
let chaves;
try { chaves = JSON.parse(fs.readFileSync(ARQ, 'utf8')); }
catch (e) {
  chaves = webpush.generateVAPIDKeys();
  fs.writeFileSync(ARQ, JSON.stringify(chaves), { mode: 0o600 });
  console.log('push: chaves VAPID criadas');
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@abertodigital.com', chaves.publicKey, chaves.privateKey);

function corpo(req) {
  return new Promise((ok, falha) => {
    let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { falha(e); } });
  });
}
function json(res, st, o) { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); }

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/chave') return json(res, 200, { publicKey: chaves.publicKey });
    if (req.method === 'POST' && req.url === '/envia') {
      const b = await corpo(req);
      const msg = JSON.stringify(b.mensagem || {});
      const expiradas = [];
      let enviadas = 0;
      await Promise.all((b.inscricoes || []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, { TTL: 3600, urgency: 'high', topic: (b.mensagem && b.mensagem.tag || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined });
          enviadas++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) expiradas.push(s.endpoint);
          else console.log('push: falhou', e.statusCode || '', String(e.body || e.message).slice(0, 200));
        }
      }));
      return json(res, 200, { enviadas, expiradas });
    }
    json(res, 404, { erro: 'não encontrado' });
  } catch (e) { json(res, 500, { erro: String(e.message || e) }); }
}).listen(3000, () => console.log('push: ouvindo na porta 3000'));

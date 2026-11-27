/* AbertoCore · Link de experiência: chat do site com a IA de verdade.
   Manda o cardápio do nicho e as últimas mensagens para POST /api/experiencia/ia.
   Sem rede ou com erro, responde com a mensagem pronta do nicho. A conversa fica no
   sessionStorage (abertocore-experiencia-chat) para aparecer na vitrine. */
(function (raiz) {
  var noNode = typeof module !== 'undefined' && module.exports;
  var NICHOS = noNode ? require('./nichos.js') : raiz.NICHOS;
  var API = 'https://api.abertodigital.com/api/experiencia/ia';
  var CHAVE = 'abertocore-experiencia-chat';
  var PRONTA = {
    pt: 'Oi! Agora estou com muitas mensagens. Você pode montar seu pedido pelo cardápio aqui no site: é só tocar no + dos itens.',
    en: "Hi! I'm handling a lot of messages right now. You can build your order from the menu on this page: just tap the + on the items.",
  };

  function corpo(cfg, msgs) {
    var l = cfg.l, itens = [];
    NICHOS[cfg.n].categorias.forEach(function (c) { c.itens.forEach(function (i) { itens.push({ cat: c.nome[l], nome: i.nome[l], preco: l === 'en' ? i.precoUsd : i.preco }); }); });
    return { n: cfg.n, nome: cfg.nome, cidade: cfg.cidade, l: l, itens: itens, msgs: msgs.map(function (m) { return { de: m.de, txt: m.txt }; }) };
  }

  function envia(cfg, msgs, f, url) {
    f = f || (typeof fetch !== 'undefined' ? fetch : null);
    return Promise.resolve().then(function () {
      return f(url || API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo(cfg, msgs)) });
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.texto) || PRONTA[cfg.l]; })
      .catch(function () { return PRONTA[cfg.l]; });
  }

  // ---------------- navegador ----------------
  var hist = [];
  function historico() { return hist.slice(); }
  function salva(win) { try { win.sessionStorage.setItem(CHAVE, JSON.stringify(hist)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function monta(doc, win) {
    var cfg = win.EXP.cfg, en = cfg.l === 'en';
    try { hist = JSON.parse(win.sessionStorage.getItem(CHAVE) || '[]') || []; } catch (e) { hist = []; }
    var saud = en ? 'Hi! I am the virtual assistant of ' + cfg.nome + '. How can I help you today?' : 'Oi! Sou o atendente virtual da ' + cfg.nome + '. Posso te ajudar a escolher?';
    if (!hist.length) hist.push({ de: 'ia', txt: saud, ts: Date.now() });
    var bolha = doc.createElement('button'); bolha.className = 'bolha-chat sem-carrinho'; bolha.type = 'button'; bolha.setAttribute('aria-label', en ? 'Chat' : 'Conversar'); bolha.textContent = '💬';
    var painel = doc.createElement('section'); painel.className = 'chat oculto'; painel.setAttribute('aria-label', 'Chat');
    painel.innerHTML = '<div class="cab"><div class="logo" data-logo></div><div><b>' + esc(cfg.nome) + '</b><small>● ' + (en ? 'online now' : 'online agora') + '</small></div><button class="fechar" type="button" aria-label="Fechar">×</button></div>' +
      '<div class="fio" aria-live="polite"></div><form><input autocomplete="off" maxlength="400" placeholder="' + (en ? 'Type a message' : 'Escreva uma mensagem') + '" aria-label="Mensagem"><button aria-label="Enviar">➤</button></form>' +
      '<p class="nota">' + (en ? 'Real AI answering · demo' : 'IA de verdade respondendo · demonstração') + '</p>';
    doc.body.appendChild(bolha); doc.body.appendChild(painel);
    if (win.Marca) win.Marca.aplica(cfg, doc);
    var fio = painel.querySelector('.fio'), input = painel.querySelector('input'), ocupado = false;
    function desenha(digitando) {
      fio.innerHTML = hist.map(function (m) { return '<div class="m ' + (m.de === 'cli' ? 'cli' : 'ia') + '">' + esc(m.txt) + '</div>'; }).join('') + (digitando ? '<div class="m ia dig">' + (en ? 'typing…' : 'digitando…') + '</div>' : '');
      fio.scrollTop = fio.scrollHeight;
    }
    bolha.onclick = function () { painel.classList.remove('oculto'); bolha.classList.add('oculto'); desenha(); input.focus(); };
    painel.querySelector('.fechar').onclick = function () { painel.classList.add('oculto'); bolha.classList.remove('oculto'); };
    painel.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      var t = input.value.trim(); if (!t || ocupado) return;
      ocupado = true; input.value = '';
      hist.push({ de: 'cli', txt: t, ts: Date.now() }); salva(win); desenha(true);
      envia(cfg, hist, null, win.EXP_API).then(function (r) { hist.push({ de: 'ia', txt: r, ts: Date.now() }); salva(win); ocupado = false; desenha(); });
    };
  }

  var Chat = { corpo: corpo, envia: envia, monta: monta, historico: historico, CHAVE: CHAVE };
  if (noNode) module.exports = Chat;
  else raiz.Chat = Chat;
})(typeof window !== 'undefined' ? window : this);

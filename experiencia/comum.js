/* AbertoCore · Link de experiência: peças comuns dos modelos Agendamento e Orçamento
   (escape de HTML, QR code de exemplo, folha que sobe de baixo e tela de transição). */
(function (raiz) {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function qrFalso() {
    var s = '<svg class="qr" viewBox="0 0 21 21" shape-rendering="crispEdges" aria-label="QR code de exemplo">', x, y, k = 7;
    function canto(a, b) { s += '<rect x="' + a + '" y="' + b + '" width="7" height="7"/><rect x="' + (a + 1) + '" y="' + (b + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (a + 2) + '" y="' + (b + 2) + '" width="3" height="3"/>'; }
    canto(0, 0); canto(14, 0); canto(0, 14);
    for (y = 0; y < 21; y++) for (x = 0; x < 21; x++) {
      if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
      k = (k * 1103515245 + 12345) & 0x7fffffff;
      if (k % 3 === 0) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return s + '</svg>';
  }
  // foto do item (arquivo local em fotos/ ou https) ou, sem foto, o emoji
  function visual(it) { return it.foto && /^(fotos\/[\w.-]+|https:\/\/[^\s"'<>]+)$/.test(it.foto) ? '<img alt="" loading="lazy" decoding="async" src="' + esc(it.foto) + '">' : '<span aria-hidden="true">' + it.img + '</span>'; }
  // conteúdo da capa: colagem das fotos do nicho (até 5) ou, sem fotos, emojis
  function capaHtml(itens) {
    var f = [], vistos = {};
    itens.forEach(function (i) { if (i.foto && !vistos[i.foto]) { vistos[i.foto] = 1; f.push(i.foto); } });
    if (f.length >= 3) return { cls: 'capa fotos', html: f.slice(0, 5).map(function (u) { return '<img alt="" decoding="async" src="' + esc(u) + '">'; }).join('') };
    var e = itens.map(function (i) { return i.img; });
    return { cls: 'capa', html: e.concat(e).slice(0, 14).map(function (x) { return '<span>' + x + '</span>'; }).join('') };
  }
  var PIX_EX = '00020126580014BR.GOV.BCB.PIX-EXEMPLO-DEMONSTRACAO-ABERTODIGITAL5204000053039865802BR';

  // folha que sobe de baixo (mesmo estilo do carrinho do modelo Pedido)
  function folha(doc) {
    var el = doc.createElement('div'); el.className = 'folha oculto'; doc.body.appendChild(el);
    var f = {
      el: el,
      abre: function (html) { el.innerHTML = '<div class="caixa" role="dialog" aria-modal="true">' + html + '</div>'; el.classList.remove('oculto'); var c = el.querySelector('.caixa'); if (c) c.scrollTop = 0; },
      fecha: function () { el.classList.add('oculto'); el.innerHTML = ''; },
    };
    el.addEventListener('click', function (e) { if (e.target === el || e.target.closest('.fechar')) f.fecha(); });
    return f;
  }

  function transicao(titulo, sub, href, botao, en) {
    return '<div class="transicao"><div class="ok">✓</div><h2>' + esc(titulo) + '</h2>' + (sub ? '<p style="font-weight:700">' + esc(sub) + '</p>' : '') +
      '<p style="color:var(--sec)">' + (en ? 'This is what your customer sees.' : 'É isso que o seu cliente vê.') + '</p>' +
      '<a class="btn" href="' + esc(href) + '">' + esc(botao) + '</a></div>';
  }


  // casca visual dos modelos Agendamento e Orçamento: capa, navegação e status "Aberto"
  // (o modelo Pedido monta a sua própria em pedido.js)
  function casca(doc, win, modelo, en, itens) {
    doc.body.setAttribute('data-m', modelo);
    var rot = en ? [['Home', 'Services', 'Reviews', 'Profile']] : [['Início', 'Serviços', 'Avaliações', 'Perfil']];
    var nav = doc.createElement('nav'); nav.className = 'nav-p'; nav.setAttribute('aria-label', 'Principal');
    nav.innerHTML = [['inicio', '🏠'], ['servicos', '🧰'], ['aval', '⭐'], ['perfil', '👤']].map(function (x, i) {
      return '<button type="button" data-nav="' + x[0] + '"' + (i === 0 ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + x[1] + '</span><b>' + rot[0][i] + '</b></button>';
    }).join('');
    var topo = doc.querySelector('.topo'); topo.parentNode.insertBefore(nav, topo);
    var capa = doc.createElement('div'); capa.className = 'capa'; capa.setAttribute('aria-hidden', 'true');
    var ch = capaHtml(itens); capa.className = ch.cls; capa.innerHTML = ch.html;
    topo.insertBefore(capa, topo.firstChild);
    var sub = doc.getElementById('sub');
    if (sub) sub.innerHTML = '<span class="aberto">● ' + (en ? 'Open' : 'Aberto') + '</span> · ' + esc(sub.textContent);
    function rola(el, d) { if (el) win.scrollTo({ top: el.getBoundingClientRect().top + win.scrollY - (d || 80), behavior: 'smooth' }); }
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]'); if (!b) return; var n = b.getAttribute('data-nav');
      nav.querySelectorAll('[data-nav]').forEach(function (x) { if (x === b) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
      if (n === 'inicio') win.scrollTo({ top: 0, behavior: 'smooth' });
      if (n === 'servicos') rola(doc.getElementById('cat0'), 120);
      if (n === 'aval') rola(doc.querySelector('.avaliacoes'), 80);
      if (n === 'perfil') rola(doc.querySelector('.info-loja'), 80);
    });
    return nav;
  }

  var Comum = {casca: casca, visual: visual, capaHtml: capaHtml,  esc: esc, qrFalso: qrFalso, PIX_EX: PIX_EX, folha: folha, transicao: transicao };
  if (typeof module !== 'undefined' && module.exports) module.exports = Comum;
  else raiz.Comum = Comum;
})(typeof window !== 'undefined' ? window : this);

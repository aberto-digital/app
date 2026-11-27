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

  var Comum = { esc: esc, qrFalso: qrFalso, PIX_EX: PIX_EX, folha: folha, transicao: transicao };
  if (typeof module !== 'undefined' && module.exports) module.exports = Comum;
  else raiz.Comum = Comum;
})(typeof window !== 'undefined' ? window : this);

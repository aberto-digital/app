/* AbertoCore · Link de experiência: modelo Pedido (cardápio, carrinho e checkout).
   A lógica (novo, adiciona, remove, resumo, finaliza) roda no Node para os testes;
   monta() desenha a página no navegador. Nada sai do navegador: o pedido vai para o
   sessionStorage (chave abertocore-experiencia) e a vitrine (painel.html) lê de lá. */
(function (raiz) {
  var noNode = typeof module !== 'undefined' && module.exports;
  var NICHOS = noNode ? require('./nichos.js') : raiz.NICHOS;
  var Marca = noNode ? require('./marca.js') : raiz.Marca;
  var CHAVE = 'abertocore-experiencia';
  var NUM = 102;
  function c2(v) { return Math.round(v * 100) / 100; }

  function itensDoNicho(n) {
    var lista = {};
    NICHOS[n].categorias.forEach(function (c) { c.itens.forEach(function (i) { lista[i.id] = { item: i, cat: c }; }); });
    return lista;
  }
  function novo(cfg) { return { cfg: cfg, qtd: {} }; }
  function adiciona(p, id) { if (itensDoNicho(p.cfg.n)[id]) p.qtd[id] = (p.qtd[id] || 0) + 1; return p; }
  function remove(p, id) { if (p.qtd[id]) { p.qtd[id]--; if (!p.qtd[id]) delete p.qtd[id]; } return p; }
  function qtd(p, id) { return p.qtd[id] || 0; }
  function precoDe(item, l) { return l === 'en' ? item.precoUsd : item.preco; }

  function resumo(p, entrega) {
    var l = p.cfg.l, lista = itensDoNicho(p.cfg.n), N = NICHOS[p.cfg.n], itens = 0, sub = 0, linhas = [];
    Object.keys(p.qtd).forEach(function (id) {
      var it = lista[id].item, q = p.qtd[id], pr = precoDe(it, l);
      itens += q; sub += q * pr;
      linhas.push({ id: id, nome: it.nome[l], qtd: q, preco: pr, img: it.img });
    });
    var taxa = entrega === 'entrega' && itens ? (l === 'en' ? N.taxaUsd : N.taxa) : 0;
    return { itens: itens, linhas: linhas, subtotal: c2(sub), taxa: taxa, total: c2(sub + taxa) };
  }

  // dados = { entrega, endereco, cliente:{nome,tel}, pagamento:'pix'|'cartao'|'entrega', pago }
  function finaliza(p, dados, armazem, chat) {
    dados = dados || {};
    var r = resumo(p, dados.entrega === 'retirada' ? 'retirada' : 'entrega');
    if (!r.itens) throw new Error('Carrinho vazio.');
    var cli = dados.cliente || {};
    if (!String(cli.nome || '').trim() || !String(cli.tel || '').trim()) throw new Error('Preencha nome e telefone.');
    var est = {
      cfg: p.cfg,
      pedido: {
        num: NUM, itens: r.linhas, subtotal: r.subtotal, taxa: r.taxa, total: r.total,
        entrega: dados.entrega === 'retirada' ? 'retirada' : 'entrega', endereco: String(dados.endereco || '').slice(0, 120),
        cliente: { nome: String(cli.nome).trim().slice(0, 60), tel: String(cli.tel).trim().slice(0, 30) },
        pagamento: ['pix', 'cartao', 'entrega'].indexOf(dados.pagamento) >= 0 ? dados.pagamento : 'entrega',
        pago: !!dados.pago, ts: Date.now(),
      },
      chat: (chat || []).slice(-30),
    };
    armazem.setItem(CHAVE, JSON.stringify(est));
    return est;
  }

  // ---------------- navegador ----------------
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

  function monta(doc, win) {
    var E = win.EXP, cfg = E.cfg, N = E.nicho, l = cfg.l, en = l === 'en';
    var p = novo(cfg), entrega = 'entrega', pag = 'pix';
    var main = doc.getElementById('conteudo');
    var tx = en ? {
      add: 'Add', cart: 'View cart', items: 'items', yourOrder: 'Your order', subtotal: 'Subtotal', fee: 'Delivery fee', total: 'Total',
      delivery: 'Delivery', pickup: 'Pickup', next: 'Continue', checkout: 'Checkout', name: 'Your name', phone: 'Phone', address: 'Delivery address',
      pay: 'Payment', pix: 'Pix', card: 'Card', onDelivery: 'Pay on delivery', paid: 'I already paid', payNow: 'Pay', place: 'Place order',
      pixHelp: 'Scan the QR code or copy the code below (example, does not charge).', cardNote: 'In this demo we never ask for card details. Tap Pay to simulate.',
      card1: 'Card number', card2: 'Expiry', card3: 'CVC', sent: 'Order #' + NUM + ' sent!', seeSide: 'Now see it from your business side →',
      reviews: 'What customers say', info: 'Open every day · 6 pm to 11 pm', demoBy: 'Demo made by', onlinePay: 'Online payment', custom: 'Custom build',
    } : {
      add: 'Adicionar', cart: 'Ver carrinho', items: 'itens', yourOrder: 'Seu pedido', subtotal: 'Subtotal', fee: 'Taxa de entrega', total: 'Total',
      delivery: 'Entrega', pickup: 'Retirar', next: 'Continuar', checkout: 'Finalizar pedido', name: 'Seu nome', phone: 'Telefone (WhatsApp)', address: 'Endereço de entrega',
      pay: 'Pagamento', pix: 'Pix', card: 'Cartão', onDelivery: 'Pagar na entrega', paid: 'Já paguei', payNow: 'Pagar', place: 'Fazer pedido',
      pixHelp: 'Leia o QR code ou copie o código abaixo (é um exemplo, não cobra nada).', cardNote: 'Na demonstração não pedimos dados do cartão. Toque em Pagar para simular.',
      card1: 'Número do cartão', card2: 'Validade', card3: 'CVV', sent: 'Pedido #' + NUM + ' enviado!', seeSide: 'Agora veja do lado da sua empresa →',
      reviews: 'O que os clientes dizem', info: 'Aberto todos os dias · 18h às 23h', demoBy: 'Demonstração feita pela', onlinePay: 'Pagamento online', custom: 'Sob medida',
    };

    // cardápio
    var html = '<nav class="abas" role="tablist">' + N.categorias.map(function (c, i) { return '<button role="tab" data-cat="' + i + '" aria-selected="' + (i === 0) + '">' + esc(c.nome[l]) + '</button>'; }).join('') + '</nav>';
    html += N.categorias.map(function (c, i) {
      return '<section class="cat" id="cat' + i + '"><h2>' + esc(c.nome[l]) + '</h2>' + c.itens.map(function (it) {
        return '<div class="item" data-id="' + it.id + '"><div class="ilu" aria-hidden="true">' + it.img + '</div><div class="txt"><b>' + esc(it.nome[l]) + '</b><small>' + esc(it.ds[l]) + '</small><div class="preco">' + Marca.preco(precoDe(it, l), l) + '</div></div><div class="ctl"></div></div>';
      }).join('') + '</section>';
    }).join('');
    html += '<section class="avaliacoes"><h2>' + tx.reviews + '</h2>' + [
      en ? ['Best pizza in town, arrived hot!', 'Mariana R.'] : ['Melhor pizza da cidade, chegou quentinha!', 'Mariana R.'],
      en ? ['Super fast delivery and great service.', 'Lucas F.'] : ['Entrega rapidíssima e atendimento ótimo.', 'Lucas F.'],
    ].map(function (a) { return '<div class="av"><span class="est">★★★★★</span> ' + esc(a[0]) + '<br><small>' + esc(a[1]) + ' · ' + (en ? 'example review' : 'avaliação de exemplo') + '</small></div>'; }).join('') + '</section>';
    html += '<div class="info-loja">🕒 ' + tx.info + (cfg.cidade ? '<br>📍 ' + esc(cfg.cidade) : '') + '</div>';
    html += '<p class="rodape-demo">' + tx.demoBy + ' <a href="https://abertodigital.com" target="_blank" rel="noopener">abertodigital</a></p>';
    main.innerHTML = html;
    var barra = doc.createElement('button'); barra.className = 'barra-carrinho oculto'; barra.type = 'button'; doc.body.appendChild(barra);

    function desenhaControles() {
      main.querySelectorAll('.item').forEach(function (el) {
        var id = el.getAttribute('data-id'), q = qtd(p, id), ctl = el.querySelector('.ctl');
        ctl.innerHTML = q ? '<div class="qtd"><button type="button" data-menos="' + id + '" aria-label="-">−</button><span>' + q + '</span><button type="button" data-mais="' + id + '" aria-label="+">+</button></div>'
          : '<button type="button" class="mais" data-mais="' + id + '" aria-label="' + tx.add + '">+</button>';
      });
      var r = resumo(p, entrega);
      barra.classList.toggle('oculto', !r.itens);
      barra.innerHTML = '<span><span class="n">' + r.itens + '</span>' + tx.cart + '</span><span>' + Marca.preco(r.subtotal, l) + '</span>';
      var bolha = doc.querySelector('.bolha-chat'); if (bolha) bolha.classList.toggle('sem-carrinho', !r.itens);
    }
    main.addEventListener('click', function (e) {
      var a = e.target.closest('[data-mais]'), b = e.target.closest('[data-menos]'), c = e.target.closest('[data-cat]');
      if (a) { adiciona(p, a.getAttribute('data-mais')); desenhaControles(); }
      if (b) { remove(p, b.getAttribute('data-menos')); desenhaControles(); }
      if (c) {
        main.querySelectorAll('[data-cat]').forEach(function (x) { x.setAttribute('aria-selected', x === c); });
        var alvo = doc.getElementById('cat' + c.getAttribute('data-cat'));
        win.scrollTo({ top: alvo.getBoundingClientRect().top + win.scrollY - 80, behavior: 'smooth' });
      }
    });

    var folha = doc.createElement('div'); folha.className = 'folha oculto'; doc.body.appendChild(folha);
    function abre(conteudo) { folha.innerHTML = '<div class="caixa" role="dialog" aria-modal="true">' + conteudo + '</div>'; folha.classList.remove('oculto'); }
    function fecha() { folha.classList.add('oculto'); folha.innerHTML = ''; }
    folha.addEventListener('click', function (e) { if (e.target === folha || e.target.closest('.fechar')) fecha(); });

    function telaCarrinho() {
      var r = resumo(p, entrega);
      if (!r.itens) return fecha();
      abre('<h2>' + tx.yourOrder + '<button class="fechar" aria-label="Fechar">×</button></h2>' +
        r.linhas.map(function (x) { return '<div class="linha-c"><span>' + x.qtd + '× ' + esc(x.nome) + '</span><span>' + Marca.preco(x.qtd * x.preco, l) + '</span></div>'; }).join('') +
        '<div class="opcoes" style="margin:12px 0"><button type="button" data-ent="entrega" aria-pressed="' + (entrega === 'entrega') + '">🛵 ' + tx.delivery + '</button><button type="button" data-ent="retirada" aria-pressed="' + (entrega === 'retirada') + '">🏪 ' + tx.pickup + '</button></div>' +
        '<div class="linha-c"><span>' + tx.subtotal + '</span><span>' + Marca.preco(r.subtotal, l) + '</span></div>' +
        '<div class="linha-c"><span>' + tx.fee + '</span><span>' + Marca.preco(r.taxa, l) + '</span></div>' +
        '<div class="linha-c total"><span>' + tx.total + '</span><span>' + Marca.preco(r.total, l) + '</span></div>' +
        '<button type="button" class="btn" id="irCheckout">' + tx.next + '</button>');
      folha.querySelectorAll('[data-ent]').forEach(function (b) { b.onclick = function () { entrega = b.getAttribute('data-ent'); telaCarrinho(); }; });
      doc.getElementById('irCheckout').onclick = telaCheckout;
    }
    var form = { nome: '', tel: '', endereco: '' };
    function telaCheckout() {
      var r = resumo(p, entrega);
      var pagHtml = pag === 'pix'
        ? '<div class="pix">' + qrFalso() + '<div><small>' + tx.pixHelp + '</small><code>00020126580014BR.GOV.BCB.PIX-EXEMPLO-DEMONSTRACAO-ABERTODIGITAL5204000053039865802BR</code></div></div><button type="button" class="btn" data-fim="pix">' + tx.paid + '</button>'
        : pag === 'cartao'
          ? '<div class="aviso">🔒 ' + tx.cardNote + '</div><div class="campo"><label>' + tx.card1 + '</label><input disabled placeholder="•••• •••• •••• ••••"></div><div class="opcoes"><div class="campo" style="flex:1"><label>' + tx.card2 + '</label><input disabled placeholder="MM/AA"></div><div class="campo" style="flex:1"><label>' + tx.card3 + '</label><input disabled placeholder="•••"></div></div><button type="button" class="btn" data-fim="cartao">' + tx.payNow + ' ' + Marca.preco(r.total, l) + '</button>'
          : '<button type="button" class="btn" data-fim="entrega">' + tx.place + '</button>';
      abre('<h2>' + tx.checkout + '<button class="fechar" aria-label="Fechar">×</button></h2>' +
        '<div class="campo"><label for="cNome">' + tx.name + '</label><input id="cNome" autocomplete="name" value="' + esc(form.nome) + '"></div>' +
        '<div class="campo"><label for="cTel">' + tx.phone + '</label><input id="cTel" inputmode="tel" autocomplete="tel" value="' + esc(form.tel) + '"></div>' +
        (entrega === 'entrega' ? '<div class="campo"><label for="cEnd">' + tx.address + '</label><input id="cEnd" autocomplete="street-address" value="' + esc(form.endereco) + '"></div>' : '') +
        '<div class="campo"><label>' + tx.pay + (pag !== 'entrega' ? ' <span class="selo-sob">' + tx.onlinePay + ' · ' + tx.custom + '</span>' : '') + '</label><div class="opcoes"><button type="button" data-pag="pix" aria-pressed="' + (pag === 'pix') + '">' + tx.pix + '</button><button type="button" data-pag="cartao" aria-pressed="' + (pag === 'cartao') + '">' + tx.card + '</button><button type="button" data-pag="entrega" aria-pressed="' + (pag === 'entrega') + '">' + tx.onDelivery + '</button></div></div>' +
        '<div class="linha-c total"><span>' + tx.total + '</span><span>' + Marca.preco(r.total, l) + '</span></div>' + pagHtml +
        '<p class="aviso oculto" id="erroCk"></p>');
      function guarda() { ['Nome', 'Tel', 'End'].forEach(function (k) { var el = doc.getElementById('c' + k); if (el) form[{ Nome: 'nome', Tel: 'tel', End: 'endereco' }[k]] = el.value; }); }
      folha.querySelectorAll('[data-pag]').forEach(function (b) { b.onclick = function () { guarda(); pag = b.getAttribute('data-pag'); telaCheckout(); }; });
      folha.querySelector('[data-fim]').onclick = function () {
        guarda();
        try {
          var hist = win.Chat ? win.Chat.historico() : [];
          finaliza(p, { entrega: entrega, endereco: form.endereco, cliente: { nome: form.nome, tel: form.tel }, pagamento: pag, pago: pag !== 'entrega' }, win.sessionStorage, hist);
        } catch (er) {
          var av = doc.getElementById('erroCk'); av.textContent = en ? 'Please fill in your name and phone.' : er.message; av.classList.remove('oculto'); return;
        }
        telaEnviado();
      };
    }
    function telaEnviado() {
      abre('<div class="transicao"><div class="ok">✓</div><h2>' + tx.sent + '</h2><p style="color:var(--sec)">' + (en ? 'This is what your customer sees. ' : 'É isso que o seu cliente vê. ') + '</p>' +
        '<a class="btn" href="painel.html' + esc(win.location.search) + '">' + tx.seeSide + '</a></div>');
    }
    barra.onclick = telaCarrinho;
    desenhaControles();
  }

  var Pedido = { novo: novo, adiciona: adiciona, remove: remove, qtd: qtd, resumo: resumo, finaliza: finaliza, monta: monta, CHAVE: CHAVE };
  if (noNode) module.exports = Pedido;
  else raiz.Pedido = Pedido;
})(typeof window !== 'undefined' ? window : this);

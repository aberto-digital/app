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
  // grupos de opções do produto: os do próprio item ou os da categoria (tamanho, extras...)
  function gruposDe(info) { return (info && (info.item.grupos || info.cat.grupos)) || []; }
  function precoOp(op, l) { return l === 'en' ? op.precoUsd : op.preco; }
  // escolhas = ['grupo:opção', ...] (repete a opção quando o extra tem contador)
  function chaveDe(id, esc) { return esc && esc.length ? id + '+' + esc.slice().sort().join(',') : id; }
  function baseDe(chave) { return String(chave).split('+')[0]; }
  function contaPorGrupo(esc) { var c = {}; (esc || []).forEach(function (e) { var g = e.split(':')[0]; c[g] = (c[g] || 0) + 1; }); return c; }
  // true quando todos os grupos obrigatórios têm escolha, nenhum passa do máximo e as opções existem
  function valida(id, esc, n) {
    var info = itensDoNicho(n)[id]; if (!info) return false;
    var gs = gruposDe(info), cont = contaPorGrupo(esc);
    var existe = (esc || []).every(function (e) { var p = e.split(':'); return gs.some(function (g) { return g.id === p[0] && g.op.some(function (o) { return o.id === p[1]; }); }); });
    return existe && gs.every(function (g) { var c = cont[g.id] || 0; return c <= (g.max || 1) && (!g.obrig || c >= 1); });
  }
  function opcaoDe(gs, e) { var p = e.split(':'), g = gs.filter(function (x) { return x.id === p[0]; })[0]; return g ? g.op.filter(function (o) { return o.id === p[1]; })[0] : null; }

  function novo(cfg) { return { cfg: cfg, qtd: {}, esc: {} }; }
  function adiciona(p, id, esc, n) {
    var base = baseDe(id), info = itensDoNicho(p.cfg.n)[base];
    if (!info) return p;
    if (esc === undefined && String(id).indexOf('+') >= 0) esc = p.esc[id];
    esc = esc || [];
    var gs = gruposDe(info), cont = contaPorGrupo(esc);
    var ok = esc.every(function (e) { return opcaoDe(gs, e); }) && gs.every(function (g) { return (cont[g.id] || 0) <= (g.max || 1); });
    if (!ok) return p;
    var k = chaveDe(base, esc);
    p.qtd[k] = (p.qtd[k] || 0) + (n > 0 ? Math.floor(n) : 1);
    if (esc.length) p.esc[k] = esc.slice();
    return p;
  }
  function remove(p, id) { if (p.qtd[id]) { p.qtd[id]--; if (!p.qtd[id]) { delete p.qtd[id]; delete p.esc[id]; } } return p; }
  function qtd(p, id) { return p.qtd[id] || 0; }
  function precoDe(item, l) { return l === 'en' ? item.precoUsd : item.preco; }

  function resumo(p, entrega) {
    var l = p.cfg.l, lista = itensDoNicho(p.cfg.n), N = NICHOS[p.cfg.n], itens = 0, sub = 0, linhas = [];
    Object.keys(p.qtd).forEach(function (k) {
      var info = lista[baseDe(k)], it = info.item, q = p.qtd[k], gs = gruposDe(info), pr = precoDe(it, l), nomes = [], cont = {};
      (p.esc[k] || []).forEach(function (e) { var o = opcaoDe(gs, e); if (o) { pr += precoOp(o, l); cont[e] = (cont[e] || 0) + 1; } });
      Object.keys(cont).forEach(function (e) { var o = opcaoDe(gs, e); nomes.push(o.nome[l] + (cont[e] > 1 ? ' ×' + cont[e] : '')); });
      pr = c2(pr); itens += q; sub += q * pr;
      linhas.push({ id: k, nome: it.nome[l] + (nomes.length ? ' (' + nomes.join(', ') + ')' : ''), base: it.nome[l], extras: nomes, qtd: q, preco: pr, img: it.img });
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
    var p = novo(cfg), entrega = 'entrega', pag = 'pix', lista = itensDoNicho(cfg.n);
    var main = doc.getElementById('conteudo');
    doc.body.setAttribute('data-m', 'pedido');
    var tx = en ? {
      add: 'Add', cart: 'View cart', yourOrder: 'Your order', subtotal: 'Subtotal', fee: 'Delivery fee', total: 'Total',
      delivery: 'Delivery', pickup: 'Pickup', next: 'Continue', checkout: 'Checkout', name: 'Your name', phone: 'Phone', address: 'Delivery address',
      pay: 'Payment', pix: 'Pix', card: 'Card', onDelivery: 'Pay on delivery', paid: 'I already paid', payNow: 'Pay', place: 'Place order',
      pixHelp: 'Scan the QR code or copy the code below (example, does not charge).', cardNote: 'In this demo we never ask for card details. Tap Pay to simulate.',
      sent: 'Order #' + NUM + ' sent!', seeSide: 'Now see it from your business side →',
      reviews: 'What customers say', info: 'Open every day · 6 pm to 11 pm', demoBy: 'Demo made by', onlinePay: 'Online payment', custom: 'Custom build',
      home: 'Home', promo: 'Highlights', orders: 'Orders', profile: 'Profile', highlights: 'Highlights', search: 'Search for a product',
      bag: 'Your bag', empty: 'Empty bag', emptyHint: 'Pick a product to start your order.', details: 'Product details', required: 'REQUIRED',
      chooseOne: 'Choose 1 option', chooseUpTo: function (n) { return 'Choose up to ' + n + ' options'; }, none: 'No products found.', openNow: 'Open', deliveryIn: 'Delivery',
      remove: 'Remove', more: 'More', less: 'Less', close: 'Close', missing: 'Choose the required options.',
    } : {
      add: 'Adicionar', cart: 'Ver carrinho', yourOrder: 'Seu pedido', subtotal: 'Subtotal', fee: 'Taxa de entrega', total: 'Total',
      delivery: 'Entrega', pickup: 'Retirar', next: 'Continuar', checkout: 'Finalizar pedido', name: 'Seu nome', phone: 'Telefone (WhatsApp)', address: 'Endereço de entrega',
      pay: 'Pagamento', pix: 'Pix', card: 'Cartão', onDelivery: 'Pagar na entrega', paid: 'Já paguei', payNow: 'Pagar', place: 'Fazer pedido',
      pixHelp: 'Leia o QR code ou copie o código abaixo (é um exemplo, não cobra nada).', cardNote: 'Na demonstração não pedimos dados do cartão. Toque em Pagar para simular.',
      sent: 'Pedido #' + NUM + ' enviado!', seeSide: 'Agora veja do lado da sua empresa →',
      reviews: 'O que os clientes dizem', info: 'Aberto todos os dias · 18h às 23h', demoBy: 'Demonstração feita pela', onlinePay: 'Pagamento online', custom: 'Sob medida',
      home: 'Início', promo: 'Destaques', orders: 'Pedidos', profile: 'Perfil', highlights: 'Destaques', search: 'Busque por um produto',
      bag: 'Sua sacola', empty: 'Sacola vazia', emptyHint: 'Escolha um produto para começar o pedido.', details: 'Detalhes do produto', required: 'OBRIGATÓRIO',
      chooseOne: 'Escolha 1 opção', chooseUpTo: function (n) { return 'Escolha até ' + n + ' opções'; }, none: 'Nenhum produto encontrado.', openNow: 'Aberto', deliveryIn: 'Entrega',
      remove: 'Tirar', more: 'Mais', less: 'Menos', close: 'Fechar', missing: 'Escolha as opções obrigatórias.',
    };
    function plus(v) { return '+ ' + Marca.preco(v, l); }
    function visual(it) { return win.Comum.visual(it); }
    function etiqueta(it) { return it.etq ? '<span class="etq">' + esc(it.etq[l]) + '</span>' : ''; }

    // ---- navegação (barra superior no desktop, barra inferior no celular) ----
    var nav = doc.createElement('nav'); nav.className = 'nav-p'; nav.setAttribute('aria-label', 'Principal');
    nav.innerHTML = [['inicio', '🏠', tx.home], ['promo', '🏷️', tx.promo], ['pedidos', '🛍️', tx.orders], ['perfil', '👤', tx.profile]].map(function (x, i) {
      return '<button type="button" data-nav="' + x[0] + '"' + (i === 0 ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + x[1] + '</span><b>' + x[2] + '</b></button>';
    }).join('');
    var topo = doc.querySelector('.topo'); topo.parentNode.insertBefore(nav, topo);
    var capa = doc.createElement('div'); capa.className = 'capa'; capa.setAttribute('aria-hidden', 'true');
    var todos = []; N.categorias.forEach(function (c) { c.itens.forEach(function (i) { todos.push(i); }); });
    var ch = win.Comum.capaHtml(todos); capa.className = ch.cls; capa.innerHTML = ch.html;
    topo.insertBefore(capa, topo.firstChild);
    var sub = doc.getElementById('sub');
    if (sub) sub.innerHTML = '<span class="aberto">● ' + tx.openNow + '</span> · ' + esc(sub.textContent);

    // ---- cardápio ----
    var dest = []; N.categorias.forEach(function (c) { c.itens.forEach(function (i) { if (i.etq) dest.push(i); }); });
    var html = '<div class="menu"><div class="ferr"><nav class="abas" role="tablist">' + N.categorias.map(function (c, i) { return '<button role="tab" data-cat="' + i + '" aria-selected="' + (i === 0) + '">' + esc(c.nome[l]) + '</button>'; }).join('') + '</nav>' +
      '<label class="busca"><span aria-hidden="true">🔍</span><input id="busca" type="search" placeholder="' + esc(tx.search) + '" aria-label="' + esc(tx.search) + '" autocomplete="off"></label></div>';
    if (dest.length) html += '<section class="dest" id="destaques"><h2>' + tx.highlights + '</h2><div class="dest-l">' + dest.map(function (it) {
      return '<button type="button" class="card-d" data-abre="' + it.id + '"><div class="vis">' + visual(it) + '</div><div class="cd-t">' + etiqueta(it) + '<b>' + esc(it.nome[l]) + '</b><small>' + esc(it.ds[l]) + '</small><div class="preco">' + Marca.preco(precoDe(it, l), l) + '</div></div></button>';
    }).join('') + '</div></section>';
    html += N.categorias.map(function (c, i) {
      return '<section class="cat" id="cat' + i + '"><h2>' + esc(c.nome[l]) + '</h2><div class="grade">' + c.itens.map(function (it) {
        return '<button type="button" class="item" data-abre="' + it.id + '" data-busca="' + esc((it.nome[l] + ' ' + it.ds[l]).toLowerCase()) + '"><div class="txt">' + etiqueta(it) + '<b>' + esc(it.nome[l]) + '</b><small>' + esc(it.ds[l]) + '</small><div class="preco">' + Marca.preco(precoDe(it, l), l) + '</div></div><div class="ilu vis">' + visual(it) + '</div></button>';
      }).join('') + '</div></section>';
    }).join('') + '<p class="vazio-busca oculto" id="semResultado">' + tx.none + '</p>';
    html += '<section class="avaliacoes"><h2>' + tx.reviews + '</h2>' + [
      en ? ['Best pizza in town, arrived hot!', 'Mariana R.'] : ['Melhor pizza da cidade, chegou quentinha!', 'Mariana R.'],
      en ? ['Super fast delivery and great service.', 'Lucas F.'] : ['Entrega rapidíssima e atendimento ótimo.', 'Lucas F.'],
    ].map(function (a) { return '<div class="av"><span class="est">★★★★★</span> ' + esc(a[0]) + '<br><small>' + esc(a[1]) + ' · ' + (en ? 'example review' : 'avaliação de exemplo') + '</small></div>'; }).join('') + '</section>';
    html += '<div class="info-loja" id="perfil">🕒 ' + tx.info + (cfg.cidade ? '<br>📍 ' + esc(cfg.cidade) : '') + '</div>';
    html += '<p class="rodape-demo">' + tx.demoBy + ' <a href="https://abertodigital.com" target="_blank" rel="noopener">abertodigital</a></p></div>';
    html += '<aside class="sacola" id="sacola" aria-label="' + tx.bag + '"></aside>';
    main.innerHTML = html;
    var barra = doc.createElement('button'); barra.className = 'barra-carrinho oculto'; barra.type = 'button'; doc.body.appendChild(barra);

    // ---- sacola (coluna lateral no desktop) e carrinho ----
    function linhasHtml(r) {
      return r.linhas.map(function (x) {
        return '<div class="linha-s"><div class="ls-t"><b>' + esc(x.base) + '</b>' + (x.extras.length ? '<small>' + esc(x.extras.join(', ')) + '</small>' : '') + '<span>' + Marca.preco(x.qtd * x.preco, l) + '</span></div>' +
          '<div class="qtd"><button type="button" data-menos-l="' + esc(x.id) + '" aria-label="' + tx.less + '">−</button><span>' + x.qtd + '</span><button type="button" data-mais-l="' + esc(x.id) + '" aria-label="' + tx.more + '">+</button></div></div>';
      }).join('');
    }
    function totaisHtml(r) {
      return '<div class="opcoes ent"><button type="button" data-ent="entrega" aria-pressed="' + (entrega === 'entrega') + '">🛵 ' + tx.delivery + '</button><button type="button" data-ent="retirada" aria-pressed="' + (entrega === 'retirada') + '">🏪 ' + tx.pickup + '</button></div>' +
        '<div class="linha-c"><span>' + tx.subtotal + '</span><span>' + Marca.preco(r.subtotal, l) + '</span></div>' +
        '<div class="linha-c"><span>' + tx.fee + '</span><span>' + Marca.preco(r.taxa, l) + '</span></div>' +
        '<div class="linha-c total"><span>' + tx.total + '</span><span>' + Marca.preco(r.total, l) + '</span></div>';
    }
    function desenhaSacola() {
      var r = resumo(p, entrega), el = doc.getElementById('sacola');
      el.innerHTML = '<div class="sac-card"><h3>' + tx.bag + '</h3>' + (r.itens
        ? linhasHtml(r) + totaisHtml(r) + '<button type="button" class="btn" data-checkout="1">' + tx.next + '</button>'
        : '<div class="sac-vazia"><span aria-hidden="true">🛍️</span><b>' + tx.empty + '</b><small>' + tx.emptyHint + '</small></div>') + '</div>' +
        '<div class="sac-info">🛵 ' + tx.deliveryIn + ' ' + esc(N.textos[l].prazo) + ' · ' + tx.fee + ' ' + Marca.preco(l === 'en' ? N.taxaUsd : N.taxa, l) + '</div>';
    }
    function desenha() {
      var r = resumo(p, entrega);
      barra.classList.toggle('oculto', !r.itens);
      barra.innerHTML = '<span><span class="n">' + r.itens + '</span>' + tx.cart + '</span><span>' + Marca.preco(r.subtotal, l) + '</span>';
      var bolha = doc.querySelector('.bolha-chat'); if (bolha) bolha.classList.toggle('sem-carrinho', !r.itens);
      desenhaSacola();
      if (!folha.classList.contains('oculto') && folha.getAttribute('data-tela') === 'carrinho') telaCarrinho();
    }

    // ---- folha (carrinho, checkout, modal do produto) ----
    var folha = doc.createElement('div'); folha.className = 'folha oculto'; doc.body.appendChild(folha);
    function abre(conteudo, cls, tela) { folha.className = 'folha' + (cls ? ' ' + cls : ''); folha.setAttribute('data-tela', tela || ''); folha.innerHTML = '<div class="caixa" role="dialog" aria-modal="true">' + conteudo + '</div>'; }
    function fecha() { folha.classList.add('oculto'); folha.innerHTML = ''; folha.setAttribute('data-tela', ''); }
    folha.addEventListener('click', function (e) { if (e.target === folha || e.target.closest('.fechar')) fecha(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !folha.classList.contains('oculto')) fecha(); });

    // ---- modal do produto ----
    function abreProduto(id) {
      var info = lista[id], it = info.item, gs = gruposDe(info), sel = {}, q = 1;
      function esc2() { var out = []; Object.keys(sel).forEach(function (k) { for (var i = 0; i < sel[k]; i++) out.push(k); }); return out; }
      function contaG(g) { var t = 0; g.op.forEach(function (o) { t += sel[g.id + ':' + o.id] || 0; }); return t; }
      function unit() { var v = precoDe(it, l); esc2().forEach(function (e) { v += precoOp(opcaoDe(gs, e), l); }); return c2(v); }
      var gHtml = gs.map(function (g) {
        var max = g.max || 1, radio = max === 1;
        return '<section class="grupo" data-g="' + g.id + '"><header><div><b>' + esc(g.rot[l]) + '</b><small>' + (radio ? tx.chooseOne : tx.chooseUpTo(max)) + '</small></div><div class="selos-g"><span class="cont" data-cont="' + g.id + '">0/' + max + '</span>' + (g.obrig ? '<span class="obrig">' + tx.required + '</span>' : '') + '</div></header>' +
          g.op.map(function (o) {
            var k = g.id + ':' + o.id, ex = precoOp(o, l) > 0 ? '<em>' + plus(precoOp(o, l)) + '</em>' : '';
            var txt = '<span class="ot"><b>' + esc(o.nome[l]) + '</b>' + (o.ds ? '<small>' + esc(o.ds[l]) + '</small>' : '') + ex + '</span>';
            return radio ? '<button type="button" class="op" role="radio" aria-checked="false" data-op="' + k + '" data-radio="' + g.id + '">' + txt + '<i class="radio"></i></button>'
              : '<div class="op">' + txt + '<div class="qtd"><button type="button" data-menos-op="' + k + '" aria-label="' + tx.less + '">−</button><span data-n="' + k + '">0</span><button type="button" data-mais-op="' + k + '" aria-label="' + tx.more + '">+</button></div></div>';
          }).join('') + '</section>';
      }).join('');
      abre('<div class="mp-foto"><div class="vis">' + visual(it) + '</div><button type="button" class="fechar fechar-foto" aria-label="' + tx.close + '">×</button></div>' +
        '<div class="mp-lado"><div class="mp-cab"><b>' + tx.details + '</b><button type="button" class="fechar" aria-label="' + tx.close + '">×</button></div>' +
        '<div class="mp-scroll"><div class="mp-info">' + etiqueta(it) + '<h2>' + esc(it.nome[l]) + '</h2><p>' + esc(it.ds[l]) + '</p><div class="preco">' + Marca.preco(precoDe(it, l), l) + '</div></div>' + gHtml + '</div>' +
        '<footer class="mp-rodape"><div class="qtd"><button type="button" data-q="-1" aria-label="' + tx.less + '">−</button><span id="mpQ">1</span><button type="button" data-q="1" aria-label="' + tx.more + '">+</button></div>' +
        '<button type="button" class="btn-add" id="mpAdd"><span>' + tx.add + '</span><span id="mpTot"></span></button></footer></div>', 'prod', 'produto');
      var raiz = folha.querySelector('.caixa');
      function faltaAlgum() { return gs.filter(function (g) { return g.obrig && contaG(g) < 1; }); }
      function atualiza() {
        gs.forEach(function (g) {
          var c = contaG(g), el = raiz.querySelector('[data-cont="' + g.id + '"]'); el.textContent = c + '/' + (g.max || 1);
          el.classList.toggle('ok', c >= 1);
          g.op.forEach(function (o) { var k = g.id + ':' + o.id, n = raiz.querySelector('[data-n="' + k + '"]'), r = raiz.querySelector('[data-op="' + k + '"]'); if (n) n.textContent = sel[k] || 0; if (r) { r.setAttribute('aria-checked', !!sel[k]); r.classList.toggle('marcada', !!sel[k]); } });
          raiz.querySelector('[data-g="' + g.id + '"]').classList.remove('falta');
        });
        raiz.querySelector('#mpQ').textContent = q;
        raiz.querySelector('#mpTot').textContent = Marca.preco(unit() * q, l);
        raiz.querySelector('#mpAdd').setAttribute('aria-disabled', faltaAlgum().length ? 'true' : 'false');
      }
      raiz.addEventListener('click', function (e) {
        var r = e.target.closest('[data-radio]'), mo = e.target.closest('[data-mais-op]'), me = e.target.closest('[data-menos-op]'), dq = e.target.closest('[data-q]'), ad = e.target.closest('#mpAdd');
        if (r) { var g = r.getAttribute('data-radio'); Object.keys(sel).forEach(function (k) { if (k.split(':')[0] === g) delete sel[k]; }); sel[r.getAttribute('data-op')] = 1; }
        if (mo) { var k1 = mo.getAttribute('data-mais-op'), g1 = gs.filter(function (x) { return x.id === k1.split(':')[0]; })[0]; if (contaG(g1) < (g1.max || 1)) sel[k1] = (sel[k1] || 0) + 1; }
        if (me) { var k2 = me.getAttribute('data-menos-op'); if (sel[k2]) { sel[k2]--; if (!sel[k2]) delete sel[k2]; } }
        if (dq) q = Math.max(1, Math.min(20, q + Number(dq.getAttribute('data-q'))));
        if (ad) {
          var falta = faltaAlgum();
          if (falta.length) { var el = raiz.querySelector('[data-g="' + falta[0].id + '"]'); el.classList.add('falta'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
          adiciona(p, id, esc2(), q); fecha(); desenha(); return;
        }
        atualiza();
      });
      atualiza();
    }

    // ---- cliques da página ----
    function rola(el, desloc) { if (el) win.scrollTo({ top: el.getBoundingClientRect().top + win.scrollY - (desloc || 80), behavior: 'smooth' }); }
    function marcaNav(n) { nav.querySelectorAll('[data-nav]').forEach(function (b) { if (b.getAttribute('data-nav') === n) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }
    function ehDesktop() { return win.matchMedia && win.matchMedia('(min-width: 960px)').matches; }
    main.addEventListener('click', function (e) {
      var a = e.target.closest('[data-abre]'), c = e.target.closest('[data-cat]'), mo = e.target.closest('[data-mais-l]'), me = e.target.closest('[data-menos-l]'), en2 = e.target.closest('[data-ent]'), ck = e.target.closest('[data-checkout]');
      if (a) abreProduto(a.getAttribute('data-abre'));
      if (mo) { adiciona(p, mo.getAttribute('data-mais-l')); desenha(); }
      if (me) { remove(p, me.getAttribute('data-menos-l')); desenha(); }
      if (en2) { entrega = en2.getAttribute('data-ent'); desenha(); }
      if (ck) telaCheckout();
      if (c) {
        main.querySelectorAll('[data-cat]').forEach(function (x) { x.setAttribute('aria-selected', x === c); });
        rola(doc.getElementById('cat' + c.getAttribute('data-cat')), 120);
      }
    });
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]'); if (!b) return; var n = b.getAttribute('data-nav'); marcaNav(n);
      if (n === 'inicio') win.scrollTo({ top: 0, behavior: 'smooth' });
      if (n === 'promo') rola(doc.getElementById('destaques') || doc.getElementById('cat0'), 120);
      if (n === 'pedidos') { if (ehDesktop()) rola(doc.getElementById('sacola'), 60); else telaCarrinho(); }
      if (n === 'perfil') rola(doc.getElementById('perfil'), 120);
    });
    doc.getElementById('busca').addEventListener('input', function () {
      var t = this.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(), achou = 0;
      main.querySelectorAll('.item').forEach(function (el) {
        var alvo = el.getAttribute('data-busca').normalize('NFD').replace(/[̀-ͯ]/g, ''), mostra = !t || alvo.indexOf(t) >= 0;
        el.classList.toggle('oculto', !mostra); if (mostra) achou++;
      });
      main.querySelectorAll('.cat').forEach(function (s) { s.classList.toggle('oculto', !s.querySelector('.item:not(.oculto)')); });
      var d = doc.getElementById('destaques'); if (d) d.classList.toggle('oculto', !!t);
      doc.getElementById('semResultado').classList.toggle('oculto', !t || achou > 0);
    });

    function telaCarrinho() {
      var r = resumo(p, entrega);
      if (!r.itens) return fecha();
      abre('<h2>' + tx.yourOrder + '<button class="fechar" aria-label="' + tx.close + '">×</button></h2>' + linhasHtml(r) + totaisHtml(r) + '<button type="button" class="btn" id="irCheckout">' + tx.next + '</button>', '', 'carrinho');
      folha.querySelectorAll('[data-ent]').forEach(function (b) { b.onclick = function () { entrega = b.getAttribute('data-ent'); desenha(); }; });
      folha.querySelectorAll('[data-mais-l]').forEach(function (b) { b.onclick = function () { adiciona(p, b.getAttribute('data-mais-l')); desenha(); }; });
      folha.querySelectorAll('[data-menos-l]').forEach(function (b) { b.onclick = function () { remove(p, b.getAttribute('data-menos-l')); desenha(); }; });
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
        '<p class="aviso oculto" id="erroCk"></p>', '', 'checkout');
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
        '<a class="btn" href="painel.html' + esc(win.location.search) + '">' + tx.seeSide + '</a></div>', '', 'enviado');
    }
    barra.onclick = telaCarrinho;
    desenha();
  }
  var Pedido = { novo: novo, adiciona: adiciona, remove: remove, qtd: qtd, resumo: resumo, valida: valida, gruposDe: gruposDe, finaliza: finaliza, monta: monta, CHAVE: CHAVE };
  if (noNode) module.exports = Pedido;
  else raiz.Pedido = Pedido;
})(typeof window !== 'undefined' ? window : this);

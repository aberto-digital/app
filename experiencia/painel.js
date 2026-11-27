/* AbertoCore · Link de experiência: vitrine que imita o AbertoCore do lado do dono.
   Lê o pedido do sessionStorage (abertocore-experiencia) e mostra: aviso de pedido novo,
   caixa de entrada com a conversa e a confirmação automática, Pedidos em colunas
   (sob medida) e o resumo do dia (sob medida). Sem pedido, mostra um exemplo. */
(function (raiz) {
  var noNode = typeof module !== 'undefined' && module.exports;
  var NICHOS = noNode ? require('./nichos.js') : raiz.NICHOS;
  var Marca = noNode ? require('./marca.js') : raiz.Marca;
  var CHAVE = 'abertocore-experiencia';
  var COLUNAS = ['novo', 'preparo', 'saiu', 'concluido'];
  var WHATS = '5511991233627';

  function exemploPedido(cfg, num, coluna, nome, ids, pago, minAtras) {
    var l = cfg.l, N = NICHOS[cfg.n], todos = {};
    N.categorias.forEach(function (c) { c.itens.forEach(function (i) { todos[i.id] = i; }); });
    var itens = ids.map(function (id) { var i = todos[id] || N.categorias[0].itens[0]; return { id: i.id, nome: i.nome[l], qtd: 1, preco: l === 'en' ? i.precoUsd : i.preco, img: i.img }; });
    var sub = itens.reduce(function (s, x) { return s + x.preco; }, 0), taxa = l === 'en' ? N.taxaUsd : N.taxa;
    return { num: num, coluna: coluna, itens: itens, subtotal: Math.round(sub * 100) / 100, taxa: taxa, total: Math.round((sub + taxa) * 100) / 100, entrega: 'entrega', cliente: { nome: nome, tel: '' }, pagamento: pago ? 'pix' : 'entrega', pago: pago, ts: Date.now() - minAtras * 60000, exemplo: true };
  }

  function estado(armazem, cfg) {
    var est = null;
    try { est = JSON.parse(armazem.getItem(CHAVE) || 'null'); } catch (e) { est = null; }
    var primeiros = NICHOS[cfg.n].categorias[0].itens.map(function (i) { return i.id; });
    var ex = [
      exemploPedido(cfg, 101, 'saiu', 'Ana Paula', [primeiros[0], primeiros[1]], true, 25),
      exemploPedido(cfg, 100, 'concluido', 'Rafael Lima', [primeiros[2] || primeiros[0]], false, 70),
    ];
    if (!est || !est.pedido || typeof est.pedido.num !== 'number') {
      var destaque = exemploPedido(cfg, 102, 'novo', cfg.l === 'en' ? 'Sample customer' : 'Cliente de exemplo', [primeiros[1] || primeiros[0]], true, 1);
      return { real: false, cfg: cfg, destaque: destaque, pedidos: [destaque].concat(ex), chat: [], colunas: {} };
    }
    var cols = est.colunas || {};
    var d = Object.assign({}, est.pedido, { coluna: cols[est.pedido.num] || 'novo' });
    return { real: true, cfg: cfg, destaque: d, pedidos: [d].concat(ex.map(function (x) { return Object.assign(x, { coluna: cols[x.num] || x.coluna }); })), chat: est.chat || [], colunas: cols, bruto: est };
  }

  function avanca(e, num, armazem) {
    var p = e.pedidos.filter(function (x) { return x.num === num; })[0]; if (!p) return e;
    var i = COLUNAS.indexOf(p.coluna);
    if (i < COLUNAS.length - 1) p.coluna = COLUNAS[i + 1];
    e.colunas[num] = p.coluna;
    if (e.real && armazem) { e.bruto.colunas = e.colunas; armazem.setItem(CHAVE, JSON.stringify(e.bruto)); }
    return e;
  }

  function confirmacao(p, cfg) {
    var en = cfg.l === 'en', itens = p.itens.map(function (x) { return x.qtd + '× ' + x.nome; }).join(', ');
    if (en) return 'Hi ' + p.cliente.nome.split(' ')[0] + '! ' + cfg.nome + ' received your order #' + p.num + ': ' + itens + '. Total ' + Marca.preco(p.total, 'en') + (p.pago ? ' (paid)' : ' (pay on delivery)') + '. ' + (p.entrega === 'retirada' ? "We'll let you know when it's ready for pickup." : 'Estimated delivery: ' + NICHOS[cfg.n].textos.en.prazo + '.');
    return 'Oi, ' + p.cliente.nome.split(' ')[0] + '! A ' + cfg.nome + ' recebeu seu pedido #' + p.num + ': ' + itens + '. Total ' + Marca.preco(p.total, 'pt') + (p.pago ? ' (pago)' : ' (pagar na entrega)') + '. ' + (p.entrega === 'retirada' ? 'Avisamos quando estiver pronto para retirar.' : 'Previsão de entrega: ' + NICHOS[cfg.n].textos.pt.prazo + '.');
  }

  function conversa(e) {
    var msgs = (e.chat || []).filter(function (m) { return m && m.txt; }).map(function (m) { return { de: m.de === 'cli' ? 'cli' : 'ia', txt: m.txt, ts: m.ts }; });
    // a saudação automática do chat só aparece se o cliente chegou a conversar
    if (msgs.length && msgs[0].de === 'ia' && !msgs.some(function (m) { return m.de === 'cli'; })) msgs = [];
    if (msgs.length && msgs[0].de === 'ia') msgs.shift();
    msgs.push({ de: 'ia', txt: confirmacao(e.destaque, e.cfg), ts: e.destaque.ts, auto: true });
    return msgs;
  }

  function resumoDia(e) {
    var fat = e.pedidos.reduce(function (s, x) { return s + x.total; }, 0);
    return { pedidos: e.pedidos.length, faturamento: Math.round(fat * 100) / 100, ticket: Math.round(fat / e.pedidos.length * 100) / 100 };
  }

  function linkWhats(cfg) {
    var oque = { agendamento: { pt: ' (agendamento online)', en: ' (online booking)' }, orcamento: { pt: ' (pedido de orçamento)', en: ' (quote requests)' } }[cfg.m];
    var t = cfg.l === 'en' ? 'Hi! I tried the demo for ' + cfg.nome + (oque ? oque.en : '') + ' and I want this for my business.' : 'Oi! Testei a demonstração da ' + cfg.nome + (oque ? oque.pt : '') + ' e quero isso no meu negócio.';
    return 'https://wa.me/' + WHATS + '?text=' + encodeURIComponent(t);
  }

  // ---------------- navegador ----------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hora(ts, l) { var d = new Date(ts || Date.now()); return d.toLocaleTimeString(l === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' }); }

  // vitrine dos modelos Agendamento e Orçamento: casca comum (faixa, marca, abas, Mensagens,
  // aviso e botões) e as telas do modelo (V = Agendamento.vitrine ou Orcamento.vitrine)
  function montaModelo(doc, win, cfg, V) {
    var l = cfg.l, en = l === 'en', armazem = win.sessionStorage;
    var e = V.estado(armazem, cfg, Date.now()), aba = V.inicial, abertaConv = true;
    var T = en ? { msgs: 'Messages', inbox: 'Inbox', site: 'Website', ai: 'AI assistant', auto: 'Sent automatically', complete: 'Complete plan', you: 'You · team',
      back: '← Back to the site', want: 'I want this for my business', demo: 'Demo · nothing here is real', sample: 'Sample data' }
      : { msgs: 'Mensagens', inbox: 'Caixa de entrada', site: 'Site', ai: 'Assistente de IA', auto: 'Enviada automaticamente', complete: 'Pacote Completo', you: 'Você · equipe',
      back: '← Voltar ao site', want: 'Quero isso no meu negócio', demo: 'Demonstração · nada aqui é real', sample: 'Dados de exemplo' };
    doc.title = cfg.nome + ' · AbertoCore';
    var raizEl = doc.getElementById('painel');
    function telaMensagens() {
      var nome = e.destaque.cliente.nome;
      var lista = [{ nome: nome, canal: T.site, txt: V.resumoLista(e), novo: true }].concat(NICHOS[cfg.n].exemplos.map(function (x) { return { nome: x.nome, canal: x.canal, txt: x.txt[l] }; }));
      return '<div class="mensagens' + (abertaConv ? ' com-conv' : '') + '"><div class="lista"><h3>' + T.inbox + '</h3>' + lista.map(function (c, i) {
        return '<button type="button" class="conv-it' + (i === 0 ? ' ativo' : '') + '" data-conv="' + i + '"><span class="av">' + esc(Marca.iniciais(c.nome)) + '</span><span class="tx"><b>' + esc(c.nome) + '</b><small>' + esc(c.canal) + ' · ' + esc(c.txt) + '</small></span>' + (c.novo ? '<span class="bolinha">1</span>' : '') + '</button>';
      }).join('') + '</div>' +
        '<div class="conversa"><div class="conv-cab"><button type="button" class="voltar-lista" aria-label="Voltar">‹</button><b>' + esc(nome) + '</b><small>' + T.site + '</small></div><div class="fio-p">' +
        V.conversa(e).map(function (m) {
          if (m.de === 'cli') return '<div class="mp cli">' + esc(m.txt) + '</div>';
          if (m.de === 'eq') return '<div class="mp eq"><span class="quem">' + T.you + '</span>' + esc(m.txt) + '</div>';
          return '<div class="mp ia' + (m.programado ? ' prog' : '') + '"><span class="quem">' + (m.programado ? '⏰ ' + esc(m.quando) : '✨ ' + T.ai + (m.auto ? ' · ' + T.auto : '')) + ' <span class="selo-sob">' + T.complete + '</span></span>' + esc(m.txt) + '</div>';
        }).join('') + '</div></div></div>';
    }
    function desenha() {
      var abas = [['mensagens', '💬 ' + T.msgs]].concat(V.abas(en));
      raizEl.innerHTML =
        '<div class="faixa-demo">' + T.demo + (e.real ? '' : ' · ' + T.sample) + '</div>' +
        '<header class="barra-p"><div class="logo" data-logo></div><div><b data-nome></b><small>AbertoCore</small></div></header>' +
        '<nav class="abas-p" role="tablist">' + abas.map(function (a) { return '<button type="button" role="tab" data-aba="' + a[0] + '" aria-selected="' + (aba === a[0]) + '">' + a[1] + '</button>'; }).join('') + '</nav>' +
        '<main class="corpo-p">' + (aba === 'mensagens' ? telaMensagens() : V.tela(aba, e)) + '</main>' +
        '<div class="acoes-p"><a class="btn sec" href="index.html' + esc(win.location.search) + '">' + T.back + '</a><a class="btn" target="_blank" rel="noopener" href="' + linkWhats(cfg) + '">' + T.want + '</a></div>';
      Marca.aplica(cfg, doc);
      // funil: rola até a coluna do card do cliente (no celular só cabe uma coluna por vez)
      var kb = raizEl.querySelector('.kanban'), dq = kb && kb.querySelector('.pcard.destaque');
      if (dq) kb.scrollLeft = Math.max(0, dq.closest('.col').offsetLeft - kb.offsetLeft - 4);
    }
    function ir(a) { aba = a; abertaConv = true; desenha(); win.scrollTo(0, 0); }
    raizEl.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-aba]'), c = ev.target.closest('[data-conv]'), v = ev.target.closest('.voltar-lista');
      if (a) return ir(a.getAttribute('data-aba'));
      if (c && c.getAttribute('data-conv') === '0') { abertaConv = true; return desenha(); }
      if (v) { abertaConv = false; return desenha(); }
      if (V.clique(ev, e, armazem, ir)) desenha();
    });
    desenha();
    var t = doc.createElement('div'); t.className = 'toast'; t.innerHTML = '🔔 ' + V.toast(e);
    doc.body.appendChild(t);
    setTimeout(function () { t.classList.add('vis'); }, 300);
    setTimeout(function () { t.classList.remove('vis'); }, 5200);
    try { if (e.real) { var ctx = new (win.AudioContext || win.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.value = 0.05; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15); } } catch (er) {}
  }

  function monta(doc, win) {
    var cfg = Marca.ler(win.location.search), l = cfg.l, en = l === 'en';
    Marca.aplica(cfg, doc);
    var V = cfg.m === 'agendamento' ? win.Agendamento && win.Agendamento.vitrine : cfg.m === 'orcamento' ? win.Orcamento && win.Orcamento.vitrine : null;
    if (V) return montaModelo(doc, win, cfg, V);
    var e = estado(win.sessionStorage, cfg), aba = 'mensagens', abertaConv = true;
    var T = en ? {
      msgs: 'Messages', orders: 'Orders', today: 'Today', newOrder: 'New order', custom: 'Custom build', complete: 'Complete plan',
      cols: { novo: 'New', preparo: 'Preparing', saiu: 'Out for delivery', concluido: 'Done' }, next: 'Move on →', paid: 'Paid', toPay: 'Pay on delivery',
      auto: 'Sent automatically', ai: 'AI assistant', back: '← Back to the site', want: 'I want this for my business', site: 'Website',
      orders2: 'Orders today', revenue: 'Revenue today', avg: 'Average ticket', inbox: 'Inbox', sample: 'Sample data', demo: 'Demo · nothing here is real', delivery: 'Delivery', pickup: 'Pickup',
      tip: 'This is your business side: the order arrives here, the customer gets an automatic confirmation and your team moves it forward.',
    } : {
      msgs: 'Mensagens', orders: 'Pedidos', today: 'Resumo', newOrder: 'Novo pedido', custom: 'Sob medida', complete: 'Pacote Completo',
      cols: { novo: 'Novo', preparo: 'Em preparo', saiu: 'Saiu para entrega', concluido: 'Concluído' }, next: 'Avançar →', paid: 'Pago', toPay: 'Pagar na entrega',
      auto: 'Enviada automaticamente', ai: 'Assistente de IA', back: '← Voltar ao site', want: 'Quero isso no meu negócio', site: 'Site',
      orders2: 'Pedidos hoje', revenue: 'Faturamento hoje', avg: 'Ticket médio', inbox: 'Caixa de entrada', sample: 'Dados de exemplo', demo: 'Demonstração · nada aqui é real', delivery: 'Entrega', pickup: 'Retirada',
      tip: 'Este é o lado da sua empresa: o pedido chega aqui, o cliente recebe a confirmação automática e a equipe vai avançando.',
    };
    doc.title = cfg.nome + ' · AbertoCore';
    var raizEl = doc.getElementById('painel');

    function cardPedido(p) {
      return '<div class="pcard' + (p.num === e.destaque.num ? ' destaque' : '') + '"><div class="pc-top"><b>#' + p.num + ' · ' + esc(p.cliente.nome) + '</b><span>' + hora(p.ts, l) + '</span></div>' +
        '<small>' + p.itens.map(function (x) { return x.qtd + '× ' + esc(x.nome); }).join(', ') + '</small>' +
        '<div class="pc-rod"><span class="tag ' + (p.pago ? 'ok' : '') + '">' + (p.pago ? T.paid : T.toPay) + '</span><b>' + Marca.preco(p.total, l) + '</b></div>' +
        (p.coluna !== 'concluido' ? '<button type="button" class="avancar" data-num="' + p.num + '">' + T.next + '</button>' : '') + '</div>';
    }
    function telaMensagens() {
      var lista = [{ nome: e.destaque.cliente.nome, canal: T.site, txt: T.newOrder + ' #' + e.destaque.num, novo: true }].concat(NICHOS[cfg.n].exemplos.map(function (x) { return { nome: x.nome, canal: x.canal, txt: x.txt[l] }; }));
      var conv = conversa(e);
      return '<div class="mensagens' + (abertaConv ? ' com-conv' : '') + '"><div class="lista"><h3>' + T.inbox + '</h3>' + lista.map(function (c, i) {
        return '<button type="button" class="conv-it' + (i === 0 ? ' ativo' : '') + '" data-conv="' + i + '"><span class="av">' + esc(Marca.iniciais(c.nome)) + '</span><span class="tx"><b>' + esc(c.nome) + '</b><small>' + esc(c.canal) + ' · ' + esc(c.txt) + '</small></span>' + (c.novo ? '<span class="bolinha">1</span>' : '') + '</button>';
      }).join('') + '</div>' +
        '<div class="conversa"><div class="conv-cab"><button type="button" class="voltar-lista" aria-label="Voltar">‹</button><b>' + esc(e.destaque.cliente.nome) + '</b><small>' + T.site + '</small></div><div class="fio-p">' +
        conv.map(function (m) { return '<div class="mp ' + (m.de === 'cli' ? 'cli' : 'ia') + '">' + (m.de !== 'cli' ? '<span class="quem">✨ ' + T.ai + (m.auto ? ' · ' + T.auto : '') + ' <span class="selo-sob">' + T.complete + '</span></span>' : '') + esc(m.txt) + '</div>'; }).join('') +
        '</div></div></div>';
    }
    function telaPedidos() {
      return '<div class="titulo-p">' + T.orders + ' <span class="selo-sob">' + T.custom + '</span></div><div class="kanban">' + COLUNAS.map(function (c) {
        var ps = e.pedidos.filter(function (p) { return p.coluna === c; });
        return '<div class="col"><h4>' + T.cols[c] + ' <span>' + ps.length + '</span></h4>' + ps.map(cardPedido).join('') + '</div>';
      }).join('') + '</div>';
    }
    function telaResumo() {
      var r = resumoDia(e);
      return '<div class="titulo-p">' + T.today + ' <span class="selo-sob">' + T.custom + '</span></div><div class="kpis">' +
        '<div class="kpi"><small>' + T.orders2 + '</small><b>' + r.pedidos + '</b></div><div class="kpi"><small>' + T.revenue + '</small><b>' + Marca.preco(r.faturamento, l) + '</b></div><div class="kpi"><small>' + T.avg + '</small><b>' + Marca.preco(r.ticket, l) + '</b></div></div>' +
        '<p class="dica">' + T.tip + '</p>';
    }
    function desenha() {
      raizEl.innerHTML =
        '<div class="faixa-demo">' + T.demo + (e.real ? '' : ' · ' + T.sample) + '</div>' +
        '<header class="barra-p"><div class="logo" data-logo></div><div><b data-nome></b><small>AbertoCore</small></div></header>' +
        '<nav class="abas-p" role="tablist">' + [['mensagens', '💬 ' + T.msgs], ['pedidos', '🧾 ' + T.orders], ['resumo', '📊 ' + T.today]].map(function (a) { return '<button type="button" role="tab" data-aba="' + a[0] + '" aria-selected="' + (aba === a[0]) + '">' + a[1] + '</button>'; }).join('') + '</nav>' +
        '<main class="corpo-p">' + (aba === 'mensagens' ? telaMensagens() : aba === 'pedidos' ? telaPedidos() : telaResumo()) + '</main>' +
        '<div class="acoes-p"><a class="btn sec" href="index.html' + esc(win.location.search) + '">' + T.back + '</a><a class="btn" target="_blank" rel="noopener" href="' + linkWhats(cfg) + '">' + T.want + '</a></div>';
      Marca.aplica(cfg, doc);
    }
    raizEl.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-aba]'), b = ev.target.closest('.avancar'), c = ev.target.closest('[data-conv]'), v = ev.target.closest('.voltar-lista');
      if (a) { aba = a.getAttribute('data-aba'); desenha(); }
      if (b) { avanca(e, parseInt(b.getAttribute('data-num'), 10), win.sessionStorage); desenha(); }
      if (c && c.getAttribute('data-conv') === '0') { abertaConv = true; desenha(); }
      if (v) { abertaConv = false; desenha(); }
    });
    desenha();
    // aviso de pedido novo
    var t = doc.createElement('div'); t.className = 'toast';
    t.innerHTML = '🔔 <b>' + T.newOrder + ' #' + e.destaque.num + '</b> · ' + Marca.preco(e.destaque.total, l);
    doc.body.appendChild(t);
    setTimeout(function () { t.classList.add('vis'); }, 300);
    setTimeout(function () { t.classList.remove('vis'); }, 5200);
    try { if (e.real) { var ctx = new (win.AudioContext || win.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.value = 0.05; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15); } } catch (er) {}
  }

  var Painel = { estado: estado, avanca: avanca, conversa: conversa, confirmacao: confirmacao, resumoDia: resumoDia, linkWhats: linkWhats, monta: monta };
  if (noNode) module.exports = Painel;
  else raiz.Painel = Painel;
})(typeof window !== 'undefined' ? window : this);

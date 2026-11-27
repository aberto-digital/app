/* AbertoCore · Link de experiência: modelo Orçamento.
   Site: o cliente escolhe o serviço, responde as perguntas do nicho, anexa até 3 fotos
   (ficam só no aparelho, reduzidas) e pede o orçamento.
   Vitrine (lado do dono): card em "Novo orçamento" com respostas e fotos, a confirmação
   automática na conversa e "Gerar proposta" (sob medida) com envio ao cliente.
   A lógica roda no Node para os testes; monta() e vitrine.tela() desenham no navegador. */
(function (raiz) {
  var noNode = typeof module !== 'undefined' && module.exports;
  var NICHOS = noNode ? require('./nichos.js') : raiz.NICHOS;
  var Marca = noNode ? require('./marca.js') : raiz.Marca;
  var Comum = noNode ? require('./comum.js') : raiz.Comum;
  var CHAVE = 'abertocore-experiencia', NUM = 102, MAX_FOTOS = 3, MAX_FOTO = 120000;
  var COLUNAS = ['novo', 'proposta', 'negociacao', 'fechado'];

  function tipos(n) {
    var lista = {};
    NICHOS[n].categorias.forEach(function (c) { c.itens.forEach(function (i) { lista[i.id] = i; }); });
    return lista;
  }
  function faixa(i, l) { return l === 'en' ? { de: i.deUsd, ate: i.ateUsd } : { de: i.de, ate: i.ate }; }
  function txt(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, max); }

  function novo(cfg) { return { cfg: cfg, tipo: null, respostas: {}, fotos: [] }; }

  // dados = { cliente:{nome,tel} }
  function finaliza(o, dados, armazem, chat) {
    dados = dados || {};
    var cfg = o.cfg, l = cfg.l, N = NICHOS[cfg.n], it = tipos(cfg.n)[o.tipo];
    if (!it) throw new Error('Escolha o serviço.');
    var cli = dados.cliente || {};
    if (!String(cli.nome || '').trim() || !String(cli.tel || '').trim()) throw new Error('Preencha nome e telefone.');
    var r = o.respostas || {};
    var respostas = (N.perguntas || []).filter(function (p) { return txt(r[p.id], 120); }).map(function (p) { return { id: p.id, p: p.rot[l], r: txt(r[p.id], 120) }; });
    var fotos = (o.fotos || []).filter(function (f) { return typeof f === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(f) && f.length <= MAX_FOTO; }).slice(0, MAX_FOTOS);
    var fx = faixa(it, l);
    var est = {
      cfg: cfg,
      orcamento: {
        num: NUM, tipo: { id: it.id, nome: it.nome[l], img: it.img, de: fx.de, ate: fx.ate },
        respostas: respostas, fotos: fotos,
        cliente: { nome: String(cli.nome).trim().slice(0, 60), tel: String(cli.tel).trim().slice(0, 30) }, ts: Date.now(),
      },
      chat: (chat || []).slice(-30),
    };
    armazem.setItem(CHAVE, JSON.stringify(est));
    return est;
  }

  // ---------------- vitrine (lado do dono) ----------------
  function estado(armazem, cfg) {
    var est = null, l = cfg.l, N = NICHOS[cfg.n];
    try { est = JSON.parse(armazem.getItem(CHAVE) || 'null'); } catch (e) { est = null; }
    var real = !!(est && est.orcamento && est.orcamento.tipo && est.orcamento.cliente);
    var itens = N.categorias.reduce(function (a, c) { return a.concat(c.itens); }, []);
    var d;
    if (real) d = est.orcamento;
    else {
      var it = itens[0], fx = faixa(it, l);
      d = { num: NUM, tipo: { id: it.id, nome: it.nome[l], img: it.img, de: fx.de, ate: fx.ate },
        respostas: (N.perguntas || []).map(function (p) { return { id: p.id, p: p.rot[l], r: p.op ? p.op[l][1] : String(p.ph[l]).replace(/^(Ex\.|E\.g\.)\s*:?\s*/i, '') }; }),
        fotos: [], cliente: { nome: l === 'en' ? 'Sample customer' : 'Cliente de exemplo', tel: '' }, ts: Date.now() };
    }
    var cols = (est && est.colunas) || {}, ex = N.exemplos;
    function exemplo(id, i, coluna) { var x = itens[(i + 1) % itens.length], fx = faixa(x, l); return { id: id, nome: ex[i].nome, tipo: x.nome[l], img: x.img, valor: valor(fx), coluna: cols[id] || coluna, respostas: [], fotos: [] }; }
    var cards = [
      { id: 'r', nome: d.cliente.nome, tipo: d.tipo.nome, img: d.tipo.img, respostas: d.respostas, fotos: d.fotos || [], coluna: cols.r || 'novo', real: real, destaque: true },
      exemplo('e1', 0, 'proposta'), exemplo('e2', 1, 'negociacao'), exemplo('e3', 2, 'fechado'),
    ];
    return { real: real, cfg: cfg, destaque: d, cards: cards, chat: (est && est.chat) || [], colunas: cols, enviada: !!(est && est.enviada), bruto: real ? est : null };
  }

  function valor(fx) { return Math.round((fx.de + fx.ate) / 2 / 10) * 10; }

  function proposta(e) {
    var d = e.destaque, en = e.cfg.l === 'en';
    return {
      num: d.num, tipo: d.tipo.nome, img: d.tipo.img, cliente: d.cliente.nome, valor: valor(d.tipo), validade: 7,
      detalhes: d.respostas.map(function (r) { return r.p + ': ' + r.r; }),
      condicoes: en ? ['50% to start, 50% on completion', 'Materials and labor included', 'Warranty: 90 days'] : ['50% na aprovação e 50% na entrega', 'Material e mão de obra inclusos', 'Garantia de 90 dias'],
    };
  }

  function grava(e, armazem) { if (e.real && armazem) { e.bruto.colunas = e.colunas; e.bruto.enviada = e.enviada; armazem.setItem(CHAVE, JSON.stringify(e.bruto)); } }

  function avanca(e, id, armazem) {
    var c = e.cards.filter(function (x) { return x.id === id; })[0]; if (!c) return e;
    var i = COLUNAS.indexOf(c.coluna);
    if (i < COLUNAS.length - 1) c.coluna = COLUNAS[i + 1];
    e.colunas[id] = c.coluna; grava(e, armazem);
    return e;
  }

  function enviaProposta(e, armazem) {
    var c = e.cards.filter(function (x) { return x.id === 'r'; })[0];
    if (COLUNAS.indexOf(c.coluna) < 1) c.coluna = 'proposta';
    e.colunas.r = c.coluna; e.enviada = true; e.enviadaTs = Date.now(); grava(e, armazem);
    return e;
  }

  function confirmacao(e) {
    var d = e.destaque, cfg = e.cfg, pn = d.cliente.nome.split(' ')[0], f = (d.fotos || []).length;
    if (cfg.l === 'en') return 'Hi ' + pn + '! ' + cfg.nome + ' received your quote request #' + d.num + ' (' + d.tipo.nome + ').' + (f ? ' We got your ' + f + (f > 1 ? ' photos' : ' photo') + '.' : '') + ' We will review it and send you the price today.';
    return 'Oi, ' + pn + '! A ' + cfg.nome + ' recebeu seu pedido de orçamento #' + d.num + ' (' + d.tipo.nome + ').' + (f ? ' Recebemos ' + (f > 1 ? 'suas ' + f + ' fotos' : 'sua foto') + '.' : '') + ' Vamos analisar e te mandar o valor ainda hoje.';
  }
  function msgProposta(e) {
    var p = proposta(e), l = e.cfg.l;
    if (l === 'en') return 'Here is your quote #' + p.num + ': ' + p.tipo + ', ' + Marca.preco(p.valor, 'en') + '. Valid for ' + p.validade + ' days. To approve, just reply YES.';
    return 'Segue a proposta #' + p.num + ': ' + p.tipo + ', ' + Marca.preco(p.valor, 'pt') + '. Válida por ' + p.validade + ' dias. Para aprovar, é só responder SIM.';
  }

  function conversa(e) {
    var msgs = (e.chat || []).filter(function (m) { return m && m.txt; }).map(function (m) { return { de: m.de === 'cli' ? 'cli' : 'ia', txt: m.txt, ts: m.ts }; });
    if (msgs.length && !msgs.some(function (m) { return m.de === 'cli'; })) msgs = [];
    if (msgs.length && msgs[0].de === 'ia') msgs.shift();
    msgs.push({ de: 'ia', txt: confirmacao(e), ts: e.destaque.ts, auto: true });
    if (e.enviada) msgs.push({ de: 'eq', txt: msgProposta(e), ts: e.enviadaTs || Date.now() });
    return msgs;
  }

  // ---------------- navegador: vitrine ----------------
  var esc = Comum.esc;
  function textos(en) {
    return en ? {
      funil: 'Quotes', prop: 'Proposal', novo: 'New quote', custom: 'Custom build', next: 'Move on →', gerar: 'Create proposal',
      cols: { novo: 'New quote', proposta: 'Proposal sent', negociacao: 'Negotiating', fechado: 'Won' },
      enviar: 'Send to the customer', enviada: 'Sent to the customer ✓', validade: 'Valid for', dias: 'days', para: 'For', servico: 'Service',
      detalhes: 'Details', total: 'Total', condicoes: 'Terms', fotos: 'photos',
      dica: 'Every request lands here with the answers and photos. One tap creates the proposal with your logo and sends it.',
    } : {
      funil: 'Orçamentos', prop: 'Proposta', novo: 'Novo orçamento', custom: 'Sob medida', next: 'Avançar →', gerar: 'Gerar proposta',
      cols: { novo: 'Novo orçamento', proposta: 'Proposta enviada', negociacao: 'Negociação', fechado: 'Fechado' },
      enviar: 'Enviar ao cliente', enviada: 'Enviada ao cliente ✓', validade: 'Válida por', dias: 'dias', para: 'Para', servico: 'Serviço',
      detalhes: 'Detalhes', total: 'Total', condicoes: 'Condições', fotos: 'fotos',
      dica: 'Cada pedido chega aqui com as respostas e as fotos. Com um toque a proposta sai com a sua marca e vai para o cliente.',
    };
  }
  var vitrine = {
    estado: estado, avanca: avanca, conversa: conversa, confirmacao: confirmacao, proposta: proposta, enviaProposta: enviaProposta,
    abas: function (en) { var t = textos(en); return [['funil', '📝 ' + t.funil], ['proposta', '📄 ' + t.prop]]; },
    inicial: 'funil',
    toast: function (e) { var t = textos(e.cfg.l === 'en'); return '📝 <b>' + t.novo + ' #' + e.destaque.num + '</b> · ' + esc(e.destaque.tipo.nome); },
    resumoLista: function (e) { var t = textos(e.cfg.l === 'en'); return t.novo + ' #' + e.destaque.num; },
    tela: function (aba, e) {
      var l = e.cfg.l, t = textos(l === 'en');
      if (aba === 'proposta') {
        var p = proposta(e);
        return '<div class="titulo-p">' + t.prop + ' <span class="selo-sob">' + t.custom + '</span></div>' +
          '<div class="doc-p"><div class="doc-cab"><div class="logo" data-logo></div><div><b data-nome></b><small>' + t.prop + ' #' + p.num + '</small></div></div>' +
          '<div class="doc-l"><span>' + t.para + '</span><b>' + esc(p.cliente) + '</b></div>' +
          '<div class="doc-l"><span>' + t.servico + '</span><b>' + p.img + ' ' + esc(p.tipo) + '</b></div>' +
          (p.detalhes.length ? '<div class="doc-det"><span>' + t.detalhes + '</span><ul>' + p.detalhes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
          '<div class="doc-det"><span>' + t.condicoes + '</span><ul>' + p.condicoes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '<li>' + t.validade + ' ' + p.validade + ' ' + t.dias + '</li></ul></div>' +
          '<div class="doc-l total"><span>' + t.total + '</span><b>' + Marca.preco(p.valor, l) + '</b></div></div>' +
          (e.enviada ? '<p class="ok-p">' + t.enviada + '</p>' : '<button type="button" class="btn" data-enviar="1">' + t.enviar + '</button>');
      }
      return '<div class="titulo-p">' + t.funil + '</div><div class="kanban">' + COLUNAS.map(function (c) {
        var cs = e.cards.filter(function (x) { return x.coluna === c; });
        return '<div class="col"><h4>' + t.cols[c] + ' <span>' + cs.length + '</span></h4>' + cs.map(function (x) {
          return '<div class="pcard' + (x.destaque ? ' destaque' : '') + '"><div class="pc-top"><b>' + esc(x.nome) + '</b>' + (x.destaque ? '<span>#' + e.destaque.num + '</span>' : '') + '</div><small>' + x.img + ' ' + esc(x.tipo) + (x.valor ? ' · ' + Marca.preco(x.valor, l) : '') + '</small>' +
            (x.respostas.length ? '<ul class="resp">' + x.respostas.map(function (r) { return '<li><span>' + esc(r.p) + '</span> ' + esc(r.r) + '</li>'; }).join('') + '</ul>' : '') +
            (x.fotos.length ? '<div class="fotos-p">' + x.fotos.map(function (f) { return '<img alt="" src="' + esc(f) + '">'; }).join('') + '</div>' : '') +
            (x.destaque ? '<button type="button" class="avancar sec-p" data-gerar="1">' + t.gerar + ' <span class="selo-sob">' + t.custom + '</span></button>' : '') +
            (x.coluna !== 'fechado' ? '<button type="button" class="avancar" data-card="' + x.id + '">' + t.next + '</button>' : '') + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div><p class="dica">' + t.dica + '</p>';
    },
    clique: function (ev, e, armazem, ir) {
      var b = ev.target.closest('[data-card]'), g = ev.target.closest('[data-gerar]'), s = ev.target.closest('[data-enviar]');
      if (b) { avanca(e, b.getAttribute('data-card'), armazem); return true; }
      if (g) { ir('proposta'); return true; }
      if (s) { enviaProposta(e, armazem); ir('mensagens'); return true; }
      return false;
    },
  };

  // reduz a foto no aparelho (até 320 px, JPEG) antes de guardar na sessão
  function reduz(arquivo, doc) {
    return new Promise(function (ok) {
      try {
        var leitor = new FileReader();
        leitor.onload = function () {
          var img = new Image();
          img.onload = function () {
            var m = 320, k = Math.min(1, m / Math.max(img.width, img.height)), c = doc.createElement('canvas');
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            ok(c.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = function () { ok(''); };
          img.src = leitor.result;
        };
        leitor.onerror = function () { ok(''); };
        leitor.readAsDataURL(arquivo);
      } catch (e) { ok(''); }
    });
  }

  // ---------------- navegador: site ----------------
  function monta(doc, win) {
    var E = win.EXP, cfg = E.cfg, N = E.nicho, l = cfg.l, en = l === 'en';
    var o = novo(cfg), F = Comum.folha(doc), form = { nome: '', tel: '' }, lista = tipos(cfg.n);
    var tx = en ? {
      need: 'What do you need?', from: 'from', ask: 'Quote', photos: 'Photos (optional, up to 3)', addPhoto: '📷 Add photos',
      photoNote: 'In this demo the photos stay on your device.', name: 'Your name', phone: 'Phone', send: 'Request quote',
      done: 'Quote request #' + NUM + ' sent!', seeSide: 'Now see it arrive at your business →', reviews: 'What customers say', demoBy: 'Demo made by',
      err: 'Please fill in your name and phone.', remove: 'Remove',
    } : {
      need: 'Do que você precisa?', from: 'a partir de', ask: 'Orçamento', photos: 'Fotos (opcional, até 3)', addPhoto: '📷 Adicionar fotos',
      photoNote: 'Na demonstração as fotos ficam só no seu aparelho.', name: 'Seu nome', phone: 'Telefone (WhatsApp)', send: 'Pedir orçamento',
      done: 'Pedido de orçamento #' + NUM + ' enviado!', seeSide: 'Agora veja chegando na sua empresa →', reviews: 'O que os clientes dizem', demoBy: 'Demonstração feita pela',
      err: 'Preencha nome e telefone.', remove: 'Tirar',
    };
    var main = doc.getElementById('conteudo');
    var emojis = []; N.categorias.forEach(function (c) { c.itens.forEach(function (i) { emojis.push(i.img); }); });
    Comum.casca(doc, win, 'orcamento', en, emojis);
    var html = '<section class="cat" id="cat0"><h2 style="margin-top:18px">' + tx.need + '</h2><div class="grade">' + N.categorias.map(function (c) {
      return c.itens.map(function (it) {
        return '<button type="button" class="item" data-tipo="' + it.id + '"><div class="txt"><b>' + esc(it.nome[l]) + '</b><small>' + esc(it.ds[l]) + '</small><div class="preco"><small>' + tx.from + '</small> ' + Marca.preco(faixa(it, l).de, l) + '</div><span class="pilula">' + tx.ask + '</span></div><div class="ilu vis"><span aria-hidden="true">' + it.img + '</span></div></button>';
      }).join('');
    }).join('') + '</div></section>';
    html += '<section class="avaliacoes"><h2>' + tx.reviews + '</h2>' + [
      en ? ['Sent photos at night and had the price the next morning.', 'Mariana R.'] : ['Mandei as fotos à noite e de manhã já tinha o valor.', 'Mariana R.'],
      en ? ['Clear quote, no surprises, great job.', 'Lucas F.'] : ['Orçamento claro, sem surpresa no final. Serviço caprichado.', 'Lucas F.'],
    ].map(function (a) { return '<div class="av"><span class="est">★★★★★</span> ' + esc(a[0]) + '<br><small>' + esc(a[1]) + ' · ' + (en ? 'example review' : 'avaliação de exemplo') + '</small></div>'; }).join('') + '</section>';
    html += '<div class="info-loja" id="perfil">🕒 ' + esc(E.t.info) + (cfg.cidade ? '<br>📍 ' + esc(cfg.cidade) : '') + '</div>';
    html += '<p class="rodape-demo">' + tx.demoBy + ' <a href="https://abertodigital.com" target="_blank" rel="noopener">abertodigital</a></p>';
    main.innerHTML = html;
    main.addEventListener('click', function (e) { var b = e.target.closest('[data-tipo]'); if (b) { o.tipo = b.getAttribute('data-tipo'); tela(); } });

    function guarda() {
      (N.perguntas || []).forEach(function (p) { var el = doc.getElementById('q_' + p.id); if (el) o.respostas[p.id] = el.value; });
      var a = doc.getElementById('cNome'), b = doc.getElementById('cTel'); if (a) form.nome = a.value; if (b) form.tel = b.value;
    }
    function tela() {
      var it = lista[o.tipo];
      F.abre('<h2>' + it.img + ' ' + esc(it.nome[l]) + '<button class="fechar" aria-label="Fechar">×</button></h2>' +
        (N.perguntas || []).map(function (p) {
          if (p.op) return '<div class="campo"><label>' + esc(p.rot[l]) + '</label><div class="opcoes">' + p.op[l].map(function (v) { return '<button type="button" data-resp="' + p.id + '" data-v="' + esc(v) + '" aria-pressed="' + (o.respostas[p.id] === v) + '">' + esc(v) + '</button>'; }).join('') + '</div></div>';
          return '<div class="campo"><label for="q_' + p.id + '">' + esc(p.rot[l]) + '</label><input id="q_' + p.id + '" maxlength="120" placeholder="' + esc(p.ph[l]) + '" value="' + esc(o.respostas[p.id] || '') + '"></div>';
        }).join('') +
        '<div class="campo"><label>' + tx.photos + '</label><div class="fotos-s">' + o.fotos.map(function (f, i) { return '<span><img alt="" src="' + esc(f) + '"><button type="button" data-tira="' + i + '" aria-label="' + tx.remove + '">×</button></span>'; }).join('') +
        (o.fotos.length < MAX_FOTOS ? '<label class="add-foto">' + tx.addPhoto + '<input type="file" accept="image/*" multiple id="fFotos"></label>' : '') + '</div><small class="nota-f">' + tx.photoNote + '</small></div>' +
        '<div class="campo"><label for="cNome">' + tx.name + '</label><input id="cNome" autocomplete="name" value="' + esc(form.nome) + '"></div>' +
        '<div class="campo"><label for="cTel">' + tx.phone + '</label><input id="cTel" inputmode="tel" autocomplete="tel" value="' + esc(form.tel) + '"></div>' +
        '<button type="button" class="btn" id="oEnviar">' + tx.send + '</button><p class="aviso oculto" id="erroCk"></p>');
      F.el.querySelectorAll('[data-resp]').forEach(function (b) { b.onclick = function () { guarda(); o.respostas[b.getAttribute('data-resp')] = b.getAttribute('data-v'); tela(); }; });
      F.el.querySelectorAll('[data-tira]').forEach(function (b) { b.onclick = function () { guarda(); o.fotos.splice(+b.getAttribute('data-tira'), 1); tela(); }; });
      var inp = doc.getElementById('fFotos');
      if (inp) inp.onchange = function () {
        guarda();
        var arqs = Array.prototype.slice.call(inp.files || [], 0, MAX_FOTOS - o.fotos.length);
        Promise.all(arqs.map(function (a) { return reduz(a, doc); })).then(function (fs) { fs.forEach(function (f) { if (f) o.fotos.push(f); }); tela(); });
      };
      doc.getElementById('oEnviar').onclick = function () {
        guarda();
        try { finaliza(o, { cliente: { nome: form.nome, tel: form.tel } }, win.sessionStorage, win.Chat ? win.Chat.historico() : []); }
        catch (er) { var av = doc.getElementById('erroCk'); av.textContent = /nome/i.test(er.message) ? tx.err : er.message; av.classList.remove('oculto'); return; }
        F.abre(Comum.transicao(tx.done, it.nome[l], 'painel.html' + win.location.search, tx.seeSide, en));
      };
    }
  }

  var Orcamento = { novo: novo, finaliza: finaliza, monta: monta, vitrine: vitrine, CHAVE: CHAVE };
  if (noNode) module.exports = Orcamento;
  else raiz.Orcamento = Orcamento;
})(typeof window !== 'undefined' ? window : this);

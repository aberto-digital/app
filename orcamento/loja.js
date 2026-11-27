/* AbertoCore · página pública do orçamento online.
   Lê os produtos e serviços da empresa (GET /api/orcamento/{slug}) e envia o pedido (POST .../pedir).
   Os preços do pedido são sempre os do cadastro: o servidor ignora o que o navegador mandar. */
(function (raiz) {
  var NOSSO = /(^|\.)abertodigital\.com$|^localhost$|^127\.0\.0\.1$/.test(raiz.location.hostname);
  var API = (function () { try { return raiz.localStorage.getItem('abertocore-api'); } catch (e) { return null; } })() || (NOSSO ? 'https://api.abertodigital.com' : raiz.location.origin);
  var slug = (new URLSearchParams(raiz.location.search).get('e') || '').toLowerCase();
  var doc = raiz.document, Marca = raiz.Marca;
  var EMOJI = { 'Pacote': '📦', 'Módulo': '🧩', 'Serviço': '🛠️', 'Produto': '🛍️' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(m, u, b) {
    return fetch(API + u, { method: m, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.message || 'Algo deu errado. Tente de novo.'); return j; }); });
  }
  function dinheiro(v) { return Marca.preco(v, 'pt'); }
  function precoTxt(p, mostra) {
    if (!mostra) return '';
    if (p.setup == null && p.mensal == null) return 'Sob consulta';
    var t = [];
    if (p.setup) t.push(dinheiro(p.setup)); else if (p.setup === 0 && !p.mensal) t.push('Grátis');
    if (p.mensal) t.push(dinheiro(p.mensal) + '/mês');
    return t.join(' + ') || 'Sob consulta';
  }
  function visual(p) { return p.foto ? '<img alt="" loading="lazy" decoding="async" src="' + esc(p.foto) + '">' : '<span class="mp-sem-foto" aria-hidden="true">' + (EMOJI[p.tipo] || '📦') + '</span>'; }

  function monta(D) {
    var main = doc.getElementById('conteudo'), mostra = D.mostrarPrecos !== false, P = D.produtos || [];
    var cor = (D.marca && D.marca.cor) || '#2F6FED';
    var cfg = { cor: cor, nome: D.empresa || 'Orçamento', logo: (D.marca && D.marca.logo) || '', l: 'pt' };
    Marca.aplica(cfg, doc);
    if (D.marca && D.marca.fundo) doc.body.style.background = D.marca.fundo;
    doc.title = (D.titulo || 'Orçamento online') + ' · ' + (D.empresa || '');
    doc.getElementById('sub').textContent = D.site ? D.site.replace(/^https?:\/\//, '') : '';
    doc.getElementById('titulo').textContent = D.titulo || 'Monte seu orçamento';
    doc.getElementById('chamada').textContent = 'Escolha o que você precisa e envie. Retornamos pelo WhatsApp.';
    if (!P.length) { main.innerHTML = '<p class="erro-pag">Ainda não há itens disponíveis para orçamento. Fale com a gente' + (D.whatsapp ? ' pelo WhatsApp ' + esc(D.whatsapp) : '') + '.</p>'; return; }

    var tipos = []; P.forEach(function (p) { var t = p.tipo || 'Itens'; if (tipos.indexOf(t) < 0) tipos.push(t); });
    var cesta = {}; // id -> qtd
    function porId(id) { return P.filter(function (p) { return p.id === id; })[0]; }
    function maxQ(p) { return p.estoque == null ? 99 : p.estoque; }

    var html = '<div class="menu">' + (tipos.length > 1 ? '<div class="ferr"><nav class="abas" role="tablist">' + tipos.map(function (t, i) { return '<button role="tab" data-cat="' + i + '" aria-selected="' + (i === 0) + '">' + esc(t) + '</button>'; }).join('') + '</nav></div>' : '') +
      tipos.map(function (t, i) {
        return '<section class="cat" id="cat' + i + '"><h2>' + esc(t) + '</h2><div class="grade">' + P.filter(function (p) { return (p.tipo || 'Itens') === t; }).map(function (p) {
          return '<button type="button" class="item" data-abre="' + p.id + '"><div class="txt"><b>' + esc(p.nome) + '</b><small>' + esc(p.ds) + '</small><div class="preco">' + esc(precoTxt(p, mostra)) + '</div></div><div class="ilu vis">' + visual(p) + '</div></button>';
        }).join('') + '</div></section>';
      }).join('') +
      '<div class="info-loja">' + (D.whatsapp ? '📱 ' + esc(D.whatsapp) : '') + '</div></div>' +
      '<aside class="sacola" id="sacola" aria-label="Seu orçamento"></aside>';
    main.innerHTML = html;
    var barra = doc.createElement('button'); barra.className = 'barra-carrinho oculto'; barra.type = 'button'; doc.body.appendChild(barra);
    var folha = doc.createElement('div'); folha.className = 'folha oculto'; doc.body.appendChild(folha);
    function abre(c, cls) { folha.className = 'folha' + (cls ? ' ' + cls : ''); folha.innerHTML = '<div class="caixa" role="dialog" aria-modal="true">' + c + '</div>'; }
    function fecha() { folha.classList.add('oculto'); folha.innerHTML = ''; }
    folha.addEventListener('click', function (e) { if (e.target === folha || e.target.closest('.fechar')) fecha(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !folha.classList.contains('oculto')) fecha(); });

    function resumo() {
      var n = 0, setup = 0, mensal = 0, L = [];
      Object.keys(cesta).forEach(function (k) { var p = porId(+k), q = cesta[k]; if (!p || !q) return; n += q; setup += (p.setup || 0) * q; mensal += (p.mensal || 0) * q; L.push({ p: p, q: q }); });
      return { n: n, setup: setup, mensal: mensal, linhas: L };
    }
    function linhasHtml(r) {
      return r.linhas.map(function (x) {
        return '<div class="linha-s"><div class="ls-t"><b>' + esc(x.p.nome) + '</b>' + (mostra ? '<span>' + esc(precoTxt({ setup: x.p.setup == null ? null : x.p.setup * x.q, mensal: x.p.mensal == null ? null : x.p.mensal * x.q }, true)) + '</span>' : '') + '</div>' +
          '<div class="qtd"><button type="button" data-menos="' + x.p.id + '" aria-label="Menos">−</button><span>' + x.q + '</span><button type="button" data-mais="' + x.p.id + '" aria-label="Mais">+</button></div></div>';
      }).join('');
    }
    function totaisHtml(r) {
      if (!mostra) return '';
      return (r.setup ? '<div class="linha-c"><span>Implantação</span><span>' + dinheiro(r.setup) + '</span></div>' : '') +
        (r.mensal ? '<div class="linha-c"><span>Mensalidade</span><span>' + dinheiro(r.mensal) + '/mês</span></div>' : '') +
        (!r.setup && !r.mensal ? '<div class="linha-c"><span>Valor</span><span>Sob consulta</span></div>' : '') +
        '<div class="linha-c"><small>Valores de referência. A proposta final vem por WhatsApp.</small></div>';
    }
    function desenha() {
      var r = resumo();
      barra.classList.toggle('oculto', !r.n);
      barra.innerHTML = '<span><span class="n">' + r.n + '</span>Ver orçamento</span><span>' + (mostra && r.setup ? dinheiro(r.setup) : '') + '</span>';
      doc.getElementById('sacola').innerHTML = '<div class="sac-card"><h3>Seu orçamento</h3>' + (r.n ? linhasHtml(r) + totaisHtml(r) + '<button type="button" class="btn" data-checkout="1">Continuar</button>' :
        '<div class="sac-vazia"><span aria-hidden="true">📝</span><b>Nada escolhido</b><small>Toque em um item para adicionar.</small></div>') + '</div>';
      if (!folha.classList.contains('oculto') && folha.getAttribute('data-tela') === 'carrinho') telaCarrinho();
    }
    function add(id, q) { var p = porId(id); if (!p) return; cesta[id] = Math.min(maxQ(p), (cesta[id] || 0) + q); if (cesta[id] <= 0) delete cesta[id]; desenha(); }

    function abreProduto(id) {
      var p = porId(id), q = 1;
      abre('<div class="mp-foto"><div class="vis">' + visual(p) + '</div><button type="button" class="fechar fechar-foto" aria-label="Fechar">×</button></div>' +
        '<div class="mp-lado"><div class="mp-cab"><b>Detalhes</b><button type="button" class="fechar" aria-label="Fechar">×</button></div>' +
        '<div class="mp-scroll"><div class="mp-info"><h2>' + esc(p.nome) + '</h2><p>' + esc(p.ds) + '</p><div class="preco">' + esc(precoTxt(p, mostra)) + '</div>' +
        (p.estoque != null ? '<p><small>Disponível: ' + p.estoque + '</small></p>' : '') + '</div></div>' +
        '<footer class="mp-rodape"><div class="qtd"><button type="button" data-q="-1" aria-label="Menos">−</button><span id="mpQ">1</span><button type="button" data-q="1" aria-label="Mais">+</button></div>' +
        '<button type="button" class="btn-add" id="mpAdd"><span>Adicionar</span><span></span></button></footer></div>', 'prod');
      folha.setAttribute('data-tela', 'produto');
      folha.querySelector('.caixa').addEventListener('click', function (e) {
        var d = e.target.closest('[data-q]');
        if (d) { q = Math.max(1, Math.min(maxQ(p), q + Number(d.getAttribute('data-q')))); folha.querySelector('#mpQ').textContent = q; }
        if (e.target.closest('#mpAdd')) { add(id, q); fecha(); }
      });
    }
    function telaCarrinho() {
      var r = resumo(); if (!r.n) return fecha();
      abre('<h2>Seu orçamento<button class="fechar" aria-label="Fechar">×</button></h2>' + linhasHtml(r) + totaisHtml(r) + '<button type="button" class="btn" id="irCheckout">Continuar</button>');
      folha.setAttribute('data-tela', 'carrinho');
      folha.querySelector('#irCheckout').onclick = telaCheckout;
    }
    var form = { nome: '', tel: '', email: '', obs: '' };
    function telaCheckout() {
      var r = resumo();
      abre('<h2>Seus dados<button class="fechar" aria-label="Fechar">×</button></h2>' +
        '<div class="campo"><label for="cNome">Seu nome</label><input id="cNome" autocomplete="name" value="' + esc(form.nome) + '"></div>' +
        '<div class="campo"><label for="cTel">WhatsApp</label><input id="cTel" inputmode="tel" autocomplete="tel" placeholder="(11) 99999-9999" value="' + esc(form.tel) + '"></div>' +
        '<div class="campo"><label for="cEmail">E-mail (opcional)</label><input id="cEmail" type="email" autocomplete="email" value="' + esc(form.email) + '"></div>' +
        '<div class="campo"><label for="cObs">Quer contar mais? (opcional)</label><textarea id="cObs" rows="3">' + esc(form.obs) + '</textarea></div>' +
        '<input class="hp" id="cHp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<label class="cons"><input type="checkbox" id="cOk"> Autorizo o contato pelo WhatsApp ou e-mail sobre este orçamento.</label>' +
        '<div class="linha-c total"><span>' + r.n + (r.n === 1 ? ' item' : ' itens') + '</span><span>' + (mostra && r.setup ? dinheiro(r.setup) : '') + '</span></div>' +
        '<button type="button" class="btn" id="enviar">Pedir orçamento</button><p class="aviso oculto" id="erroCk"></p>');
      folha.setAttribute('data-tela', 'checkout');
      folha.querySelector('#enviar').onclick = function () {
        var g = function (i) { return folha.querySelector('#' + i).value; };
        form = { nome: g('cNome'), tel: g('cTel'), email: g('cEmail'), obs: g('cObs') };
        var er = folha.querySelector('#erroCk'), bt = this;
        bt.disabled = true;
        api('POST', '/api/orcamento/' + encodeURIComponent(slug) + '/pedir', {
          itens: Object.keys(cesta).map(function (k) { return { id: +k, qtd: cesta[k] }; }), nome: form.nome, whatsapp: form.tel, email: form.email, obs: form.obs,
          consentimento: folha.querySelector('#cOk').checked, site_url: g('cHp'),
        }).then(function () {
          cesta = {}; desenha();
          abre('<div class="ok-env"><div class="ok">✓</div><h2>Pedido enviado!</h2><p style="color:var(--sec)">' + esc(D.aviso || 'Recebemos seu pedido e retornamos em breve pelo WhatsApp.') + '</p><button type="button" class="btn fechar">Fechar</button></div>');
        }, function (e2) { bt.disabled = false; er.textContent = e2.message; er.classList.remove('oculto'); });
      };
    }
    main.addEventListener('click', function (e) {
      var a = e.target.closest('[data-abre]'), mo = e.target.closest('[data-mais]'), me = e.target.closest('[data-menos]'), ck = e.target.closest('[data-checkout]'), c = e.target.closest('[data-cat]');
      if (a) abreProduto(+a.getAttribute('data-abre'));
      if (mo) add(+mo.getAttribute('data-mais'), 1);
      if (me) add(+me.getAttribute('data-menos'), -1);
      if (ck) telaCheckout();
      if (c) {
        main.querySelectorAll('[data-cat]').forEach(function (x) { x.setAttribute('aria-selected', x === c); });
        var el = doc.getElementById('cat' + c.getAttribute('data-cat')); if (el) raiz.scrollTo({ top: el.getBoundingClientRect().top + raiz.scrollY - 120, behavior: 'smooth' });
      }
    });
    folha.addEventListener('click', function (e) {
      var mo = e.target.closest('[data-mais]'), me = e.target.closest('[data-menos]');
      if (mo) add(+mo.getAttribute('data-mais'), 1);
      if (me) add(+me.getAttribute('data-menos'), -1);
    });
    barra.onclick = telaCarrinho;
    desenha();
  }

  function erro(msg) { doc.getElementById('conteudo').innerHTML = '<p class="erro-pag">' + esc(msg) + '</p>'; }
  function descobreSlug() {
    if (slug || NOSSO) return Promise.resolve(slug);
    return api('GET', '/api/agenda-dominio?host=' + encodeURIComponent(raiz.location.hostname)).then(function (j) { slug = j.slug; return slug; });
  }
  descobreSlug().then(function (s) {
    if (!s) throw new Error('Link incompleto. Peça o link do orçamento para a empresa.');
    return api('GET', '/api/orcamento/' + encodeURIComponent(s));
  }).then(monta, function (e) { erro(e.message); });
})(window);

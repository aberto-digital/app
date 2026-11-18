/* =====================================================================
   AbertoCore: sincronização com o servidor (api.abertodigital.com)

   - Sem login: modo demonstração, dados só neste navegador (como antes).
   - Com login: os dados da empresa do usuário são baixados do servidor e
     cada alteração salva no navegador é enviada ao servidor em seguida.
   - Cada usuário só enxerga a própria empresa (regras no PocketBase).

   O app continua lendo e gravando no localStorage (core/dados.js); este
   arquivo só copia essas gravações para o servidor e vice-versa.
   ===================================================================== */
(function () {
  'use strict';
  var BASE = localStorage.getItem('abertocore-api') || 'https://api.abertodigital.com';
  var CHAVE = 'abertocore-demo-v1';
  var CHAVE_CONTRATADA = 'abertocore-contratada-v1';
  var CHAVE_AUTH = 'abertocore-auth-v1';
  var CHAVE_SYNC = 'abertocore-sync-v1';
  var COLS = ['contatos', 'eventos', 'produtos'];

  var auth = ler(CHAVE_AUTH);
  var mapa = ler(CHAVE_SYNC) || {};
  var timer = null, enviando = false, pendente = false, aplicandoRemoto = false;
  var estado = 'local';
  var pronto = !auth, esperando = false; // com login, só envia depois de baixar o que está no servidor

  function ler(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  var setOriginal = Storage.prototype.setItem;
  function gravar(k, v) { setOriginal.call(localStorage, k, typeof v === 'string' ? v : JSON.stringify(v)); }
  function hash(o) { var s = JSON.stringify(o), h = 0; for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return String(h); }

  function api(metodo, caminho, corpo) {
    var op = { method: metodo, headers: {} };
    if (auth && auth.token) op.headers.Authorization = auth.token;
    if (corpo !== undefined) { op.headers['Content-Type'] = 'application/json'; op.body = JSON.stringify(corpo); }
    return fetch(BASE + caminho, op).then(function (r) {
      if (r.status === 401 || r.status === 403) { sairLocal(); throw new Error('Sessão expirada. Entre de novo.'); }
      if (r.status === 204) return null;
      return r.json().then(function (j) { if (!r.ok) throw new Error(j && j.message || ('Erro ' + r.status)); return j; });
    });
  }
  function listarTudo(col) {
    var itens = [];
    function pagina(n) {
      return api('GET', '/api/collections/' + col + '/records?perPage=500&page=' + n).then(function (j) {
        itens = itens.concat(j.items || []);
        return n < (j.totalPages || 1) ? pagina(n + 1) : itens;
      });
    }
    return pagina(1);
  }

  /* ---------- login ---------- */
  function entrar(email, senha) {
    return fetch(BASE + '/api/collections/users/auth-with-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password: senha })
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error('E-mail ou senha incorretos.'); return j; }); })
      .then(function (j) {
        if (!j.record || !j.record.empresa) throw new Error('Este usuário ainda não está ligado a uma empresa.');
        auth = { token: j.token, id: j.record.id, email: j.record.email, empresa: j.record.empresa, papel: j.record.papel };
        gravar(CHAVE_AUTH, auth);
        mapa = {}; gravar(CHAVE_SYNC, mapa); pronto = true;
        return primeiraSincronizacao();
      });
  }
  function sairLocal() { auth = null; localStorage.removeItem(CHAVE_AUTH); localStorage.removeItem(CHAVE_SYNC); mapa = {}; marca('local'); }
  function sair() { sairLocal(); location.reload(); }

  /* ---------- baixar do servidor ---------- */
  function baixar() {
    return Promise.all(COLS.map(listarTudo).concat([listarTudo('configuracoes')])).then(function (res) {
      var S = { contatos: [], eventos: [], produtos: [] }, novoMapa = { contatos: {}, eventos: {}, produtos: {}, config: null };
      COLS.forEach(function (col, i) {
        res[i].forEach(function (r) {
          var item = r.dados || {}; item.id = r.local_id;
          S[col].push(item);
          novoMapa[col][r.local_id] = { rid: r.id, h: hash(item) };
        });
        S[col].sort(function (a, b) { return a.id - b.id; });
      });
      var cfg = res[3][0];
      var c = (cfg && cfg.dados) || {};
      S.ia = c.ia; S.bot = c.bot; S.msgsCanal = c.msgsCanal || {}; S.prox = c.prox; S.catalogoV = c.catalogoV; S.enterpriseMigrado = c.enterpriseMigrado;
      if (cfg) novoMapa.config = { rid: cfg.id, h: hash(c) };
      return { S: S, mapa: novoMapa, contratada: c.contratada, vazio: !res.some(function (l) { return l.length; }) };
    });
  }
  function aplicarRemoto(r) {
    aplicandoRemoto = true;
    var S = r.S;
    if (!S.prox) {
      var m = function (L) { return L.reduce(function (x, i) { return Math.max(x, i.id || 0); }, 0) + 1; };
      S.prox = { c: m(S.contatos), e: m(S.eventos), p: m(S.produtos) };
    }
    gravar(CHAVE, S);
    if (r.contratada) gravar(CHAVE_CONTRATADA, r.contratada);
    mapa = r.mapa; gravar(CHAVE_SYNC, mapa);
    aplicandoRemoto = false;
  }

  function primeiraSincronizacao() {
    marca('sincronizando');
    return baixar().then(function (r) {
      if (r.vazio) {
        // Servidor vazio: envia o que está neste navegador (se houver)
        var local = ler(CHAVE) || {};
        var n = (local.contatos || []).length;
        var levar = n && confirm('A conta ainda está vazia no servidor.\n\nEste navegador tem ' + n + ' contatos (podem ser os dados de exemplo da demonstração).\n\nOK = enviar esses contatos para o servidor\nCancelar = começar com o sistema vazio (mantém produtos e configurações)');
        if (!levar) {
          aplicandoRemoto = true;
          gravar(CHAVE, { contatos: [], eventos: [], produtos: local.produtos || [], ia: local.ia, msgsCanal: {}, prox: { c: 1, e: 1, p: (local.prox && local.prox.p) || 1 }, catalogoV: local.catalogoV });
          aplicandoRemoto = false;
        }
        return enviarAgora(true).then(function () { marca('ok'); return 'vazio'; });
      }
      aplicarRemoto(r); marca('ok'); return 'baixado';
    });
  }

  /* ---------- enviar para o servidor ---------- */
  function configDe(S) {
    return { ia: S.ia, bot: S.bot, msgsCanal: S.msgsCanal, prox: S.prox, catalogoV: S.catalogoV, enterpriseMigrado: S.enterpriseMigrado, contratada: ler(CHAVE_CONTRATADA) || undefined };
  }
  function campos(col, item) {
    if (col === 'contatos') return { nome: item.nome || '', telefone: item.tel || '', canal: item.canal || '', etapa: item.etapa || '' };
    if (col === 'eventos') return { titulo: item.titulo || '', data: item.data || '' };
    return { nome: item.nome || '', tipo: item.tipo || '' };
  }
  function enviarAgora(forcar) {
    if (!auth) return Promise.resolve();
    if (enviando) { pendente = true; return Promise.resolve(); }
    var S = ler(CHAVE); if (!S) return Promise.resolve();
    enviando = true; marca('sincronizando');
    var ops = [];
    COLS.forEach(function (col) {
      mapa[col] = mapa[col] || {};
      var vistos = {};
      (S[col] || []).forEach(function (item) {
        if (item.id == null) return;
        vistos[item.id] = true;
        var h = hash(item), atual = mapa[col][item.id];
        if (!forcar && atual && atual.h === h) return;
        var corpo = Object.assign({ empresa: auth.empresa, local_id: item.id, dados: item }, campos(col, item));
        ops.push(function () {
          var p = atual && atual.rid ? api('PATCH', '/api/collections/' + col + '/records/' + atual.rid, corpo)
            : api('POST', '/api/collections/' + col + '/records', corpo);
          return p.then(function (rec) { mapa[col][item.id] = { rid: rec.id, h: h }; });
        });
      });
      Object.keys(mapa[col]).forEach(function (lid) {
        if (vistos[lid]) return;
        var rid = mapa[col][lid].rid;
        ops.push(function () { return api('DELETE', '/api/collections/' + col + '/records/' + rid).catch(function () {}).then(function () { delete mapa[col][lid]; }); });
      });
    });
    var cfg = configDe(S), hc = hash(cfg);
    if (forcar || !mapa.config || mapa.config.h !== hc) {
      ops.push(function () {
        var corpo = { empresa: auth.empresa, dados: cfg };
        var p = mapa.config && mapa.config.rid ? api('PATCH', '/api/collections/configuracoes/records/' + mapa.config.rid, corpo)
          : api('POST', '/api/collections/configuracoes/records', corpo);
        return p.then(function (rec) { mapa.config = { rid: rec.id, h: hc }; });
      });
    }
    // em sequência, 4 por vez
    var i = 0;
    function lote() {
      var bloco = ops.slice(i, i + 4); i += 4;
      if (!bloco.length) return Promise.resolve();
      return Promise.all(bloco.map(function (f) { return f(); })).then(lote);
    }
    return lote().then(function () {
      gravar(CHAVE_SYNC, mapa); enviando = false; marca('ok');
      if (pendente) { pendente = false; agenda(); }
    }).catch(function (e) {
      gravar(CHAVE_SYNC, mapa); enviando = false; marca('erro', e.message);
    });
  }
  function agenda() { if (!auth) return; if (!pronto) { esperando = true; return; } clearTimeout(timer); timer = setTimeout(function () { enviarAgora(false); }, 1200); }

  // Toda gravação do app no navegador dispara o envio
  Storage.prototype.setItem = function (k, v) {
    setOriginal.call(this, k, v);
    if (this === localStorage && !aplicandoRemoto && (k === CHAVE || k === CHAVE_CONTRATADA)) agenda();
  };


  /* ---------- tempo real e WhatsApp ---------- */
  var wa = { conectado: false, numero: '' };
  function chaveMsg(m) { return m.k || m.wa || (m.de + '|' + m.ts + '|' + m.txt); }
  function unirMsgs(a, b) {
    var vistos = {}, out = [];
    (a || []).concat(b || []).forEach(function (m) {
      if (!m) return;
      var k = chaveMsg(m);
      if (vistos[k] !== undefined) { var i = vistos[k]; out[i] = Object.assign({}, out[i], m); if (!(out[i].pend && m.pend)) delete out[i].pend; return; }
      vistos[k] = out.length; out.push(m);
    });
    out.sort(function (x, y) { return (x.ts || 0) - (y.ts || 0); });
    return out;
  }
  // Junta um contato que veio do servidor com o que está no navegador
  function aplicaContato(rec) {
    var S = ler(CHAVE); if (!S || !S.contatos) return;
    var srv = rec.dados || {}; srv.id = rec.local_id;
    var i = -1;
    for (var j = 0; j < S.contatos.length; j++) if (S.contatos[j].id === rec.local_id) { i = j; break; }
    var antes = i >= 0 ? S.contatos[i] : null;
    var cliAntes = antes ? (antes.msgs || []).filter(function (m) { return m.de === 'cli'; }).length : 0;
    var final;
    if (!antes) final = srv;
    else {
      var localMudou = !mapa.contatos || !mapa.contatos[rec.local_id] || mapa.contatos[rec.local_id].h !== hash(antes);
      final = localMudou ? Object.assign({}, antes) : Object.assign({}, srv);
      final.msgs = unirMsgs(antes.msgs, srv.msgs);
      var cliDepois = final.msgs.filter(function (m) { return m.de === 'cli'; }).length;
      if (cliDepois > cliAntes) { final.naoLidas = Math.max(final.naoLidas || 0, srv.naoLidas || 0); final.status = 'entrada'; }
      if (srv.wa) final.wa = srv.wa;
    }
    var mesmo = antes && JSON.stringify(antes) === JSON.stringify(final);
    if (mesmo) return;
    if (i >= 0) S.contatos[i] = final; else { S.contatos.push(final); S.prox = S.prox || {}; S.prox.c = Math.max(S.prox.c || 1, rec.local_id + 1); }
    mapa.contatos = mapa.contatos || {};
    mapa.contatos[rec.local_id] = { rid: rec.id, h: hash(srv) };
    aplicandoRemoto = true; gravar(CHAVE, S); gravar(CHAVE_SYNC, mapa); aplicandoRemoto = false;
    // se o navegador tinha alterações que o servidor ainda não tem, envia
    if (hash(final) !== hash(srv)) agenda();
    var novas = (final.msgs || []).filter(function (m) { return m.de === 'cli'; }).length - cliAntes;
    window.dispatchEvent(new CustomEvent('nuvem:atualizado', { detail: { novas: novas > 0 ? novas : 0, nome: final.nome } }));
  }
  var es = null;
  function tempoReal() {
    if (!auth || !window.EventSource || es) return;
    es = new EventSource(BASE + '/api/realtime');
    es.addEventListener('PB_CONNECT', function (ev) {
      var id; try { id = JSON.parse(ev.data).clientId; } catch (e) { return; }
      fetch(BASE + '/api/realtime', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth.token }, body: JSON.stringify({ clientId: id, subscriptions: ['contatos'] }) }).catch(function () {});
    });
    es.addEventListener('contatos', function (ev) {
      var d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (!d || !d.record || d.record.empresa !== auth.empresa) return;
      if (d.action === 'create' || d.action === 'update') aplicaContato(d.record);
    });
  }
  function statusWa() {
    if (!auth) return Promise.resolve(wa);
    return api('GET', '/api/abertocore/whatsapp').then(function (j) { wa = j || wa; return wa; }).catch(function () { return wa; });
  }
  function enviarWhatsApp(localId, texto, k) {
    // garante que o contato já está no servidor antes de enviar
    clearTimeout(timer);
    function tenta() { return api('POST', '/api/abertocore/whatsapp/enviar', { contato: localId, texto: texto, k: k }); }
    return enviarAgora(false).then(tenta).catch(function (e) {
      if (!/não encontrado/i.test(e.message)) throw e;
      return new Promise(function (ok) { setTimeout(ok, 1500); }).then(function () { return enviarAgora(false); }).then(tenta);
    }).then(function (j) {
      if (j && j.dados) aplicaContato({ local_id: localId, id: (mapa.contatos && mapa.contatos[localId] || {}).rid, dados: j.dados });
      return j;
    });
  }

  /* ---------- indicador e tela de login ---------- */
  var css = '.nv-chip{position:fixed;left:84px;bottom:14px;z-index:9999;font:600 12px/1 Inter,system-ui,sans-serif;padding:8px 11px;border-radius:999px;border:1px solid #d7dde6;background:#fff;color:#1E3050;cursor:pointer;box-shadow:0 2px 8px rgba(15,27,45,.08)}' +
    '.nv-chip i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#9aa6b6;vertical-align:0}' +
    '.nv-chip.ok i{background:#1f9d55}.nv-chip.sincronizando i{background:#FFB020}.nv-chip.erro i{background:#d64545}' +
    '@media (max-width:760px){.nv-chip{left:auto;right:10px;bottom:74px}}' +
    '.nv-chip.local{background:#2F6FED;border-color:#2F6FED;color:#fff;font-size:13px;padding:9px 14px}.nv-chip.local i{display:none}' +
    '.topo .dir .nv-chip{position:static;box-shadow:none;white-space:nowrap}' +
    '.nv-fundo{position:fixed;inset:0;background:rgba(15,27,45,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.nv-caixa{background:#fff;border-radius:14px;padding:22px;width:100%;max-width:360px;font:15px/1.4 Inter,system-ui,sans-serif;color:#0F1B2D}' +
    '.nv-caixa h2{font-size:18px;margin:0 0 4px}.nv-caixa p{color:#5b6779;font-size:13px;margin:0 0 14px}' +
    '.nv-caixa label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px}.nv-caixa input{width:100%;box-sizing:border-box;font-size:16px;padding:10px 12px;border:1px solid #d7dde6;border-radius:10px}' +
    '.nv-caixa .nv-acoes{display:flex;gap:8px;margin-top:16px}.nv-caixa button{flex:1;font:600 14px Inter,system-ui,sans-serif;padding:11px;border-radius:10px;border:1px solid #d7dde6;background:#fff;cursor:pointer}' +
    '.nv-caixa button.nv-pri{background:#1E3050;color:#fff;border-color:#1E3050}.nv-erro{color:#d64545;font-size:13px;margin-top:10px;min-height:1em}';
  var chip;
  function marca(e, msg) {
    estado = e;
    if (!chip) return;
    chip.className = 'nv-chip ' + e;
    chip.innerHTML = '<i></i>' + (!auth ? 'Entrar' : e === 'ok' ? 'Salvo no servidor' : e === 'sincronizando' ? 'Salvando…' : e === 'erro' ? 'Sem conexão · tentar de novo' : 'Servidor');
    chip.title = msg || (auth ? 'Conectado como ' + auth.email + '. Clique para sair.' : 'Os dados estão só neste navegador. Clique para entrar.');
  }
  function telaLogin() {
    var f = document.createElement('div'); f.className = 'nv-fundo';
    f.innerHTML = '<form class="nv-caixa"><h2>Entrar no AbertoCore</h2><p>Seus dados ficam salvos no servidor e aparecem em qualquer aparelho.</p>' +
      '<label for="nv-email">E-mail</label><input id="nv-email" type="email" autocomplete="username" required>' +
      '<label for="nv-senha">Senha</label><input id="nv-senha" type="password" autocomplete="current-password" required>' +
      '<div class="nv-erro" id="nv-erro"></div><div class="nv-acoes"><button type="button" id="nv-cancela">Cancelar</button><button class="nv-pri" type="submit">Entrar</button></div></form>';
    document.body.appendChild(f);
    f.querySelector('#nv-email').focus();
    f.querySelector('#nv-cancela').onclick = function () { f.remove(); };
    f.querySelector('form').onsubmit = function (ev) {
      ev.preventDefault();
      var b = f.querySelector('.nv-pri'); b.disabled = true; b.textContent = 'Entrando…';
      entrar(f.querySelector('#nv-email').value.trim(), f.querySelector('#nv-senha').value).then(function (r) {
        f.remove(); location.reload();
      }).catch(function (e) { f.querySelector('#nv-erro').textContent = /fetch|network/i.test(e.message) ? 'Sem conexão com o servidor. Verifique a internet e tente de novo.' : e.message; b.disabled = false; b.textContent = 'Entrar'; });
    };
  }
  function iniciaUI() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    chip = document.createElement('button'); chip.type = 'button';
    chip.onclick = function () {
      if (!auth) return telaLogin();
      if (estado === 'erro') return enviarAgora(true);
      if (confirm('Sair da conta ' + auth.email + '? Os dados continuam salvos no servidor.')) sair();
    };
    var dir = document.querySelector('.topo .dir');
    if (dir) dir.insertBefore(chip, dir.firstChild); else document.body.appendChild(chip);
    marca(auth ? 'sincronizando' : 'local');
    if (auth) {
      // Atualiza com o que está no servidor ao abrir a página
      baixar().then(function (r) {
        pronto = true;
        var local = ler(CHAVE);
        if (r.vazio) { tempoReal(); statusWa(); return enviarAgora(true); }
        var mudou = JSON.stringify(r.S.contatos) !== JSON.stringify((local || {}).contatos) || JSON.stringify(r.S.eventos) !== JSON.stringify((local || {}).eventos) || JSON.stringify(r.S.produtos) !== JSON.stringify((local || {}).produtos);
        aplicarRemoto(r); marca('ok'); tempoReal(); statusWa();
        if (mudou && !sessionStorage.getItem('nv-recarregou')) { sessionStorage.setItem('nv-recarregou', '1'); location.reload(); }
        else { sessionStorage.removeItem('nv-recarregou'); if (esperando) { esperando = false; agenda(); } }
      }).catch(function (e) { marca('erro', e.message); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciaUI); else iniciaUI();

  window.Nuvem = { entrar: entrar, sair: sair, enviar: function () { return enviarAgora(true); }, logado: function () { return !!auth; }, usuario: function () { return auth; },
    waConectado: function () { return !!wa.conectado; }, waNumero: function () { return wa.numero; }, enviarWhatsApp: enviarWhatsApp };
})();

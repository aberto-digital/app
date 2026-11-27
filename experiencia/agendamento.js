/* AbertoCore · Link de experiência: modelo Agendamento.
   Site: serviços com duração e preço, profissional, próximos 7 dias com horários livres,
   nome e telefone, sinal via Pix de exemplo (ou pagar no local).
   Vitrine (lado do dono): agenda da semana com o horário em destaque, funil
   Novo → Agendado → Pós-atendimento e a conversa com confirmação e lembrete programado.
   A lógica roda no Node para os testes; monta() e vitrine.tela() desenham no navegador.
   Nada sai do navegador: o agendamento vai para o sessionStorage (abertocore-experiencia). */
(function (raiz) {
  var noNode = typeof module !== 'undefined' && module.exports;
  var NICHOS = noNode ? require('./nichos.js') : raiz.NICHOS;
  var Marca = noNode ? require('./marca.js') : raiz.Marca;
  var Comum = noNode ? require('./comum.js') : raiz.Comum;
  var CHAVE = 'abertocore-experiencia', NUM = 102, HORA = 3600000;
  var COLUNAS = ['novo', 'agendado', 'pos'];
  var SEMANA = { pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

  function pad(n) { return ('0' + n).slice(-2); }
  function isoDe(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dataDe(iso, h) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], parseInt(h || '12', 10), 0, 0, 0); }
  function rotuloDia(iso, l) {
    var d = dataDe(iso), sem = SEMANA[l === 'en' ? 'en' : 'pt'][d.getDay()];
    return l === 'en' ? sem + ' ' + (d.getMonth() + 1) + '/' + d.getDate() : sem + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
  }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  // horários "já marcados" por outros clientes: fixos para o mesmo nicho, dia e hora
  function ocupado(n, iso, hh) { return hash(n + '|' + iso + '|' + hh) % 3 === 0; }

  function servicos(n) {
    var lista = {};
    NICHOS[n].categorias.forEach(function (c) { c.itens.forEach(function (i) { lista[i.id] = i; }); });
    return lista;
  }
  function precoDe(i, l) { return l === 'en' ? i.precoUsd : i.preco; }
  function precoTxt(v, l) { return v ? Marca.preco(v, l) : (l === 'en' ? 'Free' : 'Grátis'); }

  // próximos 7 dias de atendimento; hoje só mostra horários a partir de 1 hora depois de agora
  function dias(cfg, agora) {
    var N = NICHOS[cfg.n], out = [], d = new Date(agora), voltas = 0;
    d.setHours(0, 0, 0, 0);
    while (out.length < 7 && voltas++ < 21) {
      if ((N.fechado || []).indexOf(d.getDay()) < 0) {
        var iso = isoDe(d), hs = [];
        for (var h = N.abre; h < N.fecha; h++) {
          var ini = new Date(d); ini.setHours(h, 0, 0, 0);
          if (ini.getTime() < agora + HORA) continue;
          var hh = pad(h) + ':00';
          hs.push({ h: hh, livre: !ocupado(cfg.n, iso, hh) });
        }
        if (hs.length) out.push({ iso: iso, horarios: hs });
      }
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function novo(cfg) { return { cfg: cfg, servico: null, prof: null, dia: null, hora: null }; }

  // dados = { cliente:{nome,tel}, sinal:'pix'|'local', pago }
  function finaliza(ag, dados, armazem, chat, agora) {
    dados = dados || {}; agora = agora || Date.now();
    var cfg = ag.cfg, l = cfg.l, N = NICHOS[cfg.n], s = servicos(cfg.n)[ag.servico];
    if (!s || !ag.dia || !ag.hora) throw new Error('Escolha o serviço, o dia e o horário.');
    var cli = dados.cliente || {};
    if (!String(cli.nome || '').trim() || !String(cli.tel || '').trim()) throw new Error('Preencha nome e telefone.');
    var dia = dias(cfg, agora).filter(function (d) { return d.iso === ag.dia; })[0];
    var slot = dia && dia.horarios.filter(function (h) { return h.h === ag.hora; })[0];
    if (!slot || !slot.livre) throw new Error('Horário ocupado. Escolha outro.');
    var prof = (N.profissionais || []).filter(function (p) { return p.id === ag.prof; })[0] || null;
    var preco = precoDe(s, l), valor = preco > 0 ? (l === 'en' ? N.sinalUsd : N.sinal) : 0;
    var forma = dados.sinal === 'pix' && valor > 0 ? 'pix' : 'local';
    var est = {
      cfg: cfg,
      agendamento: {
        num: NUM, servico: { id: s.id, nome: s.nome[l], dur: s.dur, preco: preco, img: s.img },
        prof: prof ? { id: prof.id, nome: prof.nome } : null, dia: ag.dia, hora: ag.hora,
        cliente: { nome: String(cli.nome).trim().slice(0, 60), tel: String(cli.tel).trim().slice(0, 30) },
        sinal: { valor: valor, forma: forma, pago: forma === 'pix' && !!dados.pago }, ts: agora,
      },
      chat: (chat || []).slice(-30),
    };
    armazem.setItem(CHAVE, JSON.stringify(est));
    return est;
  }

  // ---------------- vitrine (lado do dono) ----------------
  function estado(armazem, cfg, agora) {
    agora = agora || Date.now();
    var est = null, l = cfg.l, N = NICHOS[cfg.n];
    try { est = JSON.parse(armazem.getItem(CHAVE) || 'null'); } catch (e) { est = null; }
    var real = !!(est && est.agendamento && est.agendamento.dia && est.agendamento.servico);
    var dd = dias(cfg, agora), itens = N.categorias.reduce(function (a, c) { return a.concat(c.itens); }, []);
    var profs = N.profissionais || [];
    var d;
    if (real) d = est.agendamento;
    else {
      var dia = dd[1] || dd[0], h = dia.horarios.filter(function (x) { return x.livre; })[0] || dia.horarios[0], s = itens[0];
      d = { num: NUM, servico: { id: s.id, nome: s.nome[l], dur: s.dur, preco: precoDe(s, l), img: s.img }, prof: profs[0] ? { id: profs[0].id, nome: profs[0].nome } : null, dia: dia.iso, hora: h.h,
        cliente: { nome: l === 'en' ? 'Sample customer' : 'Cliente de exemplo', tel: '' }, sinal: { valor: N.sinal, forma: 'pix', pago: true }, ts: agora };
    }
    // agenda: horários ocupados viram clientes de exemplo; o do cliente entra em destaque
    var nomes = N.exemplos.map(function (x) { return x.nome; }).concat(l === 'en' ? ['Carla M.', 'Beatriz N.', 'Tina O.'] : ['Carla M.', 'Beatriz N.', 'Tatiane O.']);
    var agenda = [], k = 0;
    dd.slice(0, 5).forEach(function (dia) {
      dia.horarios.filter(function (x) { return !x.livre; }).slice(0, 2).forEach(function (x) {
        var s = itens[k % itens.length], p = profs.length ? profs[k % profs.length].nome : '';
        agenda.push({ dia: dia.iso, hora: x.h, nome: nomes[k % nomes.length], servico: s.nome[l], dur: s.dur, prof: p, real: false }); k++;
      });
    });
    agenda.push({ dia: d.dia, hora: d.hora, nome: d.cliente.nome, servico: d.servico.nome, dur: d.servico.dur, prof: d.prof ? d.prof.nome : '', real: real, destaque: true });
    agenda.sort(function (a, b) { return (a.dia + a.hora) < (b.dia + b.hora) ? -1 : 1; });
    var cols = (est && est.colunas) || {};
    var ex = N.exemplos;
    var funil = [
      { id: 'r', nome: d.cliente.nome, sub: d.servico.nome + ' · ' + rotuloDia(d.dia, l) + ' ' + d.hora, coluna: cols.r || 'agendado', real: real, destaque: true },
      { id: 'e1', nome: ex[0].nome, sub: ex[0].txt[l], coluna: cols.e1 || 'novo' },
      { id: 'e2', nome: ex[1].nome, sub: ex[1].txt[l], coluna: cols.e2 || 'agendado' },
      { id: 'e3', nome: ex[2].nome, sub: ex[2].txt[l], coluna: cols.e3 || 'pos' },
    ];
    return { real: real, cfg: cfg, destaque: d, dias: dd, agenda: agenda, funil: funil, chat: (est && est.chat) || [], colunas: cols, bruto: real ? est : null, agora: agora };
  }

  function avanca(e, id, armazem) {
    var c = e.funil.filter(function (x) { return x.id === id; })[0]; if (!c) return e;
    var i = COLUNAS.indexOf(c.coluna);
    if (i < COLUNAS.length - 1) c.coluna = COLUNAS[i + 1];
    e.colunas[id] = c.coluna;
    if (e.real && armazem) { e.bruto.colunas = e.colunas; armazem.setItem(CHAVE, JSON.stringify(e.bruto)); }
    return e;
  }

  function confirmacao(e) {
    var d = e.destaque, cfg = e.cfg, en = cfg.l === 'en', pn = d.cliente.nome.split(' ')[0], quando = rotuloDia(d.dia, cfg.l) + (en ? ' at ' : ' às ') + d.hora;
    var com = d.prof ? (en ? ' with ' : ' com ') + d.prof.nome : '';
    var pag = d.sinal.valor ? (d.sinal.pago ? (en ? ' Deposit of ' + Marca.preco(d.sinal.valor, 'en') + ' paid.' : ' Sinal de ' + Marca.preco(d.sinal.valor, 'pt') + ' pago.') : (en ? ' Payment at the appointment.' : ' Pagamento no local.')) : '';
    if (en) return 'Hi ' + pn + '! Your appointment at ' + cfg.nome + ' is confirmed: ' + d.servico.nome + com + ', ' + quando + '.' + pag + ' You will get a reminder before it.';
    return 'Oi, ' + pn + '! Seu horário na ' + cfg.nome + ' está confirmado: ' + d.servico.nome + com + ', ' + quando + '.' + pag + ' Você vai receber um lembrete antes.';
  }

  function lembrete(e) {
    var d = e.destaque, cfg = e.cfg, en = cfg.l === 'en', pn = d.cliente.nome.split(' ')[0];
    var inicio = dataDe(d.dia, d.hora).getTime(), umDia = inicio - 24 * HORA >= (e.agora || Date.now());
    var envio = new Date(umDia ? inicio - 24 * HORA : inicio - 2 * HORA);
    var hEnvio = pad(envio.getHours()) + ':' + pad(envio.getMinutes());
    var quando = (en ? 'Reminder scheduled for ' : 'Lembrete programado para ') + rotuloDia(isoDe(envio), cfg.l) + (en ? ' at ' : ' às ') + hEnvio;
    var txt = en
      ? 'Hi ' + pn + '! Just a reminder of your appointment ' + (umDia ? 'tomorrow' : 'today') + ' at ' + d.hora + ' at ' + cfg.nome + '. Need to reschedule? Just reply here.'
      : 'Oi, ' + pn + '! Passando para lembrar do seu horário ' + (umDia ? 'amanhã' : 'hoje') + ' às ' + d.hora + ' na ' + cfg.nome + '. Se precisar remarcar, é só responder aqui.';
    return { de: 'ia', txt: txt, auto: true, programado: true, quando: quando, ts: envio.getTime() };
  }

  function conversa(e) {
    var msgs = (e.chat || []).filter(function (m) { return m && m.txt; }).map(function (m) { return { de: m.de === 'cli' ? 'cli' : 'ia', txt: m.txt, ts: m.ts }; });
    if (msgs.length && !msgs.some(function (m) { return m.de === 'cli'; })) msgs = [];
    if (msgs.length && msgs[0].de === 'ia') msgs.shift();
    msgs.push({ de: 'ia', txt: confirmacao(e), ts: e.destaque.ts, auto: true });
    msgs.push(lembrete(e));
    return msgs;
  }

  // ---------------- navegador: vitrine ----------------
  var esc = Comum.esc;
  function textos(en) {
    return en ? {
      agenda: 'Schedule', funil: 'Pipeline', semana: 'This week', livre: 'No appointments', novo: 'New appointment',
      cols: { novo: 'New contact', agendado: 'Booked', pos: 'Follow-up' }, next: 'Move on →',
      lembretes: 'Automatic reminders on: 1 day and 2 hours before.', voce: 'You',
      dica: 'New bookings land in your schedule and the customer gets the confirmation and the reminder automatically.',
    } : {
      agenda: 'Agenda', funil: 'Funil', semana: 'Agenda da semana', livre: 'Sem horários marcados', novo: 'Novo agendamento',
      cols: { novo: 'Novo contato', agendado: 'Agendado', pos: 'Pós-atendimento' }, next: 'Avançar →',
      lembretes: 'Lembretes automáticos ligados: 1 dia antes e 2 horas antes.', voce: 'Você',
      dica: 'O agendamento cai na sua agenda e o cliente recebe a confirmação e o lembrete sozinho.',
    };
  }
  var vitrine = {
    estado: estado, avanca: avanca, conversa: conversa, confirmacao: confirmacao, lembrete: lembrete,
    abas: function (en) { var t = textos(en); return [['agenda', '📅 ' + t.agenda], ['funil', '🗂️ ' + t.funil]]; },
    inicial: 'agenda',
    toast: function (e) { var t = textos(e.cfg.l === 'en'); return '📅 <b>' + t.novo + '</b> · ' + esc(rotuloDia(e.destaque.dia, e.cfg.l) + ' ' + e.destaque.hora); },
    resumoLista: function (e) { var t = textos(e.cfg.l === 'en'); return t.novo + ' · ' + rotuloDia(e.destaque.dia, e.cfg.l) + ' ' + e.destaque.hora; },
    tela: function (aba, e) {
      var l = e.cfg.l, t = textos(l === 'en');
      if (aba === 'agenda') {
        return '<div class="titulo-p">' + t.semana + '</div><p class="nota-p">⏰ ' + t.lembretes + '</p><div class="agenda-p">' + e.dias.slice(0, 6).map(function (dia) {
          var its = e.agenda.filter(function (x) { return x.dia === dia.iso; });
          return '<div class="dia-p"><h4>' + esc(rotuloDia(dia.iso, l)) + '</h4>' + (its.length ? its.map(function (x) {
            return '<div class="ag-it' + (x.destaque ? ' destaque' : '') + '"><b>' + esc(x.hora) + '</b><span><b>' + esc(x.nome) + '</b><small>' + esc(x.servico) + ' · ' + x.dur + ' min' + (x.prof ? ' · ' + esc(x.prof) : '') + '</small></span></div>';
          }).join('') : '<small class="vazio">' + t.livre + '</small>') + '</div>';
        }).join('') + '</div>';
      }
      return '<div class="titulo-p">' + t.funil + '</div><div class="kanban">' + COLUNAS.map(function (c) {
        var cs = e.funil.filter(function (x) { return x.coluna === c; });
        return '<div class="col"><h4>' + t.cols[c] + ' <span>' + cs.length + '</span></h4>' + cs.map(function (x) {
          return '<div class="pcard' + (x.destaque ? ' destaque' : '') + '"><div class="pc-top"><b>' + esc(x.nome) + '</b></div><small>' + esc(x.sub) + '</small>' +
            (x.coluna !== 'pos' ? '<button type="button" class="avancar" data-card="' + x.id + '">' + t.next + '</button>' : '') + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div><p class="dica">' + t.dica + '</p>';
    },
    clique: function (ev, e, armazem) {
      var b = ev.target.closest('[data-card]');
      if (b) { avanca(e, b.getAttribute('data-card'), armazem); return true; }
      return false;
    },
  };

  // ---------------- navegador: site ----------------
  function monta(doc, win) {
    var E = win.EXP, cfg = E.cfg, N = E.nicho, l = cfg.l, en = l === 'en';
    var ag = novo(cfg), F = Comum.folha(doc), forma = 'pix', form = { nome: '', tel: '' };
    var lista = servicos(cfg.n), profs = N.profissionais || [];
    var tx = en ? {
      book: 'Book', pro: 'Professional', any: 'No preference', day: 'Day', time: 'Time', next: 'Continue', confirmTitle: 'Confirm your booking',
      name: 'Your name', phone: 'Phone (for the reminder)', deposit: 'Deposit to hold the time', payPix: 'Pay deposit with Pix', payLocal: 'Pay at the appointment',
      paid: 'I already paid · Confirm', confirm: 'Confirm booking', pixHelp: 'Scan the QR code or copy the code (example, does not charge).',
      done: 'Appointment confirmed!', seeSide: 'Now see it in your business schedule →', reviews: 'What customers say', demoBy: 'Demo made by',
      onlinePay: 'Online payment', custom: 'Custom build', full: 'Booked', pick: 'Pick a time to continue.', err: 'Please fill in your name and phone.',
    } : {
      book: 'Agendar', pro: 'Profissional', any: 'Sem preferência', day: 'Dia', time: 'Horário', next: 'Continuar', confirmTitle: 'Confirmar agendamento',
      name: 'Seu nome', phone: 'Telefone (WhatsApp, para o lembrete)', deposit: 'Sinal para garantir o horário', payPix: 'Pagar sinal via Pix', payLocal: 'Pagar no local',
      paid: 'Já paguei · Confirmar', confirm: 'Confirmar agendamento', pixHelp: 'Leia o QR code ou copie o código (é um exemplo, não cobra nada).',
      done: 'Horário confirmado!', seeSide: 'Agora veja na agenda da sua empresa →', reviews: 'O que os clientes dizem', demoBy: 'Demonstração feita pela',
      onlinePay: 'Pagamento online', custom: 'Sob medida', full: 'Ocupado', pick: 'Escolha um horário para continuar.', err: 'Preencha nome e telefone.',
    };
    var main = doc.getElementById('conteudo');
    var emojis = []; N.categorias.forEach(function (c) { c.itens.forEach(function (i) { emojis.push(i.img); }); });
    Comum.casca(doc, win, 'agendamento', en, emojis);
    var html = N.categorias.length > 1 ? '<div class="ferr"><nav class="abas" role="tablist">' + N.categorias.map(function (c, i) { return '<button role="tab" data-cat="' + i + '" aria-selected="' + (i === 0) + '">' + esc(c.nome[l]) + '</button>'; }).join('') + '</nav></div>' : '<div style="height:14px"></div>';
    html += N.categorias.map(function (c, i) {
      return '<section class="cat" id="cat' + i + '"><h2>' + esc(c.nome[l]) + '</h2><div class="grade">' + c.itens.map(function (it) {
        return '<button type="button" class="item" data-serv="' + it.id + '"><div class="txt"><b>' + esc(it.nome[l]) + '</b><small>' + esc(it.ds[l]) + '</small><div class="preco">' + it.dur + ' min · ' + precoTxt(precoDe(it, l), l) + '</div><span class="pilula">' + tx.book + '</span></div><div class="ilu vis"><span aria-hidden="true">' + it.img + '</span></div></button>';
      }).join('') + '</div></section>';
    }).join('');
    html += '<section class="avaliacoes"><h2>' + tx.reviews + '</h2>' + [
      en ? ['Booked in a minute and got a reminder the day before. Loved it!', 'Mariana R.'] : ['Marquei em 1 minuto e recebi lembrete no dia anterior. Amei!', 'Mariana R.'],
      en ? ['On time, great service and easy to reschedule.', 'Lucas F.'] : ['Pontual, atendimento ótimo e fácil de remarcar.', 'Lucas F.'],
    ].map(function (a) { return '<div class="av"><span class="est">★★★★★</span> ' + esc(a[0]) + '<br><small>' + esc(a[1]) + ' · ' + (en ? 'example review' : 'avaliação de exemplo') + '</small></div>'; }).join('') + '</section>';
    html += '<div class="info-loja" id="perfil">🕒 ' + esc(E.t.info) + (cfg.cidade ? '<br>📍 ' + esc(cfg.cidade) : '') + '</div>';
    html += '<p class="rodape-demo">' + tx.demoBy + ' <a href="https://abertodigital.com" target="_blank" rel="noopener">abertodigital</a></p>';
    main.innerHTML = html;

    main.addEventListener('click', function (e) {
      var s = e.target.closest('[data-serv]'), c = e.target.closest('[data-cat]');
      if (s) { ag.servico = s.getAttribute('data-serv'); ag.hora = null; telaHorario(); }
      if (c) {
        main.querySelectorAll('[data-cat]').forEach(function (x) { x.setAttribute('aria-selected', x === c); });
        var alvo = doc.getElementById('cat' + c.getAttribute('data-cat'));
        win.scrollTo({ top: alvo.getBoundingClientRect().top + win.scrollY - 120, behavior: 'smooth' });
      }
    });

    function telaHorario() {
      var s = lista[ag.servico], dd = dias(cfg, Date.now());
      if (!ag.dia || !dd.some(function (d) { return d.iso === ag.dia; })) ag.dia = dd[0].iso;
      var dia = dd.filter(function (d) { return d.iso === ag.dia; })[0];
      F.abre('<h2>' + esc(s.nome[l]) + '<button class="fechar" aria-label="Fechar">×</button></h2>' +
        '<p class="sub-f">' + s.dur + ' min · ' + precoTxt(precoDe(s, l), l) + '</p>' +
        (profs.length ? '<div class="campo"><label>' + tx.pro + '</label><div class="opcoes">' + [{ id: '', nome: tx.any }].concat(profs).map(function (p) { return '<button type="button" data-prof="' + p.id + '" aria-pressed="' + ((ag.prof || '') === p.id) + '">' + esc(p.nome) + '</button>'; }).join('') + '</div></div>' : '') +
        '<div class="campo"><label>' + tx.day + '</label><div class="dias">' + dd.map(function (d) { var r = rotuloDia(d.iso, l).split(' '); return '<button type="button" data-dia="' + d.iso + '" aria-pressed="' + (d.iso === ag.dia) + '"><small>' + r[0] + '</small><b>' + r[1] + '</b></button>'; }).join('') + '</div></div>' +
        '<div class="campo"><label>' + tx.time + '</label><div class="horas">' + dia.horarios.map(function (h) { return '<button type="button" data-hora="' + h.h + '"' + (h.livre ? '' : ' disabled title="' + tx.full + '"') + ' aria-pressed="' + (h.h === ag.hora) + '">' + h.h + '</button>'; }).join('') + '</div></div>' +
        '<button type="button" class="btn" id="agSeguir"' + (ag.hora ? '' : ' aria-disabled="true"') + '>' + tx.next + '</button><p class="aviso oculto" id="agErro"></p>');
      F.el.querySelectorAll('[data-prof]').forEach(function (b) { b.onclick = function () { ag.prof = b.getAttribute('data-prof') || null; telaHorario(); }; });
      F.el.querySelectorAll('[data-dia]').forEach(function (b) { b.onclick = function () { ag.dia = b.getAttribute('data-dia'); ag.hora = null; telaHorario(); }; });
      F.el.querySelectorAll('[data-hora]').forEach(function (b) { b.onclick = function () { ag.hora = b.getAttribute('data-hora'); telaHorario(); }; });
      // centraliza o dia escolhido só dentro da fileira de dias (scrollIntoView arrastaria a página)
      var fila = F.el.querySelector('.dias'), marcado = fila && fila.querySelector('[aria-pressed="true"]');
      if (marcado) fila.scrollLeft = Math.max(0, marcado.offsetLeft - fila.offsetLeft - (fila.clientWidth - marcado.offsetWidth) / 2);
      doc.getElementById('agSeguir').onclick = function () {
        if (!ag.hora) { var av = doc.getElementById('agErro'); av.textContent = tx.pick; av.classList.remove('oculto'); return; }
        telaConfirma();
      };
    }

    function telaConfirma() {
      var s = lista[ag.servico], preco = precoDe(s, l), sinal = preco > 0 ? (en ? N.sinalUsd : N.sinal) : 0;
      var prof = profs.filter(function (p) { return p.id === ag.prof; })[0];
      if (!sinal) forma = 'local';
      var pagHtml = !sinal ? '<button type="button" class="btn" data-fim="local">' + tx.confirm + '</button>'
        : '<div class="campo"><label>' + tx.deposit + ' (' + Marca.preco(sinal, l) + ')' + (forma === 'pix' ? ' <span class="selo-sob">' + tx.onlinePay + ' · ' + tx.custom + '</span>' : '') + '</label><div class="opcoes"><button type="button" data-forma="pix" aria-pressed="' + (forma === 'pix') + '">' + tx.payPix + '</button><button type="button" data-forma="local" aria-pressed="' + (forma === 'local') + '">' + tx.payLocal + '</button></div></div>' +
          (forma === 'pix' ? '<div class="pix">' + Comum.qrFalso() + '<div><small>' + tx.pixHelp + '</small><code>' + Comum.PIX_EX + '</code></div></div><button type="button" class="btn" data-fim="pix">' + tx.paid + '</button>' : '<button type="button" class="btn" data-fim="local">' + tx.confirm + '</button>');
      F.abre('<h2>' + tx.confirmTitle + '<button class="fechar" aria-label="Fechar">×</button></h2>' +
        '<div class="resumo-ag"><span class="ilu">' + s.img + '</span><div><b>' + esc(s.nome[l]) + '</b><small>' + esc(rotuloDia(ag.dia, l)) + (en ? ' at ' : ' às ') + ag.hora + (prof ? ' · ' + esc(prof.nome) : '') + '</small><small>' + s.dur + ' min · ' + precoTxt(preco, l) + '</small></div><button type="button" class="trocar" id="agTrocar">' + (en ? 'Change' : 'Trocar') + '</button></div>' +
        '<div class="campo"><label for="cNome">' + tx.name + '</label><input id="cNome" autocomplete="name" value="' + esc(form.nome) + '"></div>' +
        '<div class="campo"><label for="cTel">' + tx.phone + '</label><input id="cTel" inputmode="tel" autocomplete="tel" value="' + esc(form.tel) + '"></div>' +
        pagHtml + '<p class="aviso oculto" id="erroCk"></p>');
      function guarda() { form.nome = doc.getElementById('cNome').value; form.tel = doc.getElementById('cTel').value; }
      doc.getElementById('agTrocar').onclick = function () { guarda(); telaHorario(); };
      F.el.querySelectorAll('[data-forma]').forEach(function (b) { b.onclick = function () { guarda(); forma = b.getAttribute('data-forma'); telaConfirma(); }; });
      F.el.querySelector('[data-fim]').onclick = function () {
        guarda();
        var fim = this.getAttribute('data-fim');
        try {
          var hist = win.Chat ? win.Chat.historico() : [];
          finaliza(ag, { cliente: { nome: form.nome, tel: form.tel }, sinal: fim, pago: fim === 'pix' }, win.sessionStorage, hist, Date.now());
        } catch (er) {
          var av = doc.getElementById('erroCk'); av.textContent = /nome/i.test(er.message) ? tx.err : er.message; av.classList.remove('oculto'); return;
        }
        F.abre(Comum.transicao(tx.done, rotuloDia(ag.dia, l) + (en ? ' at ' : ' às ') + ag.hora + ' · ' + s.nome[l], 'painel.html' + win.location.search, tx.seeSide, en));
      };
    }
  }

  var Agendamento = { dias: dias, novo: novo, finaliza: finaliza, rotuloDia: rotuloDia, monta: monta, vitrine: vitrine, CHAVE: CHAVE };
  if (noNode) module.exports = Agendamento;
  else raiz.Agendamento = Agendamento;
})(typeof window !== 'undefined' ? window : this);

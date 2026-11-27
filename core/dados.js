/* =====================================================================
   AbertoCore: dados compartilhados entre o CRM, a auditoria, o briefing,
   a proposta e o contrato. Tudo fica salvo no CONTATO, no mesmo
   armazenamento do CRM (localStorage do navegador, mesma origem).

   Contato (campos usados pelos documentos):
     c.empresa   { razao, cnpj, endereco, cidade, ramo, site, instagram,
                   responsaveis:[{nome,cargo,tel,email,cpf,assina}] }
     c.auditoria { data, r, ramo, cidade, msgs, conc..., geral, areas[], perdas[], recomendacao{pacote,modulos[]} }
     c.briefing  { <pergunta>: resposta, materiais:{}, atualizado }
     c.proposta  { numero, data, validade, pacote, modulos[], setup, mensal, prazo, pagamento, vencimento, obs }
     c.contrato  { data, gerado }
   ===================================================================== */
(function(){
  'use strict';
  var CHAVE = 'abertocore-demo-v1';
  var CHAVE_CONTRATADA = 'abertocore-contratada-v1';

  /* Catálogo base. O CRM pode mudar preços em Produtos; aqui só garantimos que
     cada solução usada pela auditoria exista no catálogo. */
  var PRODUTOS_BASE = [
    {nome:'Start', tipo:'Pacote', setup:650, mensal:49, prazo:7, ds:'Perfil no Google otimizado e verificado, site de 1 página com botão de WhatsApp, domínio .com.br no 1º ano, hospedagem e 1 alteração por mês'},
    {nome:'Presença', tipo:'Pacote', setup:1650, mensal:150, prazo:15, ds:'Tudo do Start, logo e identidade visual, WhatsApp Business configurado com catálogo e respostas rápidas, AbertoCore com o WhatsApp e até 2 usuários, chatbot de menu com botões, assistente de IA interno com resumo do dia (600 ações de IA por mês), funil e agenda com lembrete de retorno, 1º mês de acompanhamento com reunião e relatório mensal do Google'},
    {nome:'Completo', tipo:'Pacote', setup:3500, mensal:450, prazo:30, ds:'Tudo do Presença, atendimento com IA 24h que responde, qualifica e agenda sozinho (5.000 ações de IA por mês), Instagram + Facebook + e-mail na mesma caixa de mensagens, agendamento online, usuários ilimitados, e-mail com o domínio da empresa, painel de resultados e ajustes sob medida'},
    {nome:'Chatbot de menu (triagem)', tipo:'Módulo', setup:600, mensal:199, ds:'Menu numerado no WhatsApp que responde as perguntas frequentes e separa os interessados dos curiosos'},
    {nome:'Gestão mensal do perfil no Google', tipo:'Módulo', setup:0, mensal:149, ds:'4 postagens por mês, fotos novas, horários de feriado e respostas às avaliações'},
    {nome:'Respostas às avaliações do Google', tipo:'Módulo', setup:0, mensal:79, ds:'A IA sugere a resposta e nós revisamos e publicamos em até 48h'},
    {nome:'Pós-venda que pede avaliação', tipo:'Módulo', setup:200, mensal:0, ds:'Mensagem modelo, QR Code e cartão de balcão com link direto para avaliar no Google'},
    {nome:'Instagram profissional', tipo:'Módulo', setup:290, mensal:0, ds:'Conta comercial, bio com cidade e link de WhatsApp, destaques organizados e 9 posts iniciais'},
    {nome:'Calendário mensal de conteúdo', tipo:'Módulo', setup:0, mensal:390, ds:'12 artes com legenda por mês prontas para o cliente publicar'},
    {nome:'Fotos e vídeos curtos com IA', tipo:'Módulo', setup:290, mensal:0, ds:'Sessão de 1h no local com 10 fotos tratadas e 3 vídeos curtos editados'},
    {nome:'Agendamento online', tipo:'Módulo', setup:250, mensal:0, ds:'Link de agenda no site e no WhatsApp com lembrete automático'},
    {nome:'Cardápio ou catálogo com QR Code', tipo:'Módulo', setup:350, mensal:0, ds:'Página com cardápio ou catálogo e QR Code impresso para o balcão e as mesas'},
    {nome:'Pacote extra de IA (+2.000 ações)', tipo:'Módulo', setup:39, mensal:0, ds:'2.000 ações de IA a mais no mês em que a franquia do plano acabar (respostas, sugestões e resumos)'},
    {nome:'Pacote extra de IA (+5.000 ações)', tipo:'Módulo', setup:89, mensal:0, ds:'5.000 ações de IA a mais no mês em que a franquia do plano acabar (respostas, sugestões e resumos)'},
    {nome:'Auditoria gratuita', tipo:'Serviço', setup:0, mensal:0, ds:'Relatório com nota e o que falta no Google, site, WhatsApp e redes'}
  ];
  var CATALOGO_VERSAO = 4; // v4 (27/11/2026): franquia de ações de IA nos pacotes e pacotes extras de IA
  /* Ações de IA por mês em cada pacote (respostas automáticas, sugestões, resumos e leituras de conversa).
     Acima de 120% a IA de atendimento pausa até o dia 1º ou até um pacote extra. Igual em infra/pocketbase/pb_hooks/ia.js. */
  var ACOES_IA = {'Start':0, 'Presença':600, 'Completo':5000};
  var PACOTES_IA = [{acoes:2000, preco:39}, {acoes:5000, preco:89}];
  var ORDEM_PACOTES = ['Start', 'Presença', 'Completo'];
  var PACOTES_ANTIGOS = ['Enterprise'];
  /* Planos de contratação: desconto na mensalidade em troca de prazo mínimo. */
  var PLANOS = [
    {nome:'Mensal', meses:0, desconto:0, txt:'sem fidelidade'},
    {nome:'6 meses', meses:6, desconto:0.15, txt:'15% de desconto na mensalidade'},
    {nome:'12 meses', meses:12, desconto:0.30, txt:'30% de desconto na mensalidade'}
  ];
  function plano(nome){ return PLANOS.filter(function(p){ return p.nome === nome; })[0] || PLANOS[0]; }
  function mensalPlano(valor, nome){ if (valor == null) return null; return Math.round(valor * (1 - plano(nome).desconto) * 100) / 100; }
  /* O que cada pacote já inclui (além dos pacotes abaixo dele). */
  var INCLUSOS = {'Presença':['Chatbot de menu (triagem)'], Completo:['Agendamento online']};

  function maxId(L){ return L.reduce(function(m, x){ return Math.max(m, x.id || 0); }, 0); }
  function garante(S){
    S.contatos = S.contatos || []; S.eventos = S.eventos || []; S.produtos = S.produtos || [];
    S.msgsCanal = S.msgsCanal || {}; S.prox = S.prox || {c:1, e:1, p:1};
    S.contatos.forEach(function(c){ if (!Array.isArray(c.msgs)) c.msgs = []; if (!c.nome) c.nome = c.tel || 'Sem nome'; if (!c.etapa) c.etapa = 'Novo contato'; if (!c.status) c.status = 'entrada'; if (!c.canal) c.canal = 'WhatsApp'; if (!c.tipo) c.tipo = 'Lead'; });
    if (S.msgsCanal.Presencial == null) S.msgsCanal.Presencial = 0;
    var perfil = null; try { perfil = JSON.parse(localStorage.getItem('abertocore-perfil-v1')); } catch (e) {}
    var nomeEmp = ''; try { nomeEmp = localStorage.getItem('abertocore-empresa-nome') || ''; } catch (e) {}
    var outraEmpresa = !!nomeEmp && !/^abertodigital$/i.test(nomeEmp.trim()); // catálogo da agência só na abertodigital e na demonstração
    if (outraEmpresa && !(perfil && perfil.catalogo === false)) {
      // conta de cliente que recebeu o catálogo da agência por engano: tira só esses itens (mesmo nome e tipo)
      S.produtos = S.produtos.filter(function(x){ return !PRODUTOS_BASE.some(function(p){ return p.nome === x.nome && p.tipo === x.tipo; }); });
    }
    if ((perfil && perfil.catalogo === false) || outraEmpresa) { S.prox.p = Math.max(S.prox.p || 1, maxId(S.produtos) + 1); return S; } // empresa com catálogo próprio (ex.: salão)
    var migra = (S.catalogoV || 1) < CATALOGO_VERSAO;
    PRODUTOS_BASE.forEach(function(p){
      var ex = S.produtos.filter(function(x){ return x.nome === p.nome; })[0];
      if (!ex){ var n = JSON.parse(JSON.stringify(p)); n.id = maxId(S.produtos) + 1; n.ativo = true; S.produtos.push(n); }
      else if (migra){ ex.setup = p.setup; ex.mensal = p.mensal; ex.ds = p.ds; if (p.prazo) ex.prazo = p.prazo; }
      else if (ex.prazo == null && p.prazo) ex.prazo = p.prazo;
    });
    if (migra) S.produtos.forEach(function(x){ if (PACOTES_ANTIGOS.indexOf(x.nome) >= 0) x.ativo = false; });
    S.catalogoV = CATALOGO_VERSAO;
    S.prox.p = maxId(S.produtos) + 1;
    return S;
  }
  function carrega(){
    var S = null;
    try { S = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) {}
    if (!S || !S.contatos) S = {contatos:[], eventos:[], produtos:[], msgsCanal:{}, prox:{c:1, e:1, p:1}};
    return garante(S);
  }
  function salva(S){ try { localStorage.setItem(CHAVE, JSON.stringify(S)); return true; } catch (e) { return false; } }
  function contato(S, id){ id = +id; return S.contatos.filter(function(c){ return c.id === id; })[0] || null; }
  function hoje(){ var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function maisDias(iso, n){ var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function novoContato(S, dados){
    var c = {id:Math.max(maxId(S.contatos), (S.prox.c || 1) - 1) + 1, nome:dados.nome || dados.negocio || 'Novo contato', negocio:dados.negocio || '',
      canal:'Presencial', tipo:'Lead', etapa:'Novo contato', valor:0, followup:null, status:'entrada', tel:dados.tel || '', origem:dados.origem || 'Visita',
      nota:'', naoLidas:0, criado:hoje(), msgs:[{de:'eq', txt:dados.primeira || 'Contato criado na auditoria presencial.', ts:Date.now()}]};
    S.contatos.push(c); S.prox.c = c.id + 1;
    return c;
  }
  function empresa(c){
    c.empresa = c.empresa || {};
    var e = c.empresa;
    ['razao', 'cnpj', 'endereco', 'cidade', 'ramo', 'site', 'instagram'].forEach(function(k){ if (e[k] == null) e[k] = ''; });
    if (!e.responsaveis || !e.responsaveis.length) e.responsaveis = [{nome:c.nome || '', cargo:'Responsável', tel:c.tel || '', email:'', cpf:'', assina:true}];
    return e;
  }
  function signatario(c){ var e = empresa(c); return e.responsaveis.filter(function(r){ return r.assina; })[0] || e.responsaveis[0]; }
  function produto(S, nome){ return S.produtos.filter(function(p){ return p.nome === nome; })[0] || null; }
  function pacotes(S){ return ORDEM_PACOTES.map(function(n){ return produto(S, n); }).filter(Boolean); }
  function modulos(S){ return S.produtos.filter(function(p){ return p.tipo === 'Módulo' && p.ativo !== false; }); }
  function incluso(pacote, nomeModulo){ var i = ORDEM_PACOTES.indexOf(pacote); return ORDEM_PACOTES.slice(0, i + 1).some(function(p){ return (INCLUSOS[p] || []).indexOf(nomeModulo) >= 0; }); }
  function contratada(){ try { return JSON.parse(localStorage.getItem(CHAVE_CONTRATADA)) || {}; } catch (e) { return {}; } }
  function salvaContratada(d){ try { localStorage.setItem(CHAVE_CONTRATADA, JSON.stringify(d)); } catch (e) {} }

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function brl(v){ return v == null || v === '' || isNaN(v) ? 'a definir' : 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2}); }
  function dataBR(s){ if (!s) return ''; var p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  function dataExtenso(s){ var d = new Date((s || hoje()) + 'T12:00:00'); return d.toLocaleDateString('pt-BR', {day:'numeric', month:'long', year:'numeric'}); }
  function param(n){ return new URLSearchParams(location.search).get(n); }
  function aviso(t){ var d = document.createElement('div'); d.className = 'aviso'; d.textContent = t; document.body.appendChild(d); setTimeout(function(){ d.remove(); }, 2800); }

  window.Core = {CHAVE:CHAVE, carrega:carrega, salva:salva, garante:garante, contato:contato, novoContato:novoContato, empresa:empresa,
    signatario:signatario, produto:produto, PLANOS:PLANOS, plano:plano, mensalPlano:mensalPlano, pacotes:pacotes, modulos:modulos, incluso:incluso, ORDEM_PACOTES:ORDEM_PACOTES, ACOES_IA:ACOES_IA, PACOTES_IA:PACOTES_IA,
    contratada:contratada, salvaContratada:salvaContratada, esc:esc, brl:brl, dataBR:dataBR, dataExtenso:dataExtenso, hoje:hoje,
    maisDias:maisDias, param:param, aviso:aviso};
})();

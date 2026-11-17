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
    {nome:'Start', tipo:'Pacote', setup:650, mensal:49, prazo:7, ds:'Perfil no Google otimizado, site de 1 página, domínio no 1º ano'},
    {nome:'Presença', tipo:'Pacote', setup:850, mensal:49, prazo:10, ds:'Tudo do Start, logo e identidade visual, WhatsApp Business com catálogo, saudação e respostas rápidas'},
    {nome:'Completo', tipo:'Pacote', setup:1500, mensal:150, prazo:14, ds:'Tudo do Presença, chatbot de IA no WhatsApp, 1 mês de acompanhamento'},
    {nome:'Enterprise', tipo:'Pacote', setup:3000, mensal:150, prazo:30, ds:'Sistema integrado AbertoCore: WhatsApp, Instagram, Facebook e e-mail numa caixa só, assistente de IA, funil, agenda, follow-up e relatórios'},
    {nome:'Agendamento online', tipo:'Módulo', setup:null, mensal:null, ds:'Link de agenda com lembrete automático'},
    {nome:'Respostas às avaliações do Google', tipo:'Módulo', setup:null, mensal:null, ds:'A IA sugere, o cliente aprova'},
    {nome:'Cardápio ou catálogo com QR Code', tipo:'Módulo', setup:null, mensal:null, ds:'Para restaurantes, padarias e lojas'},
    {nome:'Pós-venda que pede avaliação', tipo:'Módulo', setup:null, mensal:null, ds:'Mensagem com link direto para o Google'},
    {nome:'Calendário mensal de conteúdo', tipo:'Módulo', setup:null, mensal:null, ds:'Posts, legendas e roteiros de Reels'},
    {nome:'Fotos e vídeos curtos com IA', tipo:'Módulo', setup:null, mensal:null, ds:'Edição, legendas e cortes para Instagram e TikTok'},
    {nome:'Gestão mensal do perfil no Google', tipo:'Módulo', setup:null, mensal:null, ds:'Novidades, ofertas e fotos novas no Google todo mês'},
    {nome:'Instagram profissional', tipo:'Módulo', setup:null, mensal:null, ds:'Conta profissional, bio com cidade e link de WhatsApp, destaques organizados'},
    {nome:'Auditoria gratuita', tipo:'Serviço', setup:0, mensal:0, ds:'Relatório com nota e o que falta no Google, site, WhatsApp e redes'}
  ];
  var ORDEM_PACOTES = ['Start', 'Presença', 'Completo', 'Enterprise'];
  /* O que cada pacote já inclui (além dos pacotes abaixo dele). */
  var INCLUSOS = {Enterprise:['Agendamento online']};

  function maxId(L){ return L.reduce(function(m, x){ return Math.max(m, x.id || 0); }, 0); }
  function garante(S){
    S.contatos = S.contatos || []; S.eventos = S.eventos || []; S.produtos = S.produtos || [];
    S.msgsCanal = S.msgsCanal || {}; S.prox = S.prox || {c:1, e:1, p:1};
    if (S.msgsCanal.Presencial == null) S.msgsCanal.Presencial = 0;
    PRODUTOS_BASE.forEach(function(p){
      var ex = S.produtos.filter(function(x){ return x.nome === p.nome; })[0];
      if (!ex){ var n = JSON.parse(JSON.stringify(p)); n.id = maxId(S.produtos) + 1; n.ativo = true; S.produtos.push(n); }
      else if (ex.prazo == null && p.prazo) ex.prazo = p.prazo;
      if (ex && ex.nome === 'Enterprise' && ex.setup == null && !S.enterpriseMigrado){ ex.setup = p.setup; ex.mensal = p.mensal; S.enterpriseMigrado = true; }
    });
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
    signatario:signatario, produto:produto, pacotes:pacotes, modulos:modulos, incluso:incluso, ORDEM_PACOTES:ORDEM_PACOTES,
    contratada:contratada, salvaContratada:salvaContratada, esc:esc, brl:brl, dataBR:dataBR, dataExtenso:dataExtenso, hoje:hoje,
    maisDias:maisDias, param:param, aviso:aviso};
})();

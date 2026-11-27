// AbertoCore: IA atendendo o cliente nos canais de mensagem (WhatsApp, Instagram, Messenger e e-mail).
// Liga em Atendimento automático → "Atender clientes sozinha" (configuracoes.dados.ia.ativo).
// Regras: nunca responde se a equipe falou na conversa nos últimos 30 minutos, nem se o
// cliente já foi passado para uma pessoa (d.bot.modo = "humano"); passa para a equipe
// quando o cliente quer fechar, negociar, reclamar ou falar com alguém.

function lerDados(rec) {
  try { return JSON.parse(rec.getString("dados") || "{}") || {} } catch (e) { return {} }
}
function limpa(t, max) { return String(t == null ? "" : t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) }

function cfgAtendimento(app, empresaId) {
  try {
    const c = lerDados(app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId }))
    return c.ia || {}
  } catch (e) { return {} }
}

// Devolve { texto, chamar, motivo } ou null (a IA fica quieta).
// Guarda no contato por que a IA ficou quieta (aparece na conversa para a equipe).
function quieta(app, rec, motivo, erro) {
  try {
    const atual = app.findRecordById("contatos", rec.id), d = lerDados(atual)
    const antes = d.iaQuieta || {}
    d.iaQuieta = { motivo: motivo, ts: Date.now() }
    // erro do Gemini (sobrecarga, demora): tenta de novo sozinha em alguns minutos, até 3 vezes
    if (erro) d.iaQuieta.tentar = (antes.tentar || 0) + 1
    atual.set("dados", d); app.save(atual)
  } catch (e) {}
  return null
}

function decide(app, empresaId, rec, canalNome) {
  const at = cfgAtendimento(app, empresaId)
  if (!at.ativo) return quieta(app, rec, "O Assistente de IA está desligado em Configurações → Atendimento automático.")
  const IA = require(`${__hooks}/ia.js`)
  const cfg = IA.cfgDaEmpresa(app, empresaId)
  if (!cfg || !cfg.getString("api_key")) return quieta(app, rec, "A IA não está conectada (falta a chave do Gemini em Atendimento automático).")
  const pausa = IA.iaPausada(app, empresaId)
  if (pausa) return quieta(app, rec, "A franquia de IA do mês passou de 120% (" + pausa.uso + " de " + pausa.franquia + " ações). O atendimento automático volta no dia 1º ou com um pacote extra; fale com a abertodigital.")
  const d = lerDados(rec)
  const agora = Date.now()
  // equipe escreveu há pouco? (ignora cópias de respostas da própria IA)
  const daIa = new Set((d.msgs || []).filter((m) => m.de === "ia").map((m) => m.txt))
  // só conta a equipe que respondeu depois que o cliente já falou (a abordagem de prospecção não tira a IA)
  const msgs = d.msgs || [], primeiraCli = msgs.findIndex((m) => m.de === "cli")
  if (msgs.some((m, i) => i > primeiraCli && primeiraCli >= 0 && m.de === "eq" && !daIa.has(m.txt) && agora - (m.ts || 0) < 30 * 60000)) return quieta(app, rec, "A equipe respondeu há menos de 30 minutos; a IA espera para não atropelar.")
  if (d.bot && d.bot.modo === "humano" && agora < (d.bot.ate || 0)) return quieta(app, rec, "A conversa está com a equipe (modo humano) até " + new Date(d.bot.ate - 3 * 3600000).toISOString().slice(11, 16) + ".")
  if (d.iaPausa && agora < d.iaPausa) return quieta(app, rec, "A IA está pausada nesta conversa.")
  if (d.ignorado) return null // contato ignorado: a IA não responde
  // Áudio do cliente ainda sem resposta: transcreve antes de responder, para a IA saber o que foi dito.
  // Grava a transcrição no próprio rec (quem chama salva a resposta nele depois).
  const pendentes = []
  for (let i = msgs.length - 1; i >= 0 && msgs[i].de === "cli"; i--) if (msgs[i].audio && !msgs[i].transcricao) pendentes.unshift(msgs[i])
  if (pendentes.length) {
    const T = require(`${__hooks}/transcreve.js`)
    let falhou = ""
    pendentes.slice(-3).forEach((m) => {
      try { m.transcricao = T.transcrever(app, empresaId, m) }
      catch (e) { falhou = String(e.message || e); app.logger().warn("atende: áudio não transcrito", "erro", falhou) }
    })
    rec.set("dados", d); app.save(rec)
    if (falhou && pendentes.some((m) => !m.transcricao)) return quieta(app, rec, "O cliente mandou áudio e a transcrição falhou (" + falhou.slice(0, 120) + "). A IA espera para não responder sem saber o que foi dito.", true)
  }
  const ctx = IA.contextoEmpresa(app, empresaId)
  const tom = { "Formal": "formal e educado", "Animado": "animado e caloroso" }[at.tom] || "próximo e direto"
  const curto = canalNome === "E-mail" ? "até 6 frases, em parágrafos curtos, com saudação e despedida" : "curto (até 3 frases)"
  const sistema = [
    "Você é " + (at.nome || "o atendente virtual") + ", atendente de " + ctx.nome + " no " + canalNome + ". Responda em português do Brasil, " + curto + ", tom " + tom + ", como alguém da equipe.",
    "Use só as informações abaixo. Se não souber algo, diga que a equipe confirma em seguida. Nunca invente preços, prazos, descontos ou promessas.",
    d.prospeccao
      ? "Esta conversa começou com uma mensagem NOSSA de prospecção (a pessoa não nos procurou). Objetivo: aquecer o contato com calma. Responda ao que ela disse, mostre interesse genuíno pelo negócio dela, faça no máximo uma pergunta por vez e ofereça a auditoria gratuita ou uma conversa rápida de 15 minutos com a equipe de " + ctx.nome + ". Não despeje preços nem pacotes; fale de preço só se perguntarem, com os valores das informações. Não prometa resultados. Se ela disser que não tem interesse ou pedir para não receber mensagens, agradeça, peça desculpas pelo incômodo, diga que não vai mais mandar mensagens e marque parar = true. Marque chamar_equipe = true quando ela aceitar a auditoria ou a conversa, pedir proposta, preço fechado ou reunião. Se a última mensagem for uma resposta automática da empresa (saudação padrão, cardápio, horário, cartão com telefone ou \"fale pelo WhatsApp\"), não responda: devolva resposta vazia, porque quem decide o próximo passo é a equipe."
      : "Objetivo: tirar dúvidas, entender o que a pessoa precisa e levar ao próximo passo do negócio (por exemplo, marcar uma conversa ou uma avaliação).",
    at.agendar ? "Pode sugerir marcar um horário; a equipe confirma o horário exato." : "",
    at.horario ? "Horário de atendimento da equipe: " + limpa(at.horario, 300) : "",
    "Seja assertivo: responda primeiro exatamente o que foi perguntado, com os dados das informações abaixo (preço, prazo, como funciona). Depois faça no máximo UMA pergunta que avance a venda (ex.: qual o negócio, o que já tem hoje, quando quer começar).",
    "Mensagens marcadas como [áudio transcrito] são áudios do cliente já transcritos: responda ao que ele falou, como se tivesse ouvido. Nunca diga que não consegue ouvir áudio.",
    "Não repita saudação nem apresentação se a conversa já começou. Não use frases vazias como 'Como podemos ajudar?' depois que o cliente já disse o que quer.",
    "Só diga que é o assistente virtual se for a primeira resposta da conversa ou se perguntarem; a equipe acompanha a conversa.",
    at.humano === false ? "" : "Marque chamar_equipe = true quando o cliente quiser fechar, negociar, pedir algo fora das informações, reclamar ou falar com uma pessoa. Mesmo assim, responda na mesma mensagem tudo o que as informações abaixo permitem.",
    (d.iaChamou && agora - d.iaChamou < 12 * 3600000) ? "A equipe JÁ foi avisada nesta conversa. Continue respondendo as dúvidas objetivas (preço, opções, prazos, como funciona) com as informações abaixo; não ofereça de novo falar com a equipe e não repita que vai chamar alguém. Se não souber, diga que a equipe responde em breve." : "",
    'Devolva só JSON: {"resposta":"...","chamar_equipe":false,"parar":false,"motivo":"","crm":{"resumo":"até 2 frases: o que o cliente quer e em que pé está","interesse":"produto/serviço ou vazio","valor":null,"proximo_retorno":null,"etapa":"uma de ' + JSON.stringify(ctx.etapas || []) + '"}}. Em crm não invente valores nem datas (null se não houver).',
    "", "Informações do negócio:", limpa(at.base || ctx.base, 3000),
    ctx.playbook ? "\nPlaybook comercial (use quando o assunto for iFood, apps de entrega, Cardápio Web ou concorrentes; argumente com estes fatos, sem despejar tudo de uma vez):\n" + ctx.playbook : "",
  ].filter(Boolean).join("\n")
  let r
  try { r = IA.chama(app, cfg, "atendimento", sistema, "Conversa até agora:\n" + IA.conversa(d, 10) + "\n\nResponda à última mensagem do cliente.", true, 450, rec.id) }
  catch (e) { app.logger().warn("atende: IA não respondeu", "canal", canalNome, "erro", String(e)); return quieta(app, rec, "A IA deu erro ao responder: " + String(e.message || e).slice(0, 160), true) }
  const texto = limpa(r && r.resposta, canalNome === "E-mail" ? 4000 : 1000)
  if (!texto) return quieta(app, rec, "A IA leu a mensagem e preferiu não responder (parece resposta automática ou não havia o que responder).")
  return { texto: texto, chamar: !!r.chamar_equipe, parar: !!r.parar, motivo: limpa(r.motivo, 160), crm: (r.crm && typeof r.crm === "object") ? r.crm : null, ctx: ctx }
}

// Grava a resposta da IA na conversa (e o aviso para a equipe, se for o caso).
function registra(app, rec, r, extra) {
  const d = lerDados(rec)
  const ultimo = (d.msgs || []).reduce((x, y) => Math.max(x, y.ts || 0), 0)
  const ts = Math.max(Date.now(), ultimo + 1)
  const msg = Object.assign({ de: "ia", txt: r.texto, ts: ts, k: "i" + ts.toString(36) }, extra || {})
  d.msgs = (d.msgs || []).concat([msg])
  delete d.iaQuieta
  // a mesma chamada já trouxe a leitura do card: o CRM não precisa chamar a IA de novo
  if (r.crm && r.ctx) {
    try {
      const IA = require(`${__hooks}/ia.js`)
      const c = IA.ultimaDoCliente(d)
      IA.aplicaAnalise(r.ctx, rec, d, Object.assign({ atencao: !!r.chamar, motivo: r.motivo || "" }, r.crm), c ? c.ts : 0)
    } catch (e) { app.logger().warn("atende: card não atualizado", "erro", String(e)) }
  }
  // a IA continua atendendo depois de chamar a equipe; quem pausa a IA é a equipe ao escrever na conversa
  const jaAvisou = d.iaChamou && Date.now() - d.iaChamou < 6 * 3600000
  if (r.chamar && !jaAvisou) d.iaChamou = Date.now()
  if (r.chamar) d.status = "entrada"
  if (r.parar) { // pediu para não receber mensagens: perdido e ignorado (sem avisos, sem IA)
    d.optout = true; d.ignorado = true; d.etapa = "Perdido"; d.motivoPerda = "Pediu para não receber mensagens"; d.status = "finalizado"
  }
  if (r.chamar && !jaAvisou) {
    try {
      const col = app.findCollectionByNameOrId("ia_chat")
      const a = new Record(col)
      a.set("empresa", rec.getString("empresa")); a.set("de", "ia"); a.set("autor", ""); a.set("tipo", "aviso")
      a.set("txt", (d.canal || "Mensagem") + ": " + (d.nome || "cliente") + " quer falar com a equipe" + (r.motivo ? " (" + r.motivo + ")" : "") + ".")
      a.set("contato", rec.getInt("local_id")); a.set("ts", Date.now())
      app.save(a)
    } catch (e) { app.logger().warn("atende: aviso não gravado", "erro", String(e)) }
  }
  rec.set("dados", d)
  app.save(rec)
}

module.exports = { decide, registra, cfgAtendimento }

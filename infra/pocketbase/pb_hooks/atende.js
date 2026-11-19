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
function decide(app, empresaId, rec, canalNome) {
  const at = cfgAtendimento(app, empresaId)
  if (!at.ativo) return null
  const IA = require(`${__hooks}/ia.js`)
  const cfg = IA.cfgDaEmpresa(app, empresaId)
  if (!cfg || !cfg.getString("api_key")) return null
  const d = lerDados(rec)
  const agora = Date.now()
  // equipe escreveu há pouco? (ignora cópias de respostas da própria IA)
  const daIa = new Set((d.msgs || []).filter((m) => m.de === "ia").map((m) => m.txt))
  if ((d.msgs || []).some((m) => m.de === "eq" && !daIa.has(m.txt) && agora - (m.ts || 0) < 30 * 60000)) return null
  if (d.bot && d.bot.modo === "humano" && agora < (d.bot.ate || 0)) return null
  if (d.iaPausa && agora < d.iaPausa) return null
  const ctx = IA.contextoEmpresa(app, empresaId)
  const tom = { "Formal": "formal e educado", "Animado": "animado e caloroso" }[at.tom] || "próximo e direto"
  const curto = canalNome === "E-mail" ? "até 6 frases, em parágrafos curtos, com saudação e despedida" : "curto (até 3 frases)"
  const sistema = [
    "Você é " + (at.nome || "o atendente virtual") + ", atendente de " + ctx.nome + " no " + canalNome + ". Responda em português do Brasil, " + curto + ", tom " + tom + ", como alguém da equipe.",
    "Use só as informações abaixo. Se não souber algo, diga que a equipe confirma em seguida. Nunca invente preços, prazos, descontos ou promessas.",
    "Objetivo: tirar dúvidas, entender o que a pessoa precisa e levar ao próximo passo do negócio (por exemplo, marcar uma conversa ou uma avaliação).",
    at.agendar ? "Pode sugerir marcar um horário; a equipe confirma o horário exato." : "",
    at.horario ? "Horário de atendimento da equipe: " + limpa(at.horario, 300) : "",
    "Se perguntarem, diga que você é o assistente virtual e que a equipe acompanha a conversa.",
    at.humano === false ? "" : "Marque chamar_equipe = true quando o cliente quiser fechar, negociar, pedir algo fora das informações, reclamar ou falar com uma pessoa.",
    'Devolva só JSON: {"resposta":"...","chamar_equipe":false,"motivo":""}.',
    "", "Informações do negócio:", limpa(at.base || ctx.base, 8000),
  ].filter(Boolean).join("\n")
  let r
  try { r = IA.chama(app, cfg, "atendimento", sistema, "Conversa até agora:\n" + IA.conversa(d, 16) + "\n\nResponda à última mensagem do cliente.", true, 700) }
  catch (e) { app.logger().warn("atende: IA não respondeu", "canal", canalNome, "erro", String(e)); return null }
  const texto = limpa(r && r.resposta, canalNome === "E-mail" ? 4000 : 1000)
  if (!texto) return null
  return { texto: texto, chamar: !!r.chamar_equipe, motivo: limpa(r.motivo, 160) }
}

// Grava a resposta da IA na conversa (e o aviso para a equipe, se for o caso).
function registra(app, rec, r, extra) {
  const d = lerDados(rec)
  const ultimo = (d.msgs || []).reduce((x, y) => Math.max(x, y.ts || 0), 0)
  const ts = Math.max(Date.now(), ultimo + 1)
  const msg = Object.assign({ de: "ia", txt: r.texto, ts: ts, k: "i" + ts.toString(36) }, extra || {})
  d.msgs = (d.msgs || []).concat([msg])
  if (r.chamar) {
    d.status = "entrada"
    d.bot = Object.assign({}, d.bot || {}, { modo: "humano", ate: Date.now() + 12 * 3600000 })
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

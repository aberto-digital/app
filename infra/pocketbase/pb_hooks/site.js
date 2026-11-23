// AbertoCore: formulário e chat do site (funções usadas por site.pb.js)
const W = require(`${__hooks}/wa.js`)

function canal(app, chave) {
  try {
    const c = app.findFirstRecordByFilter("canais_site", "chave = {:c} && ativo = true", { c: String(chave || "").slice(0, 60) })
    return c
  } catch (e) { throw new NotFoundError("Site não encontrado.") }
}

// limite simples por chave (IP + ação) usando o armazenamento em memória do servidor
function limita(app, chave, max, janelaMs) {
  const st = app.store()
  const agora = Date.now()
  let v = st.get("lim:" + chave)
  if (!v || agora - v.ini > janelaMs) v = { ini: agora, n: 0 }
  v.n++
  st.set("lim:" + chave, v)
  if (v.n > max) throw new TooManyRequestsError("Muitas mensagens em pouco tempo. Tente de novo em alguns minutos.")
}

function limpa(t, max) { return String(t == null ? "" : t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) }

function proximoId(app, empresaId) {
  let maior = 0
  const ids = app.findRecordsByFilter("contatos", "empresa = {:e}", "-local_id", 1, 0, { e: empresaId })
  if (ids.length) maior = ids[0].getInt("local_id")
  try {
    const c = W.lerDados(app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId }))
    if (c.prox && c.prox.c) maior = Math.max(maior, c.prox.c - 1)
  } catch (e) {}
  return maior + 1
}

function novoContato(app, empresaId, o) {
  const col = app.findCollectionByNameOrId("contatos")
  const id = proximoId(app, empresaId)
  const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
  const rec = new Record(col)
  rec.set("empresa", empresaId)
  rec.set("local_id", id)
  rec.set("nome", o.nome)
  rec.set("telefone", o.tel || "")
  rec.set("canal", o.canal)
  rec.set("etapa", "Novo contato")
  rec.set("dados", {
    id: id, nome: o.nome, negocio: o.negocio || "", canal: o.canal, tipo: "Lead", etapa: "Novo contato", valor: 0,
    followup: null, status: "entrada", tel: o.tel || "", origem: o.origem || "Site", nota: o.nota || "", naoLidas: 0,
    criado: hoje, criadoTs: Date.now(), msgs: [],
  })
  return rec
}

function telefone(t) {
  let d = W.digitos(t)
  if (d.length === 12 || d.length === 13) d = d.slice(2)
  if (d.length !== 10 && d.length !== 11) return ""
  return "(" + d.slice(0, 2) + ") " + (d.length === 11 ? d.slice(2, 7) + "-" + d.slice(7) : d.slice(2, 6) + "-" + d.slice(6))
}

function acharPorTelefone(app, empresaId, tel) {
  if (!tel) return null
  const todos = app.findRecordsByFilter("contatos", "empresa = {:e} && telefone != ''", "", 0, 0, { e: empresaId })
  for (let i = 0; i < todos.length; i++) if (W.mesmoNumero(todos[i].getString("telefone"), tel)) return todos[i]
  return null
}

function chegou(rec, txt, de) {
  const d = W.lerDados(rec)
  const ultimo = (d.msgs || []).reduce((x, y) => Math.max(x, y.ts || 0), 0)
  const ts = Math.max(Date.now(), ultimo + 1)
  d.msgs = (d.msgs || []).concat([{ de: de || "cli", txt: txt, ts: ts, k: "s" + ts.toString(36) + Math.random().toString(36).slice(2, 6) }])
  if (!de || de === "cli") {
    d.naoLidas = (d.naoLidas || 0) + 1
    if (d.status !== "entrada") d.status = "entrada"
  }
  rec.set("dados", d)
  return d
}

function avisaEquipe(app, empresaId, txt, localId) {
  if (localId) {
    try { const c = app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: localId }); if (JSON.parse(c.getString("dados") || "{}").ignorado) return } catch (e) {}
  }
  try {
    const col = app.findCollectionByNameOrId("ia_chat")
    const r = new Record(col)
    r.set("empresa", empresaId); r.set("de", "ia"); r.set("autor", ""); r.set("tipo", "aviso")
    r.set("txt", txt); r.set("contato", localId || 0); r.set("ts", Date.now())
    app.save(r)
  } catch (e) { app.logger().warn("site: não consegui avisar no chat interno", "erro", String(e)) }
}

// o que o visitante pode ver da conversa
function msgsPublicas(rec) {
  const d = W.lerDados(rec)
  return (d.msgs || []).filter((m) => m.de === "cli" || m.de === "eq" || m.de === "bot" || m.de === "ia")
    .map((m) => ({ de: m.de === "cli" ? "cli" : "eq", txt: m.txt, ts: m.ts }))
}

// atendimento pela IA no chat do site (24h). Devolve true se a IA respondeu.
// Não responde se alguém da equipe falou na conversa nos últimos 30 minutos.
function respondeIA(app, canalRec, rec) {
  if (!canalRec.getBool("ia")) return false
  const IA = require(`${__hooks}/ia.js`)
  const empresaId = canalRec.getString("empresa")
  const cfg = IA.cfgDaEmpresa(app, empresaId)
  if (!cfg || !cfg.getString("api_key")) return false
  const d = W.lerDados(rec)
  const agora = Date.now()
  const humano = (d.msgs || []).some((m) => m.de === "eq" && agora - (m.ts || 0) < 30 * 60000)
  if (humano) return false
  const ctx = IA.contextoEmpresa(app, empresaId)
  const sistema = [
    "Você é o atendente virtual de " + ctx.nome + " no chat do site. Responda em português do Brasil, curto (até 3 frases), simpático e direto, como alguém da equipe.",
    "Use só as informações abaixo. Se não souber algo, diga que a equipe confirma e peça o WhatsApp. Nunca invente preços, prazos, descontos ou promessas.",
    "Objetivo: tirar dúvidas, entender o que a pessoa precisa e levar ao próximo passo indicado nas informações do negócio (por exemplo, marcar um horário ou falar com a equipe). Peça nome e WhatsApp com naturalidade quando fizer sentido, sem insistir.",
    "Se perguntarem, diga que você é o assistente virtual e que a equipe acompanha a conversa.",
    "Marque chamar_equipe = true quando o cliente quiser fechar, negociar, pedir algo que não está nas informações, reclamar ou falar com uma pessoa.",
    'Devolva só JSON: {"resposta":"...","chamar_equipe":false,"motivo":"","nome":"","whatsapp":""}. Preencha nome e whatsapp só se o cliente informou na conversa.',
    "", "Informações do negócio:", limpa(canalRec.getString("contexto"), 8000), limpa(ctx.base, 6000),
  ].join("\n")
  let r
  try { r = IA.chama(app, cfg, "site", sistema, "Conversa até agora:\n" + IA.conversa(d, 16) + "\n\nResponda à última mensagem do cliente.", true, 600, rec.id) }
  catch (e) { app.logger().warn("site: IA não respondeu", "erro", String(e)); return false }
  const txt = limpa(r && r.resposta, 1200)
  if (!txt) return false
  chegou(rec, txt, "ia")
  const d2 = W.lerDados(rec)
  let mudou = false
  const nome = limpa(r.nome, 80)
  if (nome && /^Visitante/.test(rec.getString("nome"))) { rec.set("nome", nome); d2.nome = nome; mudou = true }
  const tel = telefone(r.whatsapp)
  if (tel && !rec.getString("telefone")) { rec.set("telefone", tel); d2.tel = tel; mudou = true }
  if (r.chamar_equipe && !d2.siteChamou) {
    d2.siteChamou = Date.now(); mudou = true
    avisaEquipe(app, empresaId, "Chat do site: " + (d2.nome || "visitante") + " quer falar com a equipe" + (r.motivo ? " (" + limpa(r.motivo, 160) + ")" : "") + ".", rec.getInt("local_id"))
  }
  if (mudou) rec.set("dados", d2)
  return true
}

module.exports = { respondeIA, canal, limita, limpa, novoContato, telefone, acharPorTelefone, chegou, avisaEquipe, msgsPublicas }

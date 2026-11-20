// AbertoCore: Instagram Direct e Facebook Messenger (Graph API da Meta) e a conexão de canais
// pelo próprio app (Login do Facebook para Empresas / cadastro incorporado do WhatsApp).
// Funções compartilhadas, carregadas com require pelos handlers de meta.pb.js e wa.js.

const W = require(`${__hooks}/wa.js`)

function base() { return $os.getenv("ABERTOCORE_GRAPH_BASE") || "https://graph.facebook.com" }
function versao(app) { const m = W.metaApp(app); return (m && m.getString("versao_api")) || "v25.0" }
function url(app, caminho) { return base() + "/" + versao(app) + "/" + caminho }

function erroGraph(res) {
  const j = res.json || {}
  return (j.error && (j.error.error_user_msg || j.error.message)) || ("HTTP " + res.statusCode)
}

function graphGet(app, caminho, token, params) {
  const q = Object.keys(params || {}).map((k) => k + "=" + encodeURIComponent(params[k])).join("&")
  const res = $http.send({ url: url(app, caminho) + (q ? "?" + q : ""), method: "GET",
    headers: { "Authorization": "Bearer " + token }, timeout: 20 })
  if (res.statusCode >= 300) throw new Error(erroGraph(res))
  return res.json || {}
}

function graphPost(app, caminho, token, corpo) {
  const res = $http.send({ url: url(app, caminho), method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(corpo || {}), timeout: 20 })
  if (res.statusCode >= 300) throw new Error(erroGraph(res))
  return res.json || {}
}

// ---------- canais ----------
function canalSocial(app, tipo, contaId) {
  const campo = tipo === "instagram" ? "ig_id" : "page_id"
  try { return app.findFirstRecordByFilter("canais", campo + " = {:c} && tipo = {:t} && ativo = true", { c: contaId, t: tipo }) } catch (e) { return null }
}
function canaisDaEmpresa(app, empresaId) {
  return app.findRecordsByFilter("canais", "empresa = {:e} && ativo = true", "tipo", 0, 0, { e: empresaId })
}
function canalDaEmpresaTipo(app, empresaId, tipo) {
  try { return app.findFirstRecordByFilter("canais", "empresa = {:e} && tipo = {:t} && ativo = true", { e: empresaId, t: tipo }) } catch (e) { return null }
}

// ---------- contatos vindos do Instagram / Messenger ----------
const ROTULO = { instagram: "Instagram", messenger: "Facebook" }

function nomePerfil(app, canal, tipo, pessoaId) {
  try {
    if (tipo === "instagram") {
      const j = graphGet(app, pessoaId, canal.getString("access_token"), { fields: "name,username" })
      return { nome: j.name || (j.username ? "@" + j.username : ""), usuario: j.username || "" }
    }
    const j = graphGet(app, pessoaId, canal.getString("access_token"), { fields: "first_name,last_name,name" })
    return { nome: j.name || [j.first_name, j.last_name].filter(Boolean).join(" "), usuario: "" }
  } catch (e) { return { nome: "", usuario: "" } }
}

function contatoSocial(app, canal, tipo, pessoaId) {
  const empresaId = canal.getString("empresa")
  const sid = (tipo === "instagram" ? "ig:" : "fb:") + pessoaId
  try { return app.findFirstRecordByFilter("contatos", "empresa = {:e} && social_id = {:s}", { e: empresaId, s: sid }) } catch (e) {}
  const S = require(`${__hooks}/site.js`)
  const p = nomePerfil(app, canal, tipo, pessoaId)
  const rotulo = ROTULO[tipo]
  const rec = S.novoContato(app, empresaId, { nome: p.nome || (rotulo + " " + pessoaId.slice(-4)), canal: rotulo, origem: rotulo,
    nota: p.usuario ? "@" + p.usuario : "" })
  rec.set("social_id", sid)
  const d = W.lerDados(rec)
  d.social = sid
  if (p.usuario) d.usuario = p.usuario
  rec.set("dados", d)
  return rec
}

function textoMensagem(msg) {
  if (msg.text) return msg.text
  const a = (msg.attachments || [])[0]
  if (!a) return msg.is_deleted ? null : "[mensagem]"
  const t = a.type
  if (t === "image") return "📷 Foto"
  if (t === "video") return "🎬 Vídeo"
  if (t === "audio") return "🎤 Áudio"
  if (t === "file") return "📄 Arquivo"
  if (t === "share" || t === "story_mention") return t === "story_mention" ? "Mencionou você no story" : "🔗 Compartilhou uma publicação"
  if (t === "ig_reel" || t === "reel") return "🎬 Compartilhou um reel"
  return "[" + t + "]"
}

// Processa o webhook (object = "page" ou "instagram"). Retorna quantas mensagens foram gravadas.
function processaWebhook(app, corpo) {
  const tipo = corpo.object === "instagram" ? "instagram" : corpo.object === "page" ? "messenger" : null
  if (!tipo) return 0
  let n = 0
  ;(corpo.entry || []).forEach((entry) => {
    const canal = canalSocial(app, tipo, String(entry.id))
    if (!canal) { app.logger().warn("meta: conta sem canal", "tipo", tipo, "id", entry.id); return }
    ;(entry.messaging || []).concat(entry.standby || []).forEach((ev) => {
      const msg = ev.message
      if (!msg || !msg.mid) return
      const eco = !!msg.is_echo
      const pessoa = String(eco ? ev.recipient.id : ev.sender.id)
      if (pessoa === String(entry.id)) return
      const txt = textoMensagem(msg)
      if (txt === null) return
      const rec = contatoSocial(app, canal, tipo, pessoa)
      const d = W.lerDados(rec)
      if (eco && ecoNosso(app, msg.mid, txt, d)) return
      const ultimo = (d.msgs || []).reduce((x, y) => Math.max(x, y.ts || 0), 0)
      const ts = Math.max(parseInt(ev.timestamp, 10) || Date.now(), Math.min(ultimo + 1, Date.now()))
      // eco = mensagem que saiu da conta da empresa (pelo AbertoCore ou direto no app do Instagram/Facebook)
      const nova = { de: eco ? "eq" : "cli", txt: txt, ts: ts, wa: msg.mid }
      const antes = (d.msgs || []).length
      d.msgs = W.unirMsgs(d.msgs, [nova])
      if (d.msgs.length === antes) return // repetida, ou eco de algo que o AbertoCore já gravou
      if (eco) {
        d.bot = Object.assign({}, d.bot || {}, { modo: "humano", ate: Date.now() + 12 * 3600000 })
        d.status = "esperando"
      } else {
        d.naoLidas = (d.naoLidas || 0) + 1
        if (d.status === "finalizado" || d.status === "esperando" || d.status === "prospeccao") d.status = "entrada"
      }
      d.social = d.social || rec.getString("social_id")
      rec.set("dados", d)
      app.save(rec)
      if (eco) return
      n++
      try { iaSocial(app, canal, tipo, app.findRecordById("contatos", rec.id)) } catch (e) { app.logger().error("meta: erro na IA", "erro", String(e)) }
    })
  })
  return n
}

// ---------- envio ----------
function enviaSocial(app, canal, pessoaId, texto) {
  try { app.store().set("meta_saindo:" + texto, Date.now()) } catch (e) {}
  // Messenger: se a conversa estiver com a Caixa de Entrada da Meta, o AbertoCore assume antes de responder
  if (canal.getString("tipo") === "messenger") {
    try { graphPost(app, canal.getString("page_id") + "/take_thread_control", canal.getString("access_token"), { recipient: { id: pessoaId }, metadata: "abertocore" }) } catch (e) {}
  }
  const j = graphPost(app, canal.getString("page_id") + "/messages", canal.getString("access_token"), {
    recipient: { id: pessoaId }, messaging_type: "RESPONSE", message: { text: texto },
  })
  if (!j.message_id) throw new Error("A Meta não confirmou o envio.")
  // marca o que saiu pelo AbertoCore: o eco que a Meta devolve no webhook é ignorado
  try { app.store().set("meta_out:" + j.message_id, Date.now()) } catch (e) {}
  return j.message_id
}

// anexo por link (tipo: "image" | "video" | "audio" | "file")
function enviaAnexoSocial(app, canal, pessoaId, link, tipo) {
  if (canal.getString("tipo") === "messenger") {
    try { graphPost(app, canal.getString("page_id") + "/take_thread_control", canal.getString("access_token"), { recipient: { id: pessoaId }, metadata: "abertocore" }) } catch (e) {}
  }
  const j = graphPost(app, canal.getString("page_id") + "/messages", canal.getString("access_token"), {
    recipient: { id: pessoaId }, messaging_type: "RESPONSE",
    message: { attachment: { type: tipo, payload: { url: link, is_reusable: true } } },
  })
  if (!j.message_id) throw new Error("A Meta não confirmou o envio do anexo.")
  try { app.store().set("meta_out:" + j.message_id, Date.now()) } catch (e) {}
  return j.message_id
}

// eco de algo que o próprio AbertoCore enviou (IA, menu ou equipe pela central)?
function ecoNosso(app, mid, txt, d) {
  try { if (app.store().has("meta_out:" + mid)) { app.store().remove("meta_out:" + mid); return true } } catch (e) {}
  // o eco pode chegar antes de a resposta do envio voltar: compara com o texto saindo agora
  try {
    const k = "meta_saindo:" + txt
    const t = app.store().get(k)
    if (t && Date.now() - t < 120000) { app.store().remove(k); return true }
  } catch (e) {}
  const agora = Date.now()
  return (d.msgs || []).some((m) => (m.de === "ia" || m.de === "bot" || m.de === "eq") && m.txt === txt && agora - (m.ts || 0) < 120000)
}

function iaSocial(app, canal, tipo, rec) {
  const A = require(`${__hooks}/atende.js`)
  const r = A.decide(app, canal.getString("empresa"), rec, ROTULO[tipo] === "Facebook" ? "Messenger" : "Instagram")
  if (!r) return false
  const pessoa = rec.getString("social_id").slice(3)
  let mid = null, erro = null
  try { mid = enviaSocial(app, canal, pessoa, r.texto) } catch (e) { erro = String(e.message || e) }
  A.registra(app, rec, r, mid ? { wa: mid, st: "sent" } : { erro: erro })
  if (erro) app.logger().error("meta: IA não conseguiu enviar", "erro", erro)
  return true
}

// ---------- conexão pelo app ----------
function trocaCodigo(app, codigo) {
  const m = W.metaApp(app)
  if (!m || !m.getString("app_secret")) throw new Error("O app da Meta ainda não está configurado no servidor.")
  const q = "client_id=" + encodeURIComponent(m.getString("app_id")) + "&client_secret=" + encodeURIComponent(m.getString("app_secret")) + "&code=" + encodeURIComponent(codigo)
  const res = $http.send({ url: url(app, "oauth/access_token") + "?" + q, method: "GET", timeout: 20 })
  const j = res.json || {}
  if (res.statusCode >= 300 || !j.access_token) throw new Error(erroGraph(res))
  return j.access_token
}

function salvaCanal(app, empresaId, filtro, params, valores) {
  let rec = null
  try { rec = app.findFirstRecordByFilter("canais", filtro, params) } catch (e) {}
  if (rec && rec.getString("empresa") !== empresaId) throw new Error("Esta conta já está ligada a outra empresa no AbertoCore.")
  if (!rec) { rec = new Record(app.findCollectionByNameOrId("canais")); rec.set("empresa", empresaId) }
  Object.keys(valores).forEach((k) => rec.set(k, valores[k]))
  rec.set("ativo", true)
  app.save(rec)
  return rec
}

// Liga a Página (Messenger) e, se tiver, o Instagram profissional ligado a ela.
function assinaPagina(app, pageId, tok) {
  graphPost(app, pageId + "/subscribed_apps?subscribed_fields=messages,message_echoes,messaging_postbacks,standby", tok, {})
}

function ligaPagina(app, empresaId, pagina) {
  const tok = pagina.access_token
  assinaPagina(app, pagina.id, tok)
  const ligados = []
  salvaCanal(app, empresaId, "tipo = 'messenger' && page_id = {:p}", { p: pagina.id },
    { tipo: "messenger", page_id: pagina.id, nome: pagina.name || "", conta: pagina.name || "", access_token: tok })
  ligados.push("Facebook Messenger (" + (pagina.name || pagina.id) + ")")
  const ig = pagina.instagram_business_account
  if (ig && ig.id) {
    salvaCanal(app, empresaId, "tipo = 'instagram' && ig_id = {:i}", { i: ig.id },
      { tipo: "instagram", page_id: pagina.id, ig_id: ig.id, nome: ig.username ? "@" + ig.username : (pagina.name || ""), conta: ig.username || "", access_token: tok })
    ligados.push("Instagram (@" + (ig.username || ig.id) + ")")
  }
  return ligados
}

function paginasDoToken(app, token) {
  const j = graphGet(app, "me/accounts", token, { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50" })
  return (j.data || []).filter((p) => p.access_token)
}

// Cadastro incorporado do WhatsApp (com coexistência: o número continua no app WhatsApp Business)
function ligaWhatsApp(app, empresaId, codigo, wabaId, phoneId) {
  if (!/^\d{5,25}$/.test(String(wabaId || "")) || !/^\d{5,25}$/.test(String(phoneId || ""))) throw new Error("A Meta não devolveu a conta do WhatsApp. Tente de novo.")
  const tok = trocaCodigo(app, codigo)
  graphPost(app, wabaId + "/subscribed_apps", tok, {})
  let numero = "", nome = ""
  try {
    const p = graphGet(app, phoneId, tok, { fields: "display_phone_number,verified_name" })
    numero = p.display_phone_number || ""; nome = p.verified_name || ""
  } catch (e) {}
  salvaCanal(app, empresaId, "phone_number_id = {:p}", { p: phoneId },
    { tipo: "whatsapp", phone_number_id: phoneId, waba_id: wabaId, numero: numero, nome: nome, conta: numero, access_token: tok })
  return "WhatsApp " + (numero || phoneId)
}

module.exports = { assinaPagina, processaWebhook, enviaSocial, enviaAnexoSocial, canalSocial, canaisDaEmpresa, canalDaEmpresaTipo, trocaCodigo, paginasDoToken, ligaPagina, ligaWhatsApp, graphGet, ROTULO }

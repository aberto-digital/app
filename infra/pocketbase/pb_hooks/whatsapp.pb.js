/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: WhatsApp Cloud API
//   GET  /api/whatsapp/webhook             verificação do webhook pela Meta
//   POST /api/whatsapp/webhook             mensagens e status que chegam da Meta (assinatura conferida)
//   GET  /api/abertocore/whatsapp          o app pergunta se a empresa tem WhatsApp conectado
//   POST /api/abertocore/whatsapp/enviar   o app envia uma mensagem de texto
// E uma trava: quando o app salva um contato, as mensagens que o servidor
// recebeu e o app ainda não tinha nunca são apagadas.

routerAdd("GET", "/api/whatsapp/webhook", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const q = e.request.url.query()
  const m = W.metaApp($app)
  const esperado = m && m.getString("verify_token")
  if (q.get("hub.mode") === "subscribe" && esperado && q.get("hub.verify_token") === esperado) {
    return e.string(200, q.get("hub.challenge"))
  }
  return e.string(403, "forbidden")
})

routerAdd("POST", "/api/whatsapp/webhook", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const bruto = toString(e.request.body)
  const m = W.metaApp($app)
  const segredo = m && m.getString("app_secret")
  const assinatura = e.request.header.get("X-Hub-Signature-256") || ""
  if (!segredo || assinatura !== "sha256=" + $security.hs256(bruto, segredo)) {
    $app.logger().warn("whatsapp: assinatura inválida no webhook")
    return e.string(401, "invalid signature")
  }
  let corpo
  try { corpo = JSON.parse(bruto) } catch (err) { return e.string(400, "bad json") }
  try {
    const n = W.processaWebhook($app, corpo)
    if (n) $app.logger().info("whatsapp: mensagens recebidas", "n", n)
  } catch (err) {
    // responde 200 mesmo assim para a Meta não reenviar em loop; o erro fica no log
    $app.logger().error("whatsapp: erro ao processar webhook", "erro", String(err))
  }
  return e.string(200, "ok")
})

routerAdd("GET", "/api/abertocore/whatsapp", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const canal = W.canalDaEmpresa($app, e.auth.getString("empresa"))
  return e.json(200, { conectado: !!canal, numero: canal ? canal.getString("numero") : "" })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/whatsapp/enviar", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const empresaId = e.auth.getString("empresa")
  const b = e.requestInfo().body || {}
  const texto = String(b.texto || "").trim()
  const localId = parseInt(b.contato, 10)
  if (!texto || !localId) throw new BadRequestError("Mensagem vazia.")
  if (texto.length > 4096) throw new BadRequestError("Mensagem muito longa (máximo 4096 caracteres).")

  const canal = W.canalDaEmpresa($app, empresaId)
  if (!canal) throw new BadRequestError("O WhatsApp desta empresa ainda não está conectado.")

  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: localId }) }
  catch (err) { throw new NotFoundError("Contato não encontrado no servidor. Aguarde salvar e tente de novo.") }

  let para = rec.getString("wa_id")
  if (!para) {
    let d = W.digitos(rec.getString("telefone"))
    if (d.length === 10 || d.length === 11) d = "55" + d
    if (d.length < 12) throw new BadRequestError("Este contato não tem um número de WhatsApp válido.")
    para = d
  }

  let waId
  try { waId = W.enviaTexto($app, canal, para, texto) }
  catch (err) {
    const msg = String(err.message || err)
    if (/re-?engagement|24 ?h|131047/i.test(msg)) throw new BadRequestError("Passaram 24 horas desde a última mensagem do cliente. O WhatsApp só permite responder livremente dentro desse prazo.")
    throw new BadRequestError("O WhatsApp recusou a mensagem: " + msg)
  }

  const d = W.lerDados(rec)
  d.msgs = W.unirMsgs(d.msgs, [{ de: "eq", txt: texto, ts: Date.now(), wa: waId, k: b.k || undefined, st: "sent" }])
  d.status = "esperando"
  d.wa = para
  // alguém da equipe respondeu: o robô sai da conversa por um tempo
  d.bot = Object.assign({}, d.bot || {}, { modo: "humano", ate: Date.now() + 12 * 3600000 })
  rec.set("wa_id", para)
  rec.set("dados", d)
  $app.save(rec)
  return e.json(200, { ok: true, wa: waId, dados: d })
}, $apis.requireAuth("users"))

// Trava: o app nunca apaga mensagens que só o servidor tem
onRecordUpdateRequest((e) => {
  const W = require(`${__hooks}/wa.js`)
  const orig = e.record.original()
  const velho = W.lerDados(orig), novo = W.lerDados(e.record)
  const vm = velho.msgs || []
  if (vm.length) {
    const doApp = {}
    ;(novo.msgs || []).forEach((m) => { doApp[m.k || m.wa || (m.de + "|" + m.ts + "|" + m.txt)] = true })
    const soNoServidor = vm.filter((m) => !doApp[m.k || m.wa || (m.de + "|" + m.ts + "|" + m.txt)])
    novo.msgs = W.unirMsgs(vm, novo.msgs)
    if (soNoServidor.some((m) => m.de === "cli")) {
      novo.naoLidas = Math.max(novo.naoLidas || 0, velho.naoLidas || 0)
      novo.status = "entrada"
    }
  }
  if (velho.wa && !novo.wa) novo.wa = velho.wa
  const vb = velho.bot, nb = novo.bot
  if (vb && (!nb || (vb.ate || 0) > (nb.ate || 0) || (vb.ultimoMenu || 0) > (nb.ultimoMenu || 0))) novo.bot = Object.assign({}, nb || {}, vb)
  e.record.set("dados", novo)
  if (!e.record.getString("wa_id") && orig.getString("wa_id")) e.record.set("wa_id", orig.getString("wa_id"))
  e.next()
}, "contatos")

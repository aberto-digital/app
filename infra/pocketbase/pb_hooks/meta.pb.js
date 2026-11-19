/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: Instagram Direct, Facebook Messenger e a tela Canais
//   GET  /api/meta/webhook                 verificação do webhook (Instagram e Página)
//   POST /api/meta/webhook                 mensagens do Direct e do Messenger (assinatura conferida)
//   GET  /api/abertocore/canais            canais ligados à empresa (sem tokens) + ids públicos do app da Meta
//   POST /api/abertocore/canais/meta       liga canais pelo Login do Facebook (code do SDK)
//   POST /api/abertocore/canais/desligar   desliga um canal
//   POST /api/abertocore/social/enviar     a equipe responde pelo Instagram ou Messenger

routerAdd("GET", "/api/meta/webhook", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const q = e.request.url.query()
  const m = W.metaApp($app)
  const esperado = m && m.getString("verify_token")
  if (q.get("hub.mode") === "subscribe" && esperado && q.get("hub.verify_token") === esperado) return e.string(200, q.get("hub.challenge"))
  return e.string(403, "forbidden")
})

routerAdd("POST", "/api/meta/webhook", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const M = require(`${__hooks}/meta.js`)
  const bruto = toString(e.request.body)
  const m = W.metaApp($app)
  const segredo = m && m.getString("app_secret")
  const assinatura = e.request.header.get("X-Hub-Signature-256") || ""
  if (!segredo || assinatura !== "sha256=" + $security.hs256(bruto, segredo)) {
    $app.logger().warn("meta: assinatura inválida no webhook")
    return e.string(401, "invalid signature")
  }
  let corpo
  try { corpo = JSON.parse(bruto) } catch (err) { return e.string(400, "bad json") }
  try {
    const n = M.processaWebhook($app, corpo)
    if (n) $app.logger().info("meta: mensagens recebidas", "n", n, "objeto", corpo.object)
  } catch (err) { $app.logger().error("meta: erro ao processar webhook", "erro", String(err)) }
  return e.string(200, "ok")
})

routerAdd("GET", "/api/abertocore/canais", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const M = require(`${__hooks}/meta.js`)
  const empresaId = e.auth.getString("empresa")
  const lista = M.canaisDaEmpresa($app, empresaId).map((c) => ({
    id: c.id, tipo: c.getString("tipo"), nome: c.getString("nome"), conta: c.getString("conta") || c.getString("numero"),
    numero: c.getString("numero"), desde: c.getString("created"),
  }))
  const m = W.metaApp($app)
  return e.json(200, {
    canais: lista,
    meta: m ? { app_id: m.getString("app_id"), versao: m.getString("versao_api") || "v25.0",
      config_whatsapp: m.getString("config_whatsapp"), config_social: m.getString("config_social") } : null,
    pode: e.auth.getString("papel") !== "equipe",
  })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/canais/meta", (e) => {
  const M = require(`${__hooks}/meta.js`)
  if (e.auth.getString("papel") === "equipe") throw new ForbiddenError("Só o dono ou o administrador conecta canais.")
  const empresaId = e.auth.getString("empresa")
  const b = e.requestInfo().body || {}
  const st = $app.store()
  const chave = "metaTok:" + e.auth.id
  try {
    if (b.tipo === "whatsapp") {
      const lig = M.ligaWhatsApp($app, empresaId, String(b.code || ""), String(b.waba_id || ""), String(b.phone_number_id || ""))
      return e.json(200, { ok: true, ligados: [lig] })
    }
    // Instagram + Messenger: 1º passo troca o code e lista as Páginas; 2º passo (page_id) liga a escolhida
    let tok = null, paginas = null
    if (b.code) {
      tok = M.trocaCodigo($app, String(b.code))
      paginas = M.paginasDoToken($app, tok)
      st.set(chave, { tok: tok, ts: Date.now() })
    } else {
      const v = st.get(chave)
      if (!v || Date.now() - v.ts > 15 * 60000) throw new Error("A autorização expirou. Clique em Conectar de novo.")
      tok = v.tok
      paginas = M.paginasDoToken($app, tok)
    }
    if (!paginas.length) throw new Error("Nenhuma Página do Facebook foi autorizada. Na janela da Meta, marque a Página (e o Instagram ligado a ela).")
    const escolhida = b.page_id ? paginas.filter((p) => p.id === String(b.page_id))[0] : (paginas.length === 1 ? paginas[0] : null)
    if (!escolhida) {
      return e.json(200, { ok: true, escolher: paginas.map((p) => ({ id: p.id, nome: p.name, instagram: p.instagram_business_account ? (p.instagram_business_account.username || "sim") : "" })) })
    }
    const ligados = M.ligaPagina($app, empresaId, escolhida)
    st.remove(chave)
    return e.json(200, { ok: true, ligados: ligados })
  } catch (err) {
    $app.logger().warn("canais: falha ao conectar", "erro", String(err.message || err))
    throw new BadRequestError(String(err.message || err))
  }
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/canais/desligar", (e) => {
  if (e.auth.getString("papel") === "equipe") throw new ForbiddenError("Só o dono ou o administrador desliga canais.")
  const b = e.requestInfo().body || {}
  let c
  try { c = $app.findRecordById("canais", String(b.id || "")) } catch (err) { throw new NotFoundError("Canal não encontrado.") }
  if (c.getString("empresa") !== e.auth.getString("empresa")) throw new NotFoundError("Canal não encontrado.")
  c.set("ativo", false)
  $app.save(c)
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/social/enviar", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const M = require(`${__hooks}/meta.js`)
  const empresaId = e.auth.getString("empresa")
  const b = e.requestInfo().body || {}
  const texto = String(b.texto || "").trim()
  const localId = parseInt(b.contato, 10)
  if (!texto || !localId) throw new BadRequestError("Mensagem vazia.")
  if (texto.length > 1000) throw new BadRequestError("Mensagem muito longa (máximo 1000 caracteres no Instagram e no Messenger).")
  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: localId }) }
  catch (err) { throw new NotFoundError("Contato não encontrado no servidor. Aguarde salvar e tente de novo.") }
  const sid = rec.getString("social_id")
  const tipo = sid.indexOf("ig:") === 0 ? "instagram" : sid.indexOf("fb:") === 0 ? "messenger" : null
  if (!tipo) throw new BadRequestError("Este contato não veio do Instagram nem do Messenger.")
  const canal = M.canalDaEmpresaTipo($app, empresaId, tipo)
  if (!canal) throw new BadRequestError((tipo === "instagram" ? "O Instagram" : "O Messenger") + " desta empresa não está conectado.")
  let mid
  try { mid = M.enviaSocial($app, canal, sid.slice(3), texto) }
  catch (err) {
    const msg = String(err.message || err)
    if (/outside of allowed window|24|10 ?\(#10\)|2018278/i.test(msg)) throw new BadRequestError("Passaram 24 horas desde a última mensagem do cliente. A Meta só permite responder livremente dentro desse prazo.")
    throw new BadRequestError("A Meta recusou a mensagem: " + msg)
  }
  const d = W.lerDados(rec)
  d.msgs = W.unirMsgs(d.msgs, [{ de: "eq", txt: texto, ts: Date.now(), wa: mid, k: b.k || undefined, st: "sent" }])
  d.status = "esperando"
  d.bot = Object.assign({}, d.bot || {}, { modo: "humano", ate: Date.now() + 12 * 3600000 })
  rec.set("dados", d)
  $app.save(rec)
  return e.json(200, { ok: true, mid: mid, dados: d })
}, $apis.requireAuth("users"))

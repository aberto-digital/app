/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: notificações push.
//   GET  /api/abertocore/push/chave        chave pública VAPID para o navegador se inscrever
//   POST /api/abertocore/push/inscreve     { endpoint, keys:{p256dh,auth}, aparelho, prefs }
//   POST /api/abertocore/push/sai          { endpoint }
//   POST /api/abertocore/push/teste        manda uma notificação de teste para os aparelhos do usuário

routerAdd("GET", "/api/abertocore/push/chave", (e) => {
  const P = require(`${__hooks}/push.js`)
  try { return e.json(200, { publicKey: P.chavePublica() }) }
  catch (err) { throw new BadRequestError(String(err.message || err)) }
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/push/inscreve", (e) => {
  const b = e.requestInfo().body || {}
  const ep = String(b.endpoint || ""), k = b.keys || {}
  if (!/^https:\/\//.test(ep) || !k.p256dh || !k.auth) throw new BadRequestError("Inscrição inválida.")
  let r
  try { r = $app.findFirstRecordByFilter("push_inscricoes", "endpoint = {:p}", { p: ep }) }
  catch (err) { r = new Record($app.findCollectionByNameOrId("push_inscricoes")) }
  r.set("usuario", e.auth.id); r.set("empresa", e.auth.getString("empresa"))
  r.set("endpoint", ep); r.set("p256dh", String(k.p256dh)); r.set("auth", String(k.auth))
  r.set("aparelho", String(b.aparelho || "").slice(0, 200))
  r.set("prefs", Object.assign({ mensagem: true, ia: true }, b.prefs || {}))
  $app.save(r)
  return e.json(200, { ok: true, prefs: r.get("prefs") })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/push/sai", (e) => {
  const b = e.requestInfo().body || {}
  try {
    const r = $app.findFirstRecordByFilter("push_inscricoes", "endpoint = {:p} && usuario = {:u}", { p: String(b.endpoint || ""), u: e.auth.id })
    $app.delete(r)
  } catch (err) {}
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/push/teste", (e) => {
  const P = require(`${__hooks}/push.js`)
  const n = P.notifica($app, e.auth.getString("empresa"), "teste", { titulo: "AbertoCore", corpo: "Notificações ligadas neste aparelho ✅", url: "/#mensagens", tag: "teste" })
  return e.json(200, { enviadas: n })
}, $apis.requireAuth("users"))

// cliente escreveu: notifica
onRecordAfterCreateSuccess((e) => {
  try { require(`${__hooks}/push.js`).avisaMensagemNova(e.app, e.record, null) } catch (err) { e.app.logger().warn("push: aviso falhou", "erro", String(err)) }
  e.next()
}, "contatos")
onRecordAfterUpdateSuccess((e) => {
  try { require(`${__hooks}/push.js`).avisaMensagemNova(e.app, e.record, e.record.original()) } catch (err) { e.app.logger().warn("push: aviso falhou", "erro", String(err)) }
  e.next()
}, "contatos")

// aviso do Assistente de IA: notifica
onRecordAfterCreateSuccess((e) => {
  try {
    const r = e.record
    if (r.getString("de") === "ia" && r.getString("tipo") === "aviso") {
      const t = r.getString("txt")
      require(`${__hooks}/push.js`).notifica(e.app, r.getString("empresa"), "ia", {
        titulo: "Assistente AbertoCore", corpo: t.length > 180 ? t.slice(0, 177) + "…" : t, url: "/#mensagens", tag: "ia", ia: true,
        contato: r.getInt("contato") || null,
      })
    }
  } catch (err) { e.app.logger().warn("push: aviso IA falhou", "erro", String(err)) }
  e.next()
}, "ia_chat")

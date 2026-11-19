/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: e-mail (Zoho Mail)
//   POST /api/abertocore/email/autorizar   o dono pede o link de login da Zoho
//   GET  /api/email/zoho/callback          a Zoho volta com o code; liga a caixa e volta para o app
//   POST /api/abertocore/email/enviar      a equipe responde o e-mail pelo app
//   cron a cada 2 minutos: lê as caixas ligadas

routerAdd("POST", "/api/abertocore/email/autorizar", (e) => {
  const E = require(`${__hooks}/email.js`)
  if (e.auth.getString("papel") === "equipe") throw new ForbiddenError("Só o dono ou o administrador conecta canais.")
  const z = E.appZoho($app)
  if (!z || !z.getString("client_id") || !z.getString("client_secret")) throw new BadRequestError("A conexão de e-mail ainda não foi configurada no servidor (app da Zoho).")
  const estado = $security.randomString(32)
  $app.store().set("zoho:" + estado, { empresa: e.auth.getString("empresa"), ts: Date.now() })
  const url = "https://accounts.zoho.com/oauth/v2/auth?scope=" + encodeURIComponent(E.ESCOPOS) + "&client_id=" + encodeURIComponent(z.getString("client_id")) +
    "&response_type=code&access_type=offline&prompt=consent&redirect_uri=" + encodeURIComponent(E.RETORNO) + "&state=" + estado
  return e.json(200, { url: url })
}, $apis.requireAuth("users"))

routerAdd("GET", "/api/email/zoho/callback", (e) => {
  const E = require(`${__hooks}/email.js`)
  const q = e.request.url.query()
  const volta = (st, msg) => e.redirect(302, "https://app.abertodigital.com/?email=" + st + (msg ? "&msg=" + encodeURIComponent(msg) : "") + "#canais")
  const estado = q.get("state") || ""
  const v = estado ? $app.store().get("zoho:" + estado) : null
  if (!v || Date.now() - v.ts > 15 * 60000) return volta("erro", "A autorização expirou. Tente de novo.")
  $app.store().remove("zoho:" + estado)
  if (q.get("error")) return volta("erro", "Conexão cancelada na Zoho.")
  let servidor = q.get("accounts-server") || "https://accounts.zoho.com"
  if (!/^https:\/\/accounts\.zoho\.[a-z.]{2,8}$/.test(servidor)) servidor = "https://accounts.zoho.com"
  try {
    const email = E.liga($app, v.empresa, q.get("code") || "", servidor)
    return volta("ok", email)
  } catch (err) {
    $app.logger().warn("email: falha ao ligar a caixa", "erro", String(err.message || err))
    return volta("erro", String(err.message || err))
  }
})

routerAdd("POST", "/api/abertocore/email/enviar", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const E = require(`${__hooks}/email.js`)
  const M = require(`${__hooks}/meta.js`)
  const empresaId = e.auth.getString("empresa")
  const b = e.requestInfo().body || {}
  const texto = String(b.texto || "").trim()
  const localId = parseInt(b.contato, 10)
  if (!texto || !localId) throw new BadRequestError("Mensagem vazia.")
  if (texto.length > 20000) throw new BadRequestError("Mensagem muito longa.")
  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: localId }) }
  catch (err) { throw new NotFoundError("Contato não encontrado no servidor. Aguarde salvar e tente de novo.") }
  const sid = rec.getString("social_id")
  if (sid.indexOf("em:") !== 0) throw new BadRequestError("Este contato não veio do e-mail.")
  const canal = M.canalDaEmpresaTipo($app, empresaId, "email")
  if (!canal) throw new BadRequestError("O e-mail desta empresa não está conectado.")
  const d = W.lerDados(rec)
  const assunto = String(b.assunto || d.assunto || "").trim()
  let id
  try { id = E.envia($app, canal, sid.slice(3), /^re:/i.test(assunto) || !assunto ? assunto : "Re: " + assunto, texto, d.emailMsg || "") }
  catch (err) { throw new BadRequestError("Não consegui enviar o e-mail: " + String(err.message || err)) }
  d.msgs = W.unirMsgs(d.msgs, [{ de: "eq", txt: texto, ts: Date.now(), wa: "em:" + id, k: b.k || undefined, st: "sent" }])
  d.status = "esperando"
  rec.set("dados", d)
  $app.save(rec)
  return e.json(200, { ok: true, dados: d })
}, $apis.requireAuth("users"))

cronAdd("abertocore_email", "*/2 * * * *", () => {
  const E = require(`${__hooks}/email.js`)
  E.leTodos($app)
})

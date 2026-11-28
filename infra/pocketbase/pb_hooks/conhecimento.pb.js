/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: conhecimento da IA de atendimento
//   GET  /api/abertocore/conhecimento            lista tudo da empresa
//   POST /api/abertocore/conhecimento            cria ou altera (id no corpo para alterar)
//   POST /api/abertocore/conhecimento/status     { id, status }  aprova, pausa, recusa ou reativa
//   POST /api/abertocore/conhecimento/apagar     { id }
//   POST /api/abertocore/conhecimento/importar   { urls: [link CSV publicado] } importa Afirmações, Argumentos e Aprendizados
// Só o dono da conta altera. A IA usa só o que está ativo.

routerAdd("GET", "/api/abertocore/conhecimento", (e) => {
  const K = require(`${__hooks}/conhecimento.js`)
  return e.json(200, { itens: K.lista($app, e.auth.getString("empresa")).map(K.publica) })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/conhecimento", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const K = require(`${__hooks}/conhecimento.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError("Só o dono da conta altera o conhecimento da IA.")
  const emp = e.auth.getString("empresa")
  const b = new DynamicModel({ id: "", tipo: "", status: "", codigo: "", quando: "", texto: "", exemplo: "", condicao: "", pode_usar: true })
  e.bindBody(b)
  if (!String(b.texto).trim()) throw new BadRequestError("Escreva o texto.")
  let rec
  if (b.id) {
    rec = $app.findRecordById("conhecimento", String(b.id))
    if (rec.getString("empresa") !== emp) throw new NotFoundError()
  } else {
    if (K.TIPOS.indexOf(String(b.tipo)) < 0) throw new BadRequestError("Escolha o tipo.")
    rec = new Record($app.findCollectionByNameOrId("conhecimento"))
    rec.set("empresa", emp); rec.set("tipo", String(b.tipo)); rec.set("fonte", "painel")
    rec.set("status", K.STATUS.indexOf(String(b.status)) >= 0 ? String(b.status) : "ativo")
  }
  rec.set("codigo", String(b.codigo).trim().slice(0, 20))
  rec.set("quando", String(b.quando).trim().slice(0, 400))
  rec.set("texto", String(b.texto).trim().slice(0, 3000))
  rec.set("exemplo", String(b.exemplo).trim().slice(0, 2000))
  rec.set("condicao", String(b.condicao).trim().slice(0, 600))
  rec.set("pode_usar", b.pode_usar !== false)
  rec.set("decidido_por", e.auth.getString("email")); rec.set("decidido_em", new Date().toISOString())
  $app.save(rec)
  return e.json(200, K.publica(rec))
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/conhecimento/status", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const K = require(`${__hooks}/conhecimento.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError("Só o dono da conta altera o conhecimento da IA.")
  const b = new DynamicModel({ id: "", status: "" })
  e.bindBody(b)
  if (K.STATUS.indexOf(String(b.status)) < 0) throw new BadRequestError("Situação inválida.")
  const rec = $app.findRecordById("conhecimento", String(b.id))
  if (rec.getString("empresa") !== e.auth.getString("empresa")) throw new NotFoundError()
  rec.set("status", String(b.status))
  rec.set("decidido_por", e.auth.getString("email")); rec.set("decidido_em", new Date().toISOString())
  $app.save(rec)
  return e.json(200, K.publica(rec))
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/conhecimento/apagar", (e) => {
  const I = require(`${__hooks}/ia.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError("Só o dono da conta altera o conhecimento da IA.")
  const b = new DynamicModel({ id: "" })
  e.bindBody(b)
  const rec = $app.findRecordById("conhecimento", String(b.id))
  if (rec.getString("empresa") !== e.auth.getString("empresa")) throw new NotFoundError()
  $app.delete(rec)
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/conhecimento/importar", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const K = require(`${__hooks}/conhecimento.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError("Só o dono da conta altera o conhecimento da IA.")
  const b = new DynamicModel({ urls: [] })
  e.bindBody(b)
  const urls = (b.urls || []).map(String).map((u) => u.trim()).filter(Boolean).slice(0, 6)
  if (!urls.length) throw new BadRequestError("Cole o link de pelo menos uma aba publicada em CSV.")
  urls.forEach((u) => { if (!I.validaUrlFonte(u)) throw new BadRequestError("O link precisa ser de uma aba publicada na web em CSV (termina com output=csv).") })
  let cont
  try { cont = K.importaPlanilha($app, e.auth.getString("empresa"), urls, e.auth.getString("email")) }
  catch (err) { throw new BadRequestError(String(err.message || err)) }
  return e.json(200, { importados: cont })
}, $apis.requireAuth("users"))

/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: automações do Instagram (estilo ManyChat)
//   GET    /api/abertocore/automacoes            lista + situação da conexão (permissões e webhook)
//   POST   /api/abertocore/automacoes            cria ou altera (id no corpo para alterar)
//   POST   /api/abertocore/automacoes/apagar     apaga { id }
//   GET    /api/abertocore/automacoes/posts      últimos posts do Instagram ligado (para escolher)

routerAdd("GET", "/api/abertocore/automacoes", (e) => {
  const A = require(`${__hooks}/automacoes.js`)
  const M = require(`${__hooks}/meta.js`)
  const W = require(`${__hooks}/wa.js`)
  const emp = e.auth.getString("empresa")
  const lista = $app.findRecordsByFilter("automacoes", "empresa = {:e}", "created", 0, 0, { e: emp }).map(A.publica)
  const canal = M.canalDaEmpresaTipo($app, emp, "instagram")
  const sit = { instagram: canal ? canal.getString("nome") : "", permissoes: [], webhook: [], erro: "" }
  if (canal) {
    const m = W.metaApp($app)
    if (m && m.getString("app_secret")) {
      const appTok = m.getString("app_id") + "|" + m.getString("app_secret")
      try {
        const d = M.graphGet($app, "debug_token", appTok, { input_token: canal.getString("access_token") })
        sit.permissoes = ((d.data || {}).scopes || [])
      } catch (err) { sit.erro = String(err.message || err) }
      try {
        const s = M.graphGet($app, m.getString("app_id") + "/subscriptions", appTok, {})
        const ig = (s.data || []).find((x) => x.object === "instagram")
        sit.webhook = ig ? (ig.fields || []).map((f) => f.name || f) : []
      } catch (err) { sit.erro = sit.erro || String(err.message || err) }
    }
  }
  return e.json(200, { automacoes: lista, situacao: sit })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/automacoes", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const A = require(`${__hooks}/automacoes.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError("Só o dono da conta configura automações.")
  const emp = e.auth.getString("empresa")
  const b = new DynamicModel({ id: "", nome: "", ativo: false, gatilho: "", posts: [], palavras: "", resposta_publica: "", mensagem: "", botoes: [], etiqueta: "" })
  e.bindBody(b)
  const g = String(b.gatilho)
  if (["comentario", "story", "dm"].indexOf(g) < 0) throw new BadRequestError("Escolha o gatilho.")
  if (!String(b.nome).trim()) throw new BadRequestError("Dê um nome para a automação.")
  if (!String(b.mensagem).trim()) throw new BadRequestError("Escreva a mensagem que vai na DM.")
  if (g === "dm" && !String(b.palavras).trim()) throw new BadRequestError("Na DM, informe pelo menos uma palavra-chave.")
  const bts = (b.botoes || []).filter((x) => x && String(x.t || "").trim() && String(x.r || "").trim()).slice(0, 3)
    .map((x) => ({ t: String(x.t).trim().slice(0, 20), r: String(x.r).trim().slice(0, 1000) }))
  let rec
  if (b.id) {
    rec = $app.findRecordById("automacoes", String(b.id))
    if (rec.getString("empresa") !== emp) throw new NotFoundError()
  } else {
    rec = new Record($app.findCollectionByNameOrId("automacoes"))
    rec.set("empresa", emp); rec.set("disparos", 0)
  }
  rec.set("nome", String(b.nome).trim().slice(0, 80))
  rec.set("ativo", !!b.ativo)
  rec.set("gatilho", g)
  rec.set("posts", (b.posts || []).map(String).filter((x) => /^\d{5,30}$/.test(x)).slice(0, 50))
  rec.set("palavras", String(b.palavras).slice(0, 600))
  rec.set("resposta_publica", g === "comentario" ? String(b.resposta_publica).slice(0, 1500) : "")
  rec.set("mensagem", String(b.mensagem).trim().slice(0, 1000))
  rec.set("botoes", bts)
  rec.set("etiqueta", String(b.etiqueta).trim().slice(0, 60))
  $app.save(rec)
  return e.json(200, A.publica(rec))
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/automacoes/apagar", (e) => {
  const I = require(`${__hooks}/ia.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError("Só o dono da conta configura automações.")
  const b = new DynamicModel({ id: "" })
  e.bindBody(b)
  const rec = $app.findRecordById("automacoes", String(b.id))
  if (rec.getString("empresa") !== e.auth.getString("empresa")) throw new NotFoundError()
  $app.delete(rec)
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("GET", "/api/abertocore/automacoes/posts", (e) => {
  const M = require(`${__hooks}/meta.js`)
  const canal = M.canalDaEmpresaTipo($app, e.auth.getString("empresa"), "instagram")
  if (!canal) throw new BadRequestError("Ligue o Instagram em Configurações → Canais.")
  try {
    const j = M.graphGet($app, canal.getString("ig_id") + "/media", canal.getString("access_token"),
      { fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp", limit: "24" })
    return e.json(200, { posts: (j.data || []).map((p) => ({ id: p.id, legenda: String(p.caption || "").slice(0, 120), img: p.thumbnail_url || p.media_url || "", link: p.permalink, ts: p.timestamp })) })
  } catch (err) { throw new BadRequestError("Não consegui ler os posts: " + String(err.message || err)) }
}, $apis.requireAuth("users"))

// Liga o aviso de comentários do Instagram no webhook do app da Meta (mantém os campos atuais).
// Só a equipe da agência (dona do app da Meta) usa.
routerAdd("POST", "/api/abertocore/automacoes/assinar-comentarios", (e) => {
  const M = require(`${__hooks}/meta.js`)
  const W = require(`${__hooks}/wa.js`)
  const I = require(`${__hooks}/ia.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError()
  let nomeEmp = ""
  try { nomeEmp = $app.findRecordById("empresas", e.auth.getString("empresa")).getString("nome") } catch (x) {}
  if (!/aberto\s*digital/i.test(nomeEmp)) throw new ForbiddenError("Só a agência configura o app da Meta.")
  const m = W.metaApp($app)
  const appTok = m.getString("app_id") + "|" + m.getString("app_secret")
  const s = M.graphGet($app, m.getString("app_id") + "/subscriptions", appTok, {})
  const ig = (s.data || []).find((x) => x.object === "instagram")
  if (!ig) throw new BadRequestError("O webhook do Instagram ainda não está configurado no app da Meta.")
  const campos = Array.from(new Set((ig.fields || []).map((f) => f.name || f).concat(["comments"])))
  M.graphPost($app, m.getString("app_id") + "/subscriptions?" + [
    "object=instagram", "callback_url=" + encodeURIComponent(ig.callback_url),
    "fields=" + encodeURIComponent(campos.join(",")), "verify_token=abertocore-webhook-meta", "include_values=true",
  ].join("&"), appTok, {})
  return e.json(200, { ok: true, campos: campos })
}, $apis.requireAuth("users"))

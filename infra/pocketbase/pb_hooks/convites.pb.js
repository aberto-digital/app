/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: acesso de clientes novos
//   A equipe da abertodigital cria o acesso de uma empresa cliente e recebe um link de convite.
//   A cliente abre o link, cria a própria senha e já entra no app. Ninguém mais conhece a senha.

// Quem pode criar acessos: dono/admin da empresa "abertodigital" (a função fica dentro de cada rota
// porque o PocketBase isola o escopo de cada handler).

routerAdd("GET", "/api/abertocore/admin/empresas", (e) => {
  function agencia(app, auth) {
    if (!auth || auth.getString("papel") === "equipe") return false
    try { return app.findRecordById("empresas", auth.getString("empresa")).getString("nome") === "abertodigital" } catch (er) { return false }
  }
  if (!agencia(e.app, e.auth)) throw new ForbiddenError("Só a equipe da abertodigital.")
  const lista = e.app.findRecordsByFilter("empresas", "id != ''", "nome", 200, 0).map((r) => {
    const us = e.app.findRecordsByFilter("users", "empresa = {:e}", "email", 50, 0, { e: r.id })
    return { id: r.id, nome: r.getString("nome"), plano: r.getString("plano"), usuarios: us.map((u) => ({ email: u.getString("email"), papel: u.getString("papel") })) }
  })
  return e.json(200, { empresas: lista })
}, $apis.requireAuth("users"))

// cria uma empresa cliente nova (vazia), para depois gerar o acesso dela
routerAdd("POST", "/api/abertocore/admin/empresa", (e) => {
  function agencia(app, auth) {
    if (!auth || auth.getString("papel") === "equipe") return false
    try { return app.findRecordById("empresas", auth.getString("empresa")).getString("nome") === "abertodigital" } catch (er) { return false }
  }
  if (!agencia(e.app, e.auth)) throw new ForbiddenError("Só a equipe da abertodigital.")
  const b = e.requestInfo().body || {}
  const nome = String(b.nome || "").replace(/\s+/g, " ").trim().slice(0, 80)
  const plano = ["Start", "Presença", "Completo", "Piloto", "Teste"].indexOf(b.plano) >= 0 ? b.plano : "Completo"
  if (nome.length < 2) throw new BadRequestError("Informe o nome da empresa.")
  try { e.app.findFirstRecordByFilter("empresas", "nome = {:n}", { n: nome }); throw new BadRequestError("Já existe uma empresa com esse nome.") } catch (er) { if (er instanceof BadRequestError) throw er }
  const emp = new Record(e.app.findCollectionByNameOrId("empresas"))
  emp.set("nome", nome)
  emp.set("plano", plano)
  emp.set("ativa", true)
  e.app.save(emp)
  const conf = new Record(e.app.findCollectionByNameOrId("configuracoes"))
  conf.set("empresa", emp.id)
  conf.set("dados", { msgsCanal: {}, prox: { c: 1, e: 1, p: 1 } })
  e.app.save(conf)
  return e.json(200, { id: emp.id, nome: nome, plano: plano })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/admin/acesso", (e) => {
  function agencia(app, auth) {
    if (!auth || auth.getString("papel") === "equipe") return false
    try { return app.findRecordById("empresas", auth.getString("empresa")).getString("nome") === "abertodigital" } catch (er) { return false }
  }
  if (!agencia(e.app, e.auth)) throw new ForbiddenError("Só a equipe da abertodigital.")
  const b = e.requestInfo().body || {}
  const email = String(b.email || "").trim().toLowerCase().slice(0, 200)
  const papel = b.papel === "equipe" ? "equipe" : "dono"
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestError("E-mail inválido.")
  let emp
  try { emp = e.app.findRecordById("empresas", String(b.empresa || "")) } catch (er) { throw new NotFoundError("Empresa não encontrada.") }

  let u, novo = false
  try { u = e.app.findAuthRecordByEmail("users", email) } catch (er) { u = null }
  if (u && u.getString("empresa") !== emp.id) throw new BadRequestError("Este e-mail já é usado em outra empresa.")
  if (!u) {
    u = new Record(e.app.findCollectionByNameOrId("users"))
    u.set("email", email)
    u.set("verified", true)
    u.set("empresa", emp.id)
    u.set("papel", papel)
    u.setPassword($security.randomString(40)) // provisória e desconhecida; a pessoa cria a dela pelo convite
    e.app.save(u)
    novo = true
  }
  // um convite válido por vez
  e.app.findRecordsByFilter("convites", "usuario = {:u} && usado = false", "", 20, 0, { u: u.id }).forEach((c) => { c.set("usado", true); e.app.save(c) })
  const token = $security.randomString(40)
  const c = new Record(e.app.findCollectionByNameOrId("convites"))
  c.set("usuario", u.id)
  c.set("hash", $security.sha256(token))
  c.set("expira", new Date(Date.now() + 7 * 86400000).toISOString())
  c.set("usado", false)
  e.app.save(c)
  return e.json(200, { email: email, empresa: emp.getString("nome"), novo: novo, link: "https://app.abertodigital.com/#convite=" + token, expira: c.getString("expira") })
}, $apis.requireAuth("users"))

// a pessoa convidada: ver de quem é o convite
routerAdd("GET", "/api/abertocore/convite", (e) => {
  const S = require(`${__hooks}/site.js`)
  S.limita(e.app, "conv:" + e.realIP(), 30, 3600000)
  const token = String(e.request.url.query().get("token") || "")
  let c
  try { c = e.app.findFirstRecordByFilter("convites", "hash = {:h} && usado = false", { h: $security.sha256(token) }) } catch (er) { throw new NotFoundError("Convite inválido ou já usado.") }
  if (c.getString("expira") < new Date().toISOString()) throw new BadRequestError("Este convite venceu. Peça um novo para a abertodigital.")
  const u = e.app.findRecordById("users", c.getString("usuario"))
  let nome = ""
  try { nome = e.app.findRecordById("empresas", u.getString("empresa")).getString("nome") } catch (er) {}
  return e.json(200, { email: u.getString("email"), empresa: nome })
})

// a pessoa convidada: criar a senha e entrar
routerAdd("POST", "/api/abertocore/convite", (e) => {
  const S = require(`${__hooks}/site.js`)
  S.limita(e.app, "conv:" + e.realIP(), 30, 3600000)
  const b = e.requestInfo().body || {}
  const senha = String(b.senha || "")
  if (senha.length < 8) throw new BadRequestError("A senha precisa de pelo menos 8 caracteres.")
  if (senha.length > 72) throw new BadRequestError("Senha longa demais.")
  let c
  try { c = e.app.findFirstRecordByFilter("convites", "hash = {:h} && usado = false", { h: $security.sha256(String(b.token || "")) }) } catch (er) { throw new NotFoundError("Convite inválido ou já usado.") }
  if (c.getString("expira") < new Date().toISOString()) throw new BadRequestError("Este convite venceu. Peça um novo para a abertodigital.")
  const u = e.app.findRecordById("users", c.getString("usuario"))
  u.setPassword(senha)
  u.set("verified", true)
  e.app.save(u)
  c.set("usado", true)
  e.app.save(c)
  return $apis.recordAuthResponse(e, u, "password", null)
})

// endereço e aparência da página de agendamento de uma empresa cliente (só a equipe da abertodigital)
//   fica em empresas.perfil.agenda = { dominio, slug, marca:{ topo, cor, fundo, fonte, logo } }
routerAdd("GET", "/api/abertocore/admin/agenda-marca", (e) => {
  function agencia(app, auth) {
    if (!auth || auth.getString("papel") === "equipe") return false
    try { return app.findRecordById("empresas", auth.getString("empresa")).getString("nome") === "abertodigital" } catch (er) { return false }
  }
  if (!agencia(e.app, e.auth)) throw new ForbiddenError("Só a equipe da abertodigital.")
  let emp; try { emp = e.app.findRecordById("empresas", e.request.url.query().get("empresa")) } catch (x) { throw new NotFoundError("Empresa não encontrada.") }
  let p = {}; try { p = JSON.parse(emp.getString("perfil") || "{}") || {} } catch (x) {}
  return e.json(200, { agenda: p.agenda || {}, site: p.site || "" })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/admin/agenda-marca", (e) => {
  function agencia(app, auth) {
    if (!auth || auth.getString("papel") === "equipe") return false
    try { return app.findRecordById("empresas", auth.getString("empresa")).getString("nome") === "abertodigital" } catch (er) { return false }
  }
  if (!agencia(e.app, e.auth)) throw new ForbiddenError("Só a equipe da abertodigital.")
  const b = e.requestInfo().body || {}
  let emp; try { emp = e.app.findRecordById("empresas", String(b.empresa || "")) } catch (x) { throw new NotFoundError("Empresa não encontrada.") }
  const dom = String(b.dominio || "").toLowerCase().trim().replace(/^https?:\/\//, "").replace(/[\/:?#].*$/, "").replace(/\.$/, "")
  if (dom && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dom)) throw new BadRequestError("Endereço inválido. Exemplo: agendar.seusite.com.br")
  const slug = String(b.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40)
  const m = b.marca || {}, cor = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v) : "")
  const logo = String(m.logo || "")
  const marca = {
    topo: cor(m.topo), cor: cor(m.cor), fundo: cor(m.fundo),
    fonte: ["moderna", "elegante", "classica", "suave"].indexOf(m.fonte) >= 0 ? m.fonte : "moderna",
    logo: /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo) && logo.length < 400000 ? logo : "",
  }
  Object.keys(marca).forEach((k) => { if (!marca[k]) delete marca[k] })
  let p = {}; try { p = JSON.parse(emp.getString("perfil") || "{}") || {} } catch (x) {}
  p.agenda = { dominio: dom, slug: slug, marca: marca }
  emp.set("perfil", p)
  e.app.save(emp)
  return e.json(200, { ok: true, agenda: p.agenda })
}, $apis.requireAuth("users"))

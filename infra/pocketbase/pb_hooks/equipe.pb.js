/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: equipe da empresa e franquia de IA
//   GET  /api/abertocore/equipe          pessoas da empresa (para escolher o responsável pela conversa)
//   GET  /api/abertocore/admin/ia-uso    agência: uso de IA do mês e franquia de cada empresa
//   POST /api/abertocore/admin/franquia  agência: muda a franquia mensal de IA de uma empresa { empresa, franquia }

routerAdd("GET", "/api/abertocore/equipe", (e) => {
  const empresaId = e.auth.getString("empresa")
  if (!empresaId) throw new BadRequestError("Usuário sem empresa.")
  const us = e.app.findRecordsByFilter("users", "empresa = {:e}", "email", 100, 0, { e: empresaId })
  return e.json(200, {
    eu: e.auth.id,
    equipe: us.map((u) => {
      const email = u.getString("email")
      return { id: u.id, nome: u.getString("name") || email.split("@")[0], papel: u.getString("papel") }
    }),
  })
}, $apis.requireAuth("users"))

routerAdd("GET", "/api/abertocore/admin/ia-uso", (e) => {
  function agencia(app, auth) {
    if (!auth || auth.getString("papel") === "equipe") return false
    try { return app.findRecordById("empresas", auth.getString("empresa")).getString("nome") === "abertodigital" } catch (er) { return false }
  }
  if (!agencia(e.app, e.auth)) throw new ForbiddenError("Só a equipe da abertodigital.")
  const I = require(`${__hooks}/ia.js`)
  const out = {}
  e.app.findRecordsByFilter("empresas", "id != ''", "nome", 200, 0).forEach((r) => {
    out[r.id] = { uso: I.usoDoMes(e.app, r.id), franquia: I.franquia(e.app, r.id) }
  })
  return e.json(200, { empresas: out })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/admin/franquia", (e) => {
  function agencia(app, auth) {
    if (!auth || auth.getString("papel") === "equipe") return false
    try { return app.findRecordById("empresas", auth.getString("empresa")).getString("nome") === "abertodigital" } catch (er) { return false }
  }
  if (!agencia(e.app, e.auth)) throw new ForbiddenError("Só a equipe da abertodigital.")
  const I = require(`${__hooks}/ia.js`)
  const b = e.requestInfo().body || {}
  let emp
  try { emp = e.app.findRecordById("empresas", String(b.empresa || "")) } catch (er) { throw new NotFoundError("Empresa não encontrada.") }
  let perfil = {}
  try { perfil = JSON.parse(emp.getString("perfil") || "{}") || {} } catch (er) {}
  if (b.franquia === null || b.franquia === "") delete perfil.iaFranquia
  else {
    const n = parseInt(b.franquia, 10)
    if (!(n >= 0) || n > 1000000) throw new BadRequestError("Informe um número de 0 (sem limite) a 1.000.000.")
    perfil.iaFranquia = n
  }
  emp.set("perfil", perfil)
  e.app.save(emp)
  return e.json(200, { franquia: I.franquia(e.app, emp.id) })
}, $apis.requireAuth("users"))

/// <reference path="../pb_data/types.d.ts" />
// a cada 10 minutos: busca a foto de quem chegou pelo Instagram/Messenger e renova as de mais de 7 dias
cronAdd("fotos-perfil", "*/10 * * * *", () => {
  require(`${__hooks}/fotos.js`).rodada($app, 15)
})

// agência: roda uma leva agora (para testar e para os contatos antigos)
routerAdd("POST", "/api/abertocore/fotos/rodar", (e) => {
  const I = require(`${__hooks}/ia.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError()
  const n = require(`${__hooks}/fotos.js`).rodada($app, 25)
  return e.json(200, { ok: true, processados: n })
}, $apis.requireAuth("users"))

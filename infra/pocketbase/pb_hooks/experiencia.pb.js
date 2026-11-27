/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: chat com IA do "Link de experiência" (rota pública, sem login).
//   POST /api/experiencia/ia { n, nome, cidade, l, itens:[{nome,preco,cat}], msgs:[{de:'cli'|'ia', txt}] }
//   → { texto, limite }. A lógica e os limites ficam em experiencia.js.
routerAdd("POST", "/api/experiencia/ia", (e) => {
  const X = require(`${__hooks}/experiencia.js`)
  return e.json(200, X.responde($app, e.requestInfo().body || {}, e.realIP()))
})

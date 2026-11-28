/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: conhecimento da IA de atendimento, por empresa.
// tipo: afirmacao (fato que a IA pode usar) | argumento (o que dizer em cada situação) | aprendizado (registro do que se aprendeu)
// status: ativo (a IA usa) | proposto (a IA sugeriu, o dono decide) | pausado | recusado
// Só o servidor lê e grava; o app usa /api/abertocore/conhecimento.
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")
  const c = new Collection({
    type: "base",
    name: "conhecimento",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "tipo", required: true, values: ["afirmacao", "argumento", "aprendizado"], maxSelect: 1 },
      { type: "text", name: "codigo", max: 20 },
      { type: "select", name: "status", values: ["ativo", "proposto", "pausado", "recusado"], maxSelect: 1 },
      { type: "text", name: "quando", max: 400 },
      { type: "text", name: "texto", max: 3000 },
      { type: "text", name: "exemplo", max: 2000 },
      { type: "text", name: "condicao", max: 600 },
      { type: "bool", name: "pode_usar" },
      { type: "text", name: "origem", max: 200 },
      { type: "text", name: "fonte", max: 40 },
      { type: "text", name: "decidido_por", max: 120 },
      { type: "text", name: "decidido_em", max: 30 },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_conhecimento_empresa ON conhecimento (empresa, tipo, status)"],
  })
  app.save(c)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("conhecimento"))
})

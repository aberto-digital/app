/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: automações do Instagram (estilo ManyChat)
// gatilho: comentario (comentou no post) | story (respondeu ou mencionou no story) | dm (palavra na DM)
// Só o servidor lê e grava; o app usa /api/abertocore/automacoes.
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")
  const c = new Collection({
    type: "base",
    name: "automacoes",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "nome", max: 80 },
      { type: "bool", name: "ativo" },
      { type: "select", name: "gatilho", values: ["comentario", "story", "dm"], maxSelect: 1 },
      { type: "json", name: "posts", maxSize: 20000 },
      { type: "text", name: "palavras", max: 600 },
      { type: "text", name: "resposta_publica", max: 1500 },
      { type: "text", name: "mensagem", max: 1000 },
      { type: "json", name: "botoes", maxSize: 10000 },
      { type: "text", name: "etiqueta", max: 60 },
      { type: "number", name: "disparos", onlyInt: true },
      { type: "text", name: "ultimo", max: 40 },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_automacoes_empresa ON automacoes (empresa)"],
  })
  app.save(c)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("automacoes"))
})

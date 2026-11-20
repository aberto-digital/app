/// <reference path="../pb_data/types.d.ts" />
// Inscrições de notificação push de cada aparelho (um registro por navegador/app instalado).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const empresas = app.findCollectionByNameOrId("empresas")
  const dono = "@request.auth.id != '' && usuario = @request.auth.id"
  const c = new Collection({
    type: "base",
    name: "push_inscricoes",
    listRule: dono, viewRule: dono, createRule: null, updateRule: null, deleteRule: dono,
    fields: [
      { type: "relation", name: "usuario", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "endpoint", required: true, max: 1000 },
      { type: "text", name: "p256dh", required: true, max: 200, hidden: true },
      { type: "text", name: "auth", required: true, max: 100, hidden: true },
      { type: "text", name: "aparelho", max: 200 },
      { type: "json", name: "prefs" },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_push_endpoint ON push_inscricoes (endpoint)",
      "CREATE INDEX idx_push_empresa ON push_inscricoes (empresa)",
    ],
  })
  app.save(c)
}, (app) => { app.delete(app.findCollectionByNameOrId("push_inscricoes")) })

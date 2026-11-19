/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: e-mail como canal (Zoho Mail API, login OAuth; nenhuma senha de e-mail passa pelo app)
// - email_app: client_id e client_secret do app da Zoho (um registro só). Só o superusuário vê:
//   o client_secret é colado no painel do PocketBase, nunca no código.
migrate((app) => {
  const col = new Collection({
    type: "base",
    name: "email_app",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "select", name: "provedor", values: ["zoho"], maxSelect: 1 },
      { type: "text", name: "client_id", max: 200 },
      { type: "text", name: "client_secret", max: 300, hidden: true },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
  })
  app.save(col)
  const r = new Record(col)
  r.set("provedor", "zoho")
  app.save(r)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("email_app"))
})

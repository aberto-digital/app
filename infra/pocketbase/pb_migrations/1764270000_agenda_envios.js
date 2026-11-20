/// <reference path="../pb_data/types.d.ts" />
// Agendamento online: registro dos lembretes já enviados (um por evento + tipo + antecedência),
// para não mandar o mesmo lembrete duas vezes, mesmo se o servidor reiniciar.
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")
  const c = new Collection({
    type: "base",
    name: "agenda_envios",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "chave", required: true, max: 200 },
      { type: "autodate", name: "created", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_agenda_envios_chave ON agenda_envios (chave)"],
  })
  app.save(c)
}, (app) => { app.delete(app.findCollectionByNameOrId("agenda_envios")) })

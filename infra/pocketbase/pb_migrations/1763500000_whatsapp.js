/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: WhatsApp Cloud API (fase 3)
// - meta_app: segredos do app da Meta (um registro só). Só o superusuário vê.
// - canais: cada número de WhatsApp ligado a uma empresa. Só o superusuário vê;
//   o token de acesso nunca vai para o navegador.
// - contatos.wa_id: número do WhatsApp do contato (só dígitos, ex. 5511991233627).
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")

  const metaApp = new Collection({
    type: "base",
    name: "meta_app",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "text", name: "app_id", max: 40 },
      { type: "text", name: "app_secret", max: 200, hidden: true },
      { type: "text", name: "verify_token", max: 200, hidden: true },
      { type: "text", name: "versao_api", max: 10 },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
  })
  app.save(metaApp)

  const canais = new Collection({
    type: "base",
    name: "canais",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "tipo", required: true, values: ["whatsapp"], maxSelect: 1 },
      { type: "text", name: "phone_number_id", required: true, max: 40 },
      { type: "text", name: "waba_id", max: 40 },
      { type: "text", name: "numero", max: 30 },
      { type: "text", name: "access_token", max: 1000, hidden: true },
      { type: "bool", name: "ativo" },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_canais_phone ON canais (phone_number_id)",
      "CREATE INDEX idx_canais_empresa ON canais (empresa)",
    ],
  })
  app.save(canais)

  const contatos = app.findCollectionByNameOrId("contatos")
  contatos.fields.add(new TextField({ name: "wa_id", max: 30 }))
  contatos.indexes.push("CREATE INDEX idx_contatos_wa ON contatos (empresa, wa_id)")
  app.save(contatos)

  // registro único de configuração do app da Meta (sem segredos; o superusuário cola no painel)
  const r = new Record(metaApp)
  r.set("app_id", "2125617558075863")
  r.set("versao_api", "v25.0")
  app.save(r)
}, (app) => {
  const contatos = app.findCollectionByNameOrId("contatos")
  contatos.indexes = contatos.indexes.filter((i) => !i.includes("idx_contatos_wa"))
  contatos.fields.removeByName("wa_id")
  app.save(contatos)
  app.delete(app.findCollectionByNameOrId("canais"))
  app.delete(app.findCollectionByNameOrId("meta_app"))
})

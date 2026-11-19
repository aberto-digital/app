/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: Instagram Direct, Facebook Messenger e e-mail como canais
// - canais.tipo ganha "instagram", "messenger" e "email"
// - canais.page_id / ig_id / nome / conta: identificam a Página, o perfil do Instagram ou a caixa de e-mail
// - canais.refresh_token: e-mail (Zoho) renova o acesso sozinho; fica escondido como o access_token
// - phone_number_id deixa de ser obrigatório (só o WhatsApp usa) e o índice único passa a ignorar vazios
// - contatos.social_id: "ig:<id>", "fb:<id>" ou "em:<email>" do contato naquele canal
migrate((app) => {
  const canais = app.findCollectionByNameOrId("canais")
  const tipo = canais.fields.getByName("tipo")
  tipo.values = ["whatsapp", "instagram", "messenger", "email"]
  const pn = canais.fields.getByName("phone_number_id")
  pn.required = false
  canais.fields.add(new TextField({ name: "page_id", max: 40 }))
  canais.fields.add(new TextField({ name: "ig_id", max: 40 }))
  canais.fields.add(new TextField({ name: "nome", max: 120 }))
  canais.fields.add(new TextField({ name: "conta", max: 200 }))
  canais.fields.add(new TextField({ name: "refresh_token", max: 1000, hidden: true }))
  canais.fields.add(new JSONField({ name: "extra", maxSize: 20000 }))
  canais.indexes = canais.indexes.filter((i) => !i.includes("idx_canais_phone"))
  canais.indexes.push("CREATE UNIQUE INDEX idx_canais_phone ON canais (phone_number_id) WHERE phone_number_id != ''")
  canais.indexes.push("CREATE INDEX idx_canais_page ON canais (page_id)")
  canais.indexes.push("CREATE INDEX idx_canais_ig ON canais (ig_id)")
  app.save(canais)

  const contatos = app.findCollectionByNameOrId("contatos")
  contatos.fields.add(new TextField({ name: "social_id", max: 200 }))
  contatos.indexes.push("CREATE INDEX idx_contatos_social ON contatos (empresa, social_id)")
  app.save(contatos)

  // configurações do Login do Facebook para Empresas (ids públicos, sem segredo)
  const meta = app.findCollectionByNameOrId("meta_app")
  meta.fields.add(new TextField({ name: "config_whatsapp", max: 40 }))
  meta.fields.add(new TextField({ name: "config_social", max: 40 }))
  app.save(meta)
}, (app) => {
  const meta = app.findCollectionByNameOrId("meta_app")
  meta.fields.removeByName("config_whatsapp"); meta.fields.removeByName("config_social")
  app.save(meta)
  const contatos = app.findCollectionByNameOrId("contatos")
  contatos.indexes = contatos.indexes.filter((i) => !i.includes("idx_contatos_social"))
  contatos.fields.removeByName("social_id")
  app.save(contatos)
  const canais = app.findCollectionByNameOrId("canais")
  ;["page_id", "ig_id", "nome", "conta", "refresh_token", "extra"].forEach((n) => canais.fields.removeByName(n))
  canais.indexes = canais.indexes.filter((i) => !/idx_canais_(phone|page|ig)/.test(i))
  canais.indexes.push("CREATE UNIQUE INDEX idx_canais_phone ON canais (phone_number_id)")
  canais.fields.getByName("tipo").values = ["whatsapp"]
  canais.fields.getByName("phone_number_id").required = true
  app.save(canais)
})

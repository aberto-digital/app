/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: formulário e chat do site
//   canais_site: uma "chave" pública por site, ligada a uma empresa (só o servidor lê)
//   contatos.site_sessao: identifica a conversa do visitante no chat do site
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")
  const c = new Collection({
    type: "base",
    name: "canais_site",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "chave", required: true, max: 60 },
      { type: "text", name: "saudacao", max: 500 },
      { type: "bool", name: "ativo" },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_canais_site_chave ON canais_site (chave)"],
  })
  app.save(c)

  const contatos = app.findCollectionByNameOrId("contatos")
  contatos.fields.add(new TextField({ name: "site_sessao", max: 80, hidden: true }))
  contatos.indexes.push("CREATE INDEX idx_contatos_site_sessao ON contatos (site_sessao)")
  app.save(contatos)

  // site da própria abertodigital
  try {
    const ad = app.findFirstRecordByFilter("empresas", "nome = 'abertodigital'")
    const r = new Record(c)
    r.set("empresa", ad.id)
    r.set("chave", "abertodigital")
    r.set("saudacao", "Oi{nome}! Recebemos sua mensagem 🙂 A gente responde por aqui mesmo, em horário comercial (seg. a sex., 9h às 18h). Se preferir, deixe seu WhatsApp que a gente chama você lá.")
    r.set("ativo", true)
    app.save(r)
  } catch (e) {}
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("canais_site")) } catch (e) {}
  const contatos = app.findCollectionByNameOrId("contatos")
  contatos.fields.removeByName("site_sessao")
  contatos.indexes = contatos.indexes.filter((i) => i.indexOf("site_sessao") < 0)
  app.save(contatos)
})

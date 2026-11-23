/// <reference path="../pb_data/types.d.ts" />
// ia_config.fonte_url/fonte/fonte_em: base de conhecimento lida de abas publicadas da planilha (CSV)
// ia_uso.contato: id do contato, para saber o custo de IA por lead
migrate((app) => {
  const c = app.findCollectionByNameOrId("ia_config")
  if (!c.fields.getByName("fonte_url")) c.fields.add(new TextField({ name: "fonte_url", max: 2000 }))
  if (!c.fields.getByName("fonte")) c.fields.add(new TextField({ name: "fonte", max: 60000 }))
  if (!c.fields.getByName("fonte_em")) c.fields.add(new TextField({ name: "fonte_em", max: 40 }))
  app.save(c)
  const u = app.findCollectionByNameOrId("ia_uso")
  if (!u.fields.getByName("contato")) u.fields.add(new TextField({ name: "contato", max: 30 }))
  app.save(u)
}, (app) => {
  const c = app.findCollectionByNameOrId("ia_config")
  ;["fonte_url", "fonte", "fonte_em"].forEach((n) => c.fields.removeByName(n))
  app.save(c)
  const u = app.findCollectionByNameOrId("ia_uso")
  u.fields.removeByName("contato")
  app.save(u)
})

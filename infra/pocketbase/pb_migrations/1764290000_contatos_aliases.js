/// <reference path="../pb_data/types.d.ts" />
// contatos.aliases: outras identidades do mesmo contato depois de juntar conversas
// (ex.: " ig:123 wa:5511999998888 em:fulano@x.com "), para as próximas mensagens caírem no mesmo contato.
migrate((app) => {
  const c = app.findCollectionByNameOrId("contatos")
  if (!c.fields.getByName("aliases")) c.fields.add(new TextField({ name: "aliases", max: 4000 }))
  app.save(c)
}, (app) => {
  const c = app.findCollectionByNameOrId("contatos")
  c.fields.removeByName("aliases")
  app.save(c)
})

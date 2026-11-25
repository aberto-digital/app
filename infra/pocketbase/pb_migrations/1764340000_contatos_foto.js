/// <reference path="../pb_data/types.d.ts" />
// Foto de perfil dos contatos do Instagram e do Messenger (baixada pelo servidor; o link da Meta expira)
migrate((app) => {
  const c = app.findCollectionByNameOrId("contatos")
  c.fields.add(new FileField({ name: "foto", maxSelect: 1, maxSize: 3 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"], thumbs: ["96x96"], protected: false }))
  c.fields.add(new TextField({ name: "foto_em", max: 30 }))
  app.save(c)
}, (app) => {
  const c = app.findCollectionByNameOrId("contatos")
  c.fields.removeByName("foto"); c.fields.removeByName("foto_em")
  app.save(c)
})

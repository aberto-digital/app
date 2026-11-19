/// <reference path="../pb_data/types.d.ts" />
// IDs das configurações do Login do Facebook para Empresas (não são segredos)
migrate((app) => {
  const lista = app.findAllRecords("meta_app")
  for (const r of lista) {
    if (!r.getString("config_whatsapp")) r.set("config_whatsapp", "1840918180587097")
    if (!r.getString("config_social")) r.set("config_social", "1444992093891062")
    app.save(r)
  }
}, (app) => {})

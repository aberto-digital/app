/// <reference path="../pb_data/types.d.ts" />
// Mega Hair Marcela: número certo do WhatsApp (+1 561 817-5432)
migrate((app) => {
  try {
    const emp = app.findFirstRecordByFilter("empresas", "nome = 'Mega Hair Marcela'")
    let perfil = {}
    try { perfil = JSON.parse(emp.getString("perfil") || "{}") || {} } catch (e) {}
    perfil.whatsapp = "+1 (561) 817-5432"
    emp.set("perfil", perfil)
    app.save(emp)
  } catch (e) {}
}, (app) => {})

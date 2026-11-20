/// <reference path="../pb_data/types.d.ts" />
// A IA passou a continuar atendendo depois de chamar a equipe. Tira a pausa de 12h que a regra
// antiga deixou nas conversas de Instagram/Messenger/e-mail (os canais novos, ainda em teste).
migrate((app) => {
  let lista = []
  try { lista = app.findRecordsByFilter("contatos", "social_id != ''", "", 500, 0) } catch (e) { return }
  for (const r of lista) {
    let d
    try { d = JSON.parse(r.getString("dados") || "{}") } catch (e) { continue }
    if (!d.bot || d.bot.modo !== "humano") continue
    d.bot = { modo: "auto", ate: (d.bot.ate || 0) + 1 }
    r.set("dados", d)
    try { app.save(r) } catch (e) {}
  }
}, (app) => {})

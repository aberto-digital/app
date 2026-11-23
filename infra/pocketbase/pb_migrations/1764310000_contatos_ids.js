/// <reference path="../pb_data/types.d.ts" />
// Contatos já juntados: marca por quais canais dá para responder (dados.ids) e
// mostra o número do WhatsApp no card quando o telefone ficou vazio.
migrate((app) => {
  const fone = (n) => {
    const m = String(n || "").replace(/\D/g, "").match(/^55(\d{2})(\d{4,5})(\d{4})$/)
    return m ? "(" + m[1] + ") " + m[2] + "-" + m[3] : "+" + String(n || "").replace(/\D/g, "")
  }
  app.findRecordsByFilter("contatos", "aliases != ''", "", 0, 0).forEach((rec) => {
    let d = {}
    try { d = JSON.parse(rec.getString("dados") || "{}") || {} } catch (e) { return }
    const todos = [rec.getString("social_id")].concat((rec.getString("aliases") || "").split(" ")).filter(Boolean)
    const ids = []
    if (rec.getString("wa_id") || todos.some((x) => x.indexOf("wa:") === 0)) ids.push("wa")
    ;["ig", "fb", "em"].forEach((p) => { if (todos.some((x) => x.indexOf(p + ":") === 0)) ids.push(p) })
    d.ids = ids
    if (!d.tel && rec.getString("wa_id")) d.tel = fone(rec.getString("wa_id"))
    if (!rec.getString("telefone") && d.tel) rec.set("telefone", d.tel)
    rec.set("dados", d)
    app.save(rec)
  })
}, () => {})

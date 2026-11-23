/// <reference path="../pb_data/types.d.ts" />
// E-mails enviados lidos da pasta Enviados com o horário deslocado (+8 h): volta para o horário real.
migrate((app) => {
  const agora = Date.now()
  app.findRecordsByFilter("contatos", "dados ~ '\"wa\":\"em:'", "", 0, 0).forEach((rec) => {
    let d = {}
    try { d = JSON.parse(rec.getString("dados") || "{}") || {} } catch (e) { return }
    let mudou = false
    ;(d.msgs || []).forEach((m) => {
      if (m.de === "eq" && /^em:/.test(m.wa || "") && (m.ts || 0) > agora) { m.ts -= 8 * 3600000; mudou = true }
    })
    if (!mudou) return
    d.msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0))
    rec.set("dados", d)
    app.save(rec)
  })
}, () => {})

// Foto de perfil: busca na Meta (Instagram / Messenger), baixa e guarda no contato.
// O link que a Meta devolve expira em poucos dias, por isso o arquivo fica aqui.
const SEMANA = 7 * 86400000

function sidDe(rec, d) {
  const s = rec.getString("social_id") || d.social || ""
  if (/^(ig|fb):\d+$/.test(s)) return s
  const m = (" " + rec.getString("aliases") + " ").match(/ (ig|fb):(\d+) /)
  return m ? m[1] + ":" + m[2] : ""
}

function atualiza(app, rec) {
  const M = require(`${__hooks}/meta.js`)
  const W = require(`${__hooks}/wa.js`)
  const d = W.lerDados(rec)
  const sid = sidDe(rec, d)
  const marca = () => { rec.set("foto_em", new Date().toISOString()); app.save(rec) }
  if (!sid) return marca()
  const tipo = sid.indexOf("ig:") === 0 ? "instagram" : "messenger"
  const canal = M.canalDaEmpresaTipo(app, rec.getString("empresa"), tipo)
  if (!canal) return marca()
  let url = ""
  try { url = (M.graphGet(app, sid.slice(3), canal.getString("access_token"), { fields: "profile_pic" }) || {}).profile_pic || "" } catch (e) {}
  if (!url) return marca()
  let res = null
  try { res = $http.send({ url: url, method: "GET", timeout: 20 }) } catch (e) { return marca() }
  if (!res || res.statusCode !== 200 || !res.body || !res.body.length || res.body.length > 3 * 1024 * 1024) return marca()
  const tipoImg = String((res.headers && (res.headers["Content-Type"] || res.headers["content-type"])) || "").toLowerCase()
  const ext = /png/.test(tipoImg) ? "png" : /webp/.test(tipoImg) ? "webp" : "jpg"
  const f = $filesystem.fileFromBytes(res.body, "perfil." + ext)
  rec.set("foto", f)
  rec.set("foto_em", new Date().toISOString())
  app.save(rec)
  const d2 = W.lerDados(rec)
  d2.foto = "contatos/" + rec.id + "/" + rec.getString("foto")
  rec.set("dados", d2)
  app.save(rec)
}

// contatos sem foto ou com foto de mais de 7 dias, poucos por vez
function rodada(app, limite) {
  const lim = new Date(Date.now() - SEMANA).toISOString()
  let lista = []
  try {
    lista = app.findRecordsByFilter("contatos",
      "(social_id != '' || aliases ~ ' ig:' || aliases ~ ' fb:') && (foto_em = '' || foto_em < {:l})", "foto_em", limite || 15, 0, { l: lim })
  } catch (e) { return 0 }
  let n = 0
  lista.forEach((r) => { try { atualiza(app, r); n++ } catch (e) { try { r.set("foto_em", new Date().toISOString()); app.save(r) } catch (x) {} } })
  return n
}

module.exports = { atualiza, rodada }

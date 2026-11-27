// AbertoCore: regras das automações do Instagram (estilo ManyChat).
// Só lógica pura e acesso à coleção "automacoes"; o envio fica em meta.js.

function norm(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}
function palavras(a) {
  return String(a.getString("palavras") || "").split(/[,\n;]+/).map(norm).filter(Boolean)
}
// palavra vazia = qualquer texto; senão, alguma palavra aparece no texto (como palavra inteira)
function casa(a, texto) {
  const ps = palavras(a)
  if (!ps.length) return true
  const t = " " + norm(texto).replace(/[^a-z0-9 ]+/g, " ") + " "
  return ps.some((p) => t.indexOf(" " + p.replace(/[^a-z0-9 ]+/g, " ").trim() + " ") >= 0)
}
function postOk(a, mediaId) {
  let ps = []
  try { ps = JSON.parse(a.getString("posts") || "[]") || [] } catch (e) {}
  return !ps.length || ps.map(String).indexOf(String(mediaId)) >= 0
}
function ativas(app, empresaId, gatilho) {
  if (!require(`${__hooks}/atende.js`).recursoLigado(app, empresaId, "automacoes")) return []
  try { return app.findRecordsByFilter("automacoes", "empresa = {:e} && ativo = true && gatilho = {:g}", "created", 0, 0, { e: empresaId, g: gatilho }) } catch (e) { return [] }
}
function acha(app, empresaId, gatilho, texto, mediaId) {
  return ativas(app, empresaId, gatilho).find((a) => (gatilho !== "comentario" || postOk(a, mediaId)) && (gatilho === "story" || casa(a, texto))) || null
}
function botoes(a) {
  let b = []
  try { b = JSON.parse(a.getString("botoes") || "[]") || [] } catch (e) {}
  return b.filter((x) => x && x.t && x.r).slice(0, 3)
}
// mensagem da Meta: texto + até 3 botões de resposta rápida (payload auto:<id>:<i>)
function mensagem(a) {
  const m = { text: a.getString("mensagem") }
  const bs = botoes(a)
  if (bs.length) m.quick_replies = bs.map((x, i) => ({ content_type: "text", title: String(x.t).slice(0, 20), payload: "auto:" + a.id + ":" + i }))
  return m
}
function respostaPublica(a) {
  const vs = String(a.getString("resposta_publica") || "").split("\n").map((x) => x.trim()).filter(Boolean)
  return vs.length ? vs[Math.floor(Math.random() * vs.length)] : ""
}
function conta(app, a) {
  try {
    const r = app.findRecordById("automacoes", a.id)
    r.set("disparos", r.getInt("disparos") + 1)
    r.set("ultimo", new Date().toISOString())
    app.save(r)
  } catch (e) {}
}
// botão tocado: { a, texto }
function botao(app, payload) {
  const m = /^auto:([a-z0-9]+):(\d)$/.exec(String(payload || ""))
  if (!m) return null
  let a = null
  try { a = app.findRecordById("automacoes", m[1]) } catch (e) { return null }
  const b = botoes(a)[parseInt(m[2], 10)]
  return b ? { a: a, texto: String(b.r) } : null
}
function publica(a) {
  let posts = [], bs = []
  try { posts = JSON.parse(a.getString("posts") || "[]") || [] } catch (e) {}
  return {
    id: a.id, nome: a.getString("nome"), ativo: a.getBool("ativo"), gatilho: a.getString("gatilho"),
    posts: posts, palavras: a.getString("palavras"), resposta_publica: a.getString("resposta_publica"),
    mensagem: a.getString("mensagem"), botoes: botoes(a), etiqueta: a.getString("etiqueta"),
    disparos: a.getInt("disparos"), ultimo: a.getString("ultimo"),
  }
}

module.exports = { norm, casa, acha, mensagem, respostaPublica, conta, botao, publica, botoes }

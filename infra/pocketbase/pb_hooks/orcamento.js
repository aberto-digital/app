// AbertoCore: orçamento online (funções usadas por orcamento.pb.js)
//   Configuração em configuracoes.dados.orcamento: { ativo, slug, titulo, aviso, mostrarPrecos }
//   Catálogo: produtos com dados.orcavel = true (e ativo, e com estoque quando o estoque é controlado).
//   Aparência e endereço próprio vêm da configuração do agendamento (mesma marca).
const W = require(`${__hooks}/wa.js`)
const A = require(`${__hooks}/agenda.js`)
const PADRAO = { ativo: false, slug: "", titulo: "", aviso: "", mostrarPrecos: true }
const MAX_ITENS = 30, MAX_QTD = 99

function slugLimpo(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) }
function cfg(app, empresaId) {
  let rec = null
  try { rec = app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId }) } catch (e) {}
  const d = rec ? W.lerDados(rec) : {}
  const o = Object.assign({}, PADRAO, d.orcamento || {})
  if (!o.slug) o.slug = A.cfg(app, empresaId).slug || ""
  return o
}
// acha a empresa pelo endereço: vale o endereço do orçamento e, sem um, o do agendamento
function porSlug(app, slug) {
  slug = slugLimpo(slug)
  if (!slug) return null
  const L = app.findRecordsByFilter("configuracoes", "id != ''", "", 0, 0)
  for (let i = 0; i < L.length; i++) {
    const emp = L[i].getString("empresa"), o = cfg(app, emp)
    if (o.ativo && slugLimpo(o.slug) === slug) return { empresaId: emp, orc: o }
  }
  return null
}
// foto do produto: imagem pequena embutida ou https
function fotoPublica(f) {
  f = String(f || "")
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(f) && f.length <= 160000) return f
  if (/^https:\/\/[^\s"'<>]+$/.test(f) && f.length <= 500) return f
  return ""
}
function numero(v) { const n = Number(v); return v === null || v === undefined || v === "" || !isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100 }
function catalogo(app, empresaId, orc) {
  const L = app.findRecordsByFilter("produtos", "empresa = {:e}", "local_id", 0, 0, { e: empresaId })
  const out = [], mostra = !orc || orc.mostrarPrecos !== false
  L.forEach((r) => {
    const d = W.lerDados(r)
    if (!d.orcavel || d.ativo === false) return
    const est = d.estoque === null || d.estoque === undefined || d.estoque === "" ? null : Math.max(0, parseInt(d.estoque, 10) || 0)
    if (est === 0) return
    out.push({
      id: r.getInt("local_id"), nome: String(d.nome || r.getString("nome") || "").slice(0, 120), tipo: String(d.tipo || "").slice(0, 30),
      ds: String(d.ds || "").slice(0, 400), foto: fotoPublica(d.foto),
      setup: mostra ? numero(d.setup) : null, mensal: mostra ? numero(d.mensal) : null, estoque: est,
    })
  })
  return out
}
// itens = [{ id, qtd }]; devolve as linhas com o preço do cadastro (nunca o que veio do navegador)
function calcula(cat, itens) {
  if (!Array.isArray(itens) || !itens.length) throw new Error("Escolha pelo menos um item.")
  if (itens.length > MAX_ITENS) throw new Error("Itens demais no orçamento.")
  const porId = {}; cat.forEach((p) => { porId[p.id] = p })
  const vistos = {}, linhas = []
  let setup = 0, mensal = 0, itensN = 0
  itens.forEach((x) => {
    const p = porId[parseInt(x && x.id, 10)]
    if (!p) throw new Error("Um dos itens não está mais disponível.")
    if (vistos[p.id]) throw new Error("Item repetido.")
    vistos[p.id] = 1
    let q = Math.floor(Number(x.qtd) || 1)
    q = Math.max(1, Math.min(MAX_QTD, q))
    if (p.estoque !== null && q > p.estoque) throw new Error("Só temos " + p.estoque + " de " + p.nome + ".")
    linhas.push({ id: p.id, nome: p.nome, qtd: q, setup: p.setup, mensal: p.mensal })
    setup += (p.setup || 0) * q; mensal += (p.mensal || 0) * q; itensN += q
  })
  return { linhas: linhas, itens: itensN, setup: Math.round(setup * 100) / 100, mensal: Math.round(mensal * 100) / 100 }
}
function brl(v) { const p = Number(v || 0).toFixed(2).split("."); return "R$ " + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1] }
function textoPedido(c, mostrar) {
  const L = c.linhas.map((x) => "• " + x.qtd + "× " + x.nome + (mostrar && (x.setup || x.mensal) ? " (" + [x.setup ? brl(x.setup * x.qtd) : "", x.mensal ? brl(x.mensal * x.qtd) + "/mês" : ""].filter(Boolean).join(" + ") + ")" : ""))
  const t = []
  if (mostrar && c.setup) t.push("Implantação: " + brl(c.setup))
  if (mostrar && c.mensal) t.push("Mensalidade: " + brl(c.mensal))
  return L.join("\n") + (t.length ? "\n" + t.join(" · ") : "")
}
module.exports = { PADRAO, cfg, porSlug, catalogo, calcula, textoPedido, fotoPublica, brl }

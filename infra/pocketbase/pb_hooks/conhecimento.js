// AbertoCore: conhecimento da IA de atendimento (afirmações, argumentos e aprendizados), por empresa.
// Coleção "conhecimento". A IA só usa o que está "ativo"; a rotina de aprendizado só cria "proposto".

const TIPOS = ["afirmacao", "argumento", "aprendizado"]
const STATUS = ["ativo", "proposto", "pausado", "recusado"]

function publica(r) {
  return {
    id: r.id, tipo: r.getString("tipo"), codigo: r.getString("codigo"), status: r.getString("status"),
    quando: r.getString("quando"), texto: r.getString("texto"), exemplo: r.getString("exemplo"),
    condicao: r.getString("condicao"), pode_usar: r.getBool("pode_usar"), origem: r.getString("origem"),
    fonte: r.getString("fonte"), decidido_por: r.getString("decidido_por"), decidido_em: r.getString("decidido_em"),
    atualizado: r.getString("updated"),
  }
}

function lista(app, empresaId) {
  try { return app.findRecordsByFilter("conhecimento", "empresa = {:e}", "-updated", 0, 0, { e: empresaId }) } catch (e) { return [] }
}

// Texto que entra no prompt da IA: só o que está ativo. Afirmação com "Pode usar? = Não" vira proibição.
function paraPrompt(app, empresaId) {
  const rs = lista(app, empresaId).filter((r) => r.getString("status") === "ativo")
  const af = rs.filter((r) => r.getString("tipo") === "afirmacao").sort((a, b) => a.getString("codigo") < b.getString("codigo") ? -1 : 1)
  const ar = rs.filter((r) => r.getString("tipo") === "argumento").sort((a, b) => a.getString("codigo") < b.getString("codigo") ? -1 : 1)
  const partes = []
  if (af.length) {
    partes.push("AFIRMAÇÕES (fatos aprovados; \"PROIBIDO\" = nunca diga):\n" + af.map((r) =>
      (r.getBool("pode_usar") ? "" : "PROIBIDO: ") + r.getString("texto") + (r.getString("condicao") ? " [condição: " + r.getString("condicao") + "]" : "")).join("\n"))
  }
  if (ar.length) {
    partes.push("ARGUMENTOS APROVADOS (use quando a situação bater; não despeje vários de uma vez):\n" + ar.map((r) =>
      "Quando: " + r.getString("quando") + " | Argumento: " + r.getString("texto") + (r.getString("exemplo") ? " | Exemplo: " + r.getString("exemplo") : "")).join("\n"))
  }
  return partes.join("\n\n").slice(0, 20000)
}

// true se a empresa já importou a planilha: aí a planilha deixa de ser lida (evita duplicar)
function temImportada(app, empresaId) {
  try { return app.findRecordsByFilter("conhecimento", "empresa = {:e} && fonte = 'planilha'", "", 1, 0, { e: empresaId }).length > 0 } catch (e) { return false }
}

function norm(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim() }

// Lê as abas publicadas em CSV (Afirmações, Argumentos, Aprendizados) e grava, sem duplicar: o código (A01, G01...) identifica.
function importaPlanilha(app, empresaId, urls, quem) {
  const I = require(`${__hooks}/ia.js`)
  const col = app.findCollectionByNameOrId("conhecimento")
  const existentes = {}
  lista(app, empresaId).forEach((r) => {
    if (r.getString("tipo") === "aprendizado") existentes["aprendizado:" + norm(r.getString("texto")).slice(0, 80)] = r
    else if (r.getString("codigo")) existentes[r.getString("tipo") + ":" + r.getString("codigo")] = r
  })
  const cont = { afirmacao: 0, argumento: 0, aprendizado: 0, ignoradas: 0, repetidas: 0, notas: 0 }
  const vistos = []
  urls.forEach((u) => {
    const res = $http.send({ url: u, method: "GET", timeout: 20 })
    if (res.statusCode >= 300) throw new Error("Não consegui ler a planilha (HTTP " + res.statusCode + "). Confira se a aba está publicada na web.")
    let txt = ""
    try { txt = toString(res.body) } catch (e) { txt = String(res.raw || "") }
    if (/^\s*<!DOCTYPE|<html/i.test(txt)) throw new Error("O link não devolveu CSV. Publique a aba como \"Valores separados por vírgula (.csv)\".")
    const rows = I.csvLinhas(txt)
    if (rows.length < 2) return
    const cab = rows[0].map(norm)
    const ix = (re) => cab.findIndex((c) => re.test(c))
    const iId = ix(/^id$/), iSt = ix(/^status/), iQ = ix(/^quando/), iArg = ix(/^argumento/), iEx = ix(/^exemplo/)
    const iAf = ix(/^afirmacao/), iPode = ix(/^pode usar/), iCond = ix(/^condicao/)
    const iData = ix(/^data$/), iLic = ix(/^licao/), iO = ix(/^o que aconteceu/), iAj = ix(/^ajuste/), iLead = ix(/^lead/)
    let tipo = ""
    if (iArg >= 0 && iQ >= 0) tipo = "argumento"
    else if (iAf >= 0 && iPode >= 0) tipo = "afirmacao"
    else if (iLic >= 0 && iO >= 0) tipo = "aprendizado"
    else { cont.ignoradas++; return }
    const sig = tipo + "|" + rows.slice(0, 3).join("|")
    if (vistos.indexOf(sig) >= 0) { cont.repetidas++; return } // aba não publicada: o Google devolve a mesma de novo
    vistos.push(sig)
    rows.slice(1).forEach((r, n) => {
      const v = (i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : "")
      let codigo = v(iId), texto = "", quando = "", exemplo = "", condicao = "", status = "ativo", pode = true, origem = ""
      if (tipo === "argumento") {
        texto = v(iArg); quando = v(iQ); exemplo = v(iEx)
        const s = norm(v(iSt)); status = s === "proposto" ? "proposto" : s === "pausado" ? "pausado" : s === "recusado" || s === "rascunho" ? (s === "rascunho" ? "proposto" : "recusado") : "ativo"
      } else if (tipo === "afirmacao") {
        texto = v(iAf); condicao = v(iCond); pode = norm(v(iPode)) !== "nao"
      } else {
        texto = v(iLic); quando = v(iO).slice(0, 400); exemplo = v(iAj); origem = [v(iData), v(iLead)].filter(Boolean).join(" ").slice(0, 200)
        codigo = ""
      }
      if (!texto) return
      // linha de observação no fim da aba (sem ID e sem "Pode usar?"): não é afirmação
      if (tipo === "afirmacao" && !codigo && !v(iPode)) { cont.notas++; return }
      let rec = tipo === "aprendizado" ? existentes["aprendizado:" + norm(texto).slice(0, 80)] : (codigo ? existentes[tipo + ":" + codigo] : null)
      if (!rec) { rec = new Record(col); rec.set("empresa", empresaId); rec.set("tipo", tipo); rec.set("codigo", codigo.slice(0, 20)) }
      rec.set("status", status); rec.set("texto", texto.slice(0, 3000)); rec.set("quando", quando.slice(0, 400))
      rec.set("exemplo", exemplo.slice(0, 2000)); rec.set("condicao", condicao.slice(0, 600)); rec.set("pode_usar", pode)
      rec.set("origem", origem); rec.set("fonte", "planilha"); rec.set("decidido_por", quem || ""); rec.set("decidido_em", new Date().toISOString())
      app.save(rec)
      cont[tipo]++
    })
  })
  return cont
}

module.exports = { TIPOS, STATUS, publica, lista, paraPrompt, temImportada, importaPlanilha }

// AbertoCore: agendamento online (funções usadas por agenda.pb.js)
//   Configuração em configuracoes.dados.agenda:
//   { ativo, slug, confirmacao:'auto'|'manual', dias:{"0".."6":[{ini:"09:00",fim:"18:00"}]}, passo:30, intervalo:0,
//     antecedenciaH:2, limiteDias:30, duracaoPadrao:60, lembretesCliente:[1440,120], lembretesDono:[60], titulo, aviso }
//   Serviços: produtos com dados.agendavel = true (duração em dados.dur, minutos).
//   Eventos criados aqui usam local_id a partir de 1.000.000 para não colidir com os criados no app.
const W = require(`${__hooks}/wa.js`)
const FUSO = -3 // America/Sao_Paulo (sem horário de verão)
const PADRAO = {
  ativo: false, slug: "", confirmacao: "auto", passo: 30, intervalo: 0, antecedenciaH: 2, limiteDias: 30, duracaoPadrao: 60,
  dias: { "1": [{ ini: "09:00", fim: "18:00" }], "2": [{ ini: "09:00", fim: "18:00" }], "3": [{ ini: "09:00", fim: "18:00" }], "4": [{ ini: "09:00", fim: "18:00" }], "5": [{ ini: "09:00", fim: "18:00" }], "6": [{ ini: "09:00", fim: "13:00" }] },
  lembretesCliente: [1440, 120], lembretesDono: [60], titulo: "", aviso: "",
}

function cfg(app, empresaId) {
  let rec = null
  try { rec = app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId }) } catch (e) {}
  const d = rec ? W.lerDados(rec) : {}
  return Object.assign({}, PADRAO, d.agenda || {})
}
function porSlug(app, slug) {
  slug = String(slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60)
  if (!slug) return null
  const L = app.findRecordsByFilter("configuracoes", "id != ''", "", 0, 0)
  for (let i = 0; i < L.length; i++) {
    const a = (W.lerDados(L[i]).agenda) || {}
    if (a.ativo && String(a.slug || "").toLowerCase() === slug) return { empresaId: L[i].getString("empresa"), ag: Object.assign({}, PADRAO, a) }
  }
  return null
}
function nomeEmpresa(app, empresaId) {
  try {
    const e = app.findRecordById("empresas", empresaId)
    let p = {}; try { p = JSON.parse(e.getString("perfil") || "{}") || {} } catch (x) {}
    return { nome: p.empresa || e.getString("nome"), whatsapp: p.whatsapp || "", site: p.site || "", responsavel: p.responsavel || "" }
  } catch (e) { return { nome: "", whatsapp: "", site: "", responsavel: "" } }
}
function servicos(app, empresaId, ag) {
  const L = app.findRecordsByFilter("produtos", "empresa = {:e}", "local_id", 0, 0, { e: empresaId })
  const out = []
  L.forEach((r) => {
    const d = W.lerDados(r)
    if (d.ativo === false || !d.agendavel) return
    out.push({ id: r.getInt("local_id"), nome: d.nome || r.getString("nome"), dur: Math.max(10, parseInt(d.dur, 10) || ag.duracaoPadrao || 60), preco: d.setup == null ? null : d.setup, ds: String(d.ds || "").slice(0, 300) })
  })
  if (!out.length) out.push({ id: 0, nome: ag.titulo || "Atendimento", dur: ag.duracaoPadrao || 60, preco: null, ds: "" })
  return out
}
function min(h) { const p = String(h || "0:0").split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0) }
function hhmm(m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0") }
function agoraSP() { return new Date(Date.now() + FUSO * 3600000) } // usar getUTC*
function hojeSP() { return agoraSP().toISOString().slice(0, 10) }
function addDias(iso, n) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
function tsDe(data, hora) { return Date.parse(data + "T" + (hora || "00:00") + ":00Z") - FUSO * 3600000 }

function ocupados(app, empresaId, data, ag) {
  const L = app.findRecordsByFilter("eventos", "empresa = {:e} && data = {:d}", "", 0, 0, { e: empresaId, d: data })
  return L.map((r) => W.lerDados(r)).filter((d) => d.hora && d.status !== "cancelado" && d.status !== "recusado")
    .map((d) => { const i = min(d.hora); return [i, i + (parseInt(d.dur, 10) || ag.duracaoPadrao || 60) + (ag.intervalo || 0)] })
}
function horarios(app, empresaId, ag, data, dur) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return []
  const hoje = hojeSP()
  if (data < hoje || data > addDias(hoje, ag.limiteDias || 30)) return []
  const dow = new Date(data + "T12:00:00Z").getUTCDay()
  const janelas = (ag.dias && ag.dias[String(dow)]) || []
  const busy = ocupados(app, empresaId, data, ag)
  const limiteTs = Date.now() + (ag.antecedenciaH || 0) * 3600000
  const passo = Math.max(10, ag.passo || 30), out = []
  janelas.forEach((j) => {
    for (let t = min(j.ini); t + dur <= min(j.fim); t += passo) {
      if (tsDe(data, hhmm(t)) < limiteTs) continue
      const fim = t + dur + (ag.intervalo || 0)
      if (busy.some((b) => t < b[1] && fim > b[0])) continue
      out.push(hhmm(t))
    }
  })
  return out
}
function diasLivres(app, empresaId, ag, dur) {
  const hoje = hojeSP(), out = []
  for (let i = 0; i <= (ag.limiteDias || 30); i++) {
    const d = addDias(hoje, i), dow = new Date(d + "T12:00:00Z").getUTCDay()
    if (!((ag.dias && ag.dias[String(dow)]) || []).length) continue
    if (horarios(app, empresaId, ag, d, dur).length) out.push(d)
  }
  return out
}
function proximoEventoId(app, empresaId) {
  const L = app.findRecordsByFilter("eventos", "empresa = {:e} && local_id >= 1000000", "-local_id", 1, 0, { e: empresaId })
  return L.length ? L[0].getInt("local_id") + 1 : 1000000
}
function token() { return $security.randomString(24) }
function dataBonita(data) {
  const d = new Date(data + "T12:00:00Z")
  const sem = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][d.getUTCDay()]
  return sem + ", " + d.getUTCDate() + "/" + String(d.getUTCMonth() + 1).padStart(2, "0")
}
function linkCancelar(tok) { return "https://app.abertodigital.com/agendar/?cancelar=" + tok }

// e-mail para o cliente pelo e-mail conectado da empresa (Zoho). Sem e-mail conectado, não envia.
function emailCliente(app, empresaId, para, assunto, texto) {
  if (!para || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)) return false
  const M = require(`${__hooks}/meta.js`), E = require(`${__hooks}/email.js`)
  const canal = M.canalDaEmpresaTipo(app, empresaId, "email")
  if (!canal) return false
  let assinatura = ""
  try { assinatura = String((W.lerDados(app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId })).email || {}).assinatura || "") } catch (e) {}
  try { E.envia(app, canal, para, assunto, texto, "", assinatura); return true }
  catch (e) { app.logger().warn("agenda: e-mail não saiu", "erro", String(e)); return false }
}
// WhatsApp só se o número da empresa estiver conectado e a conversa estiver aberta (cliente escreveu nas últimas 24h)
function whatsCliente(app, empresaId, contatoRec, texto) {
  const canal = W.canalDaEmpresa(app, empresaId)
  if (!canal || !contatoRec) return false
  const d = W.lerDados(contatoRec)
  const ult = (d.msgs || []).filter((m) => m.de === "cli" && m.wa && String(m.wa).indexOf("wamid") === 0).reduce((a, m) => Math.max(a, m.ts || 0), 0)
  if (!ult || Date.now() - ult > 23.5 * 3600000) return false
  try {
    let num = W.digitos(d.tel); if (num.length === 10 || num.length === 11) num = "55" + num
    W.enviaTexto(app, canal, num, texto)
    d.msgs = W.unirMsgs(d.msgs, [{ de: "bot", txt: texto, ts: Date.now() }])
    contatoRec.set("dados", d); app.save(contatoRec)
    return true
  } catch (e) { app.logger().warn("agenda: WhatsApp não saiu", "erro", String(e)); return false }
}
function jaEnviou(app, empresaId, chave) {
  try { app.findFirstRecordByFilter("agenda_envios", "chave = {:c}", { c: chave }); return true } catch (e) {}
  try { const r = new Record(app.findCollectionByNameOrId("agenda_envios")); r.set("empresa", empresaId); r.set("chave", chave); app.save(r); return false }
  catch (e) { return true } // outra execução gravou primeiro
}
function antecedenciaTxt(m) { return m >= 1440 && m % 1440 === 0 ? (m / 1440 === 1 ? "amanhã" : "em " + m / 1440 + " dias") : m >= 60 && m % 60 === 0 ? "em " + m / 60 + (m === 60 ? " hora" : " horas") : "em " + m + " minutos" }

module.exports = { PADRAO, cfg, porSlug, nomeEmpresa, servicos, horarios, diasLivres, proximoEventoId, token, dataBonita, linkCancelar, emailCliente, whatsCliente, jaEnviou, antecedenciaTxt, tsDe, hojeSP, addDias, min, hhmm }

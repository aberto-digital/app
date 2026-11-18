// AbertoCore: formulário e chat do site (funções usadas por site.pb.js)
const W = require(`${__hooks}/wa.js`)

function canal(app, chave) {
  try {
    const c = app.findFirstRecordByFilter("canais_site", "chave = {:c} && ativo = true", { c: String(chave || "").slice(0, 60) })
    return c
  } catch (e) { throw new NotFoundError("Site não encontrado.") }
}

// limite simples por chave (IP + ação) usando o armazenamento em memória do servidor
function limita(app, chave, max, janelaMs) {
  const st = app.store()
  const agora = Date.now()
  let v = st.get("lim:" + chave)
  if (!v || agora - v.ini > janelaMs) v = { ini: agora, n: 0 }
  v.n++
  st.set("lim:" + chave, v)
  if (v.n > max) throw new TooManyRequestsError("Muitas mensagens em pouco tempo. Tente de novo em alguns minutos.")
}

function limpa(t, max) { return String(t == null ? "" : t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) }

function proximoId(app, empresaId) {
  let maior = 0
  const ids = app.findRecordsByFilter("contatos", "empresa = {:e}", "-local_id", 1, 0, { e: empresaId })
  if (ids.length) maior = ids[0].getInt("local_id")
  try {
    const c = W.lerDados(app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId }))
    if (c.prox && c.prox.c) maior = Math.max(maior, c.prox.c - 1)
  } catch (e) {}
  return maior + 1
}

function novoContato(app, empresaId, o) {
  const col = app.findCollectionByNameOrId("contatos")
  const id = proximoId(app, empresaId)
  const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
  const rec = new Record(col)
  rec.set("empresa", empresaId)
  rec.set("local_id", id)
  rec.set("nome", o.nome)
  rec.set("telefone", o.tel || "")
  rec.set("canal", o.canal)
  rec.set("etapa", "Novo contato")
  rec.set("dados", {
    id: id, nome: o.nome, negocio: o.negocio || "", canal: o.canal, tipo: "Lead", etapa: "Novo contato", valor: 0,
    followup: null, status: "entrada", tel: o.tel || "", origem: o.origem || "Site", nota: o.nota || "", naoLidas: 0,
    criado: hoje, criadoTs: Date.now(), msgs: [],
  })
  return rec
}

function telefone(t) {
  let d = W.digitos(t)
  if (d.length === 12 || d.length === 13) d = d.slice(2)
  if (d.length !== 10 && d.length !== 11) return ""
  return "(" + d.slice(0, 2) + ") " + (d.length === 11 ? d.slice(2, 7) + "-" + d.slice(7) : d.slice(2, 6) + "-" + d.slice(6))
}

function acharPorTelefone(app, empresaId, tel) {
  if (!tel) return null
  const todos = app.findRecordsByFilter("contatos", "empresa = {:e} && telefone != ''", "", 0, 0, { e: empresaId })
  for (let i = 0; i < todos.length; i++) if (W.mesmoNumero(todos[i].getString("telefone"), tel)) return todos[i]
  return null
}

function chegou(rec, txt, de) {
  const d = W.lerDados(rec)
  const ultimo = (d.msgs || []).reduce((x, y) => Math.max(x, y.ts || 0), 0)
  const ts = Math.max(Date.now(), ultimo + 1)
  d.msgs = (d.msgs || []).concat([{ de: de || "cli", txt: txt, ts: ts, k: "s" + ts.toString(36) + Math.random().toString(36).slice(2, 6) }])
  if (!de || de === "cli") {
    d.naoLidas = (d.naoLidas || 0) + 1
    if (d.status !== "entrada") d.status = "entrada"
  }
  rec.set("dados", d)
  return d
}

function avisaEquipe(app, empresaId, txt, localId) {
  try {
    const col = app.findCollectionByNameOrId("ia_chat")
    const r = new Record(col)
    r.set("empresa", empresaId); r.set("de", "ia"); r.set("autor", ""); r.set("tipo", "aviso")
    r.set("txt", txt); r.set("contato", localId || 0); r.set("ts", Date.now())
    app.save(r)
  } catch (e) { app.logger().warn("site: não consegui avisar no chat interno", "erro", String(e)) }
}

// o que o visitante pode ver da conversa
function msgsPublicas(rec) {
  const d = W.lerDados(rec)
  return (d.msgs || []).filter((m) => m.de === "cli" || m.de === "eq" || m.de === "bot" || m.de === "ia")
    .map((m) => ({ de: m.de === "cli" ? "cli" : "eq", txt: m.txt, ts: m.ts }))
}

module.exports = { canal, limita, limpa, novoContato, telefone, acharPorTelefone, chegou, avisaEquipe, msgsPublicas }

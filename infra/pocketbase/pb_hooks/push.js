// AbertoCore: notificações push. Quem cifra e envia é o serviço ad-push (Web Push/VAPID).
const SVC = () => $os.getenv("ABERTOCORE_PUSH_URL") || "http://ad-push:3000"

function chavePublica() {
  const res = $http.send({ url: SVC() + "/chave", method: "GET", timeout: 5 })
  if (res.statusCode !== 200 || !res.json || !res.json.publicKey) throw new Error("Serviço de notificações indisponível.")
  return res.json.publicKey
}

// tipo: "mensagem" (cliente escreveu) ou "ia" (avisos do Assistente). Cada aparelho pode desligar um dos dois.
function notifica(app, empresaId, tipo, mensagem) {
  let inscs = []
  try { inscs = app.findRecordsByFilter("push_inscricoes", "empresa = {:e}", "", 200, 0, { e: empresaId }) } catch (e) { return 0 }
  inscs = inscs.filter((r) => { let p = {}; try { p = JSON.parse(r.getString("prefs") || "{}") || {} } catch (e) {} return p[tipo] !== false })
  if (!inscs.length) return 0
  let res
  try {
    res = $http.send({
      url: SVC() + "/envia", method: "POST", timeout: 8,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inscricoes: inscs.map((r) => ({ endpoint: r.getString("endpoint"), p256dh: r.getString("p256dh"), auth: r.getString("auth") })),
        mensagem: mensagem,
      }),
    })
  } catch (e) { app.logger().warn("push: serviço fora do ar", "erro", String(e)); return 0 }
  const j = res.json || {}
  ;(j.expiradas || []).forEach((ep) => {
    try { app.delete(app.findFirstRecordByFilter("push_inscricoes", "endpoint = {:p}", { p: ep })) } catch (e) {}
  })
  return j.enviadas || 0
}

function lerDados(rec) { try { return JSON.parse(rec.getString("dados") || "{}") || {} } catch (e) { return {} } }

function ultimaDoCliente(d) {
  const ms = ((d && d.msgs) || []).filter((m) => m.de === "cli")
  return ms.length ? ms[ms.length - 1] : null
}

// chamada pelos hooks de contatos: avisa se chegou mensagem nova do cliente
function avisaMensagemNova(app, rec, antes) {
  const d = lerDados(rec)
  if (d.ignorado) return // contato ignorado: sem aviso
  const nova = ultimaDoCliente(d)
  if (!nova || !nova.ts || Date.now() - nova.ts > 10 * 60000) return
  const velha = antes ? ultimaDoCliente(lerDados(antes)) : null
  if (velha && (velha.ts || 0) >= nova.ts) return
  const txt = String(nova.txt || "").replace(/^Assunto: /, "").replace(/\s+/g, " ").trim()
  notifica(app, rec.getString("empresa"), "mensagem", {
    titulo: (d.nome || "Novo contato") + (d.canal ? " · " + d.canal : ""),
    corpo: txt.length > 160 ? txt.slice(0, 157) + "…" : (txt || "Nova mensagem"),
    url: "/#mensagens",
    tag: "c" + rec.getInt("local_id"),
    contato: rec.getInt("local_id"),
  })
}

module.exports = { chavePublica, notifica, avisaMensagemNova }

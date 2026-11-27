/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: juntar dois contatos da mesma pessoa (ex.: Instagram + WhatsApp + e-mail) numa conversa só.
//   POST /api/abertocore/contatos/juntar { manter: local_id, juntar: local_id }
// As mensagens viram uma linha do tempo única, as identidades (Instagram, WhatsApp, e-mail) passam para
// o contato mantido — as próximas mensagens de qualquer canal caem nele — e o outro contato é apagado.
routerAdd("POST", "/api/abertocore/contatos/juntar", (e) => {
  const W = require(`${__hooks}/wa.js`)
  // (no PocketBase, a rota não enxerga funções declaradas fora dela)
  function foneBR(n) {
    const m = String(n || "").replace(/\D/g, "").match(/^55(\d{2})(\d{4,5})(\d{4})$/)
    return m ? "(" + m[1] + ") " + m[2] + "-" + m[3] : "+" + String(n || "").replace(/\D/g, "")
  }

  // canais pelos quais dá para responder este contato (para o app oferecer a escolha)
  function identidades(rec) {
    const todos = [rec.getString("social_id")].concat((rec.getString("aliases") || "").split(" ")).filter(Boolean)
    const ids = []
    if (rec.getString("wa_id") || todos.some((x) => x.indexOf("wa:") === 0)) ids.push("wa")
    ;["ig", "fb", "em"].forEach((p) => { if (todos.some((x) => x.indexOf(p + ":") === 0)) ids.push(p) })
    return ids
  }
  const empresaId = e.auth.getString("empresa")
  const b = e.requestInfo().body || {}
  const idA = parseInt(b.manter, 10) || 0, idB = parseInt(b.juntar, 10) || 0
  if (!idA || !idB || idA === idB) throw new BadRequestError("Escolha dois contatos diferentes.")
  let A, B
  try {
    A = e.app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: idA })
    B = e.app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: idB })
  } catch (x) { throw new NotFoundError("Contato não encontrado.") }

  const da = W.lerDados(A), db = W.lerDados(B)
  const generico = (n) => !n || /^(Instagram|Facebook) \d{4}$/.test(n) || /@/.test(n)
  // dados: o mantido vale; o que estiver vazio vem do outro
  if (generico(da.nome) && !generico(db.nome)) da.nome = db.nome
  ;["negocio", "tel", "wa", "email", "usuario", "followup", "endereco", "site", "empresa", "lead", "lig"].forEach((k) => { if (!da[k] && db[k]) da[k] = db[k] })
  if (!da.usuario && db.lead && db.lead.insta) da.usuario = String(db.lead.insta).replace(/^@/, "")
  if (db.nota && db.nota !== da.nota) da.nota = [da.nota, db.nota].filter(Boolean).join("\n")
  if ((db.valor || 0) > (da.valor || 0)) da.valor = db.valor
  if (db.tipo === "Cliente") da.tipo = "Cliente"
  da.naoLidas = (da.naoLidas || 0) + (db.naoLidas || 0)
  da.msgs = W.unirMsgs(da.msgs || [], db.msgs || []).sort((x, y) => (x.ts || 0) - (y.ts || 0))
  // ninguém respondeu ainda: o contato juntado continua na Prospecção
  if (!da.msgs.some((m) => m.de === "cli") && (da.prospeccao || db.prospeccao || da.status === "prospeccao" || db.status === "prospeccao")) { da.status = "prospeccao"; da.prospeccao = true }
  da.msgs.push({ de: "sis", txt: "Conversa de " + (db.canal || "outro canal") + " juntada a este contato.", ts: Date.now() })
  const canais = [].concat(da.canais || [da.canal], db.canais || [db.canal]).filter((v, i, a) => v && a.indexOf(v) === i)
  da.canais = canais
  if ((db.criadoTs || 0) && (db.criadoTs < (da.criadoTs || Infinity))) { da.criadoTs = db.criadoTs; da.criado = db.criado }

  // identidades: o que o mantido não tem vai para a coluna; o resto vira apelido (aliases)
  const ali = new Set((A.getString("aliases") || "").split(" ").filter(Boolean).concat((B.getString("aliases") || "").split(" ").filter(Boolean)))
  const sa = A.getString("social_id"), sb = B.getString("social_id")
  if (sb) { if (!sa) { A.set("social_id", sb); da.social = sb } else if (sb !== sa) ali.add(sb) }
  const wa = A.getString("wa_id"), wb = B.getString("wa_id")
  if (wb) { if (!wa) A.set("wa_id", wb); else if (wb !== wa) ali.add("wa:" + wb) }
  if (!A.getString("telefone") && B.getString("telefone")) A.set("telefone", B.getString("telefone"))
  if (!A.getString("site_sessao") && B.getString("site_sessao")) A.set("site_sessao", B.getString("site_sessao"))
  A.set("aliases", ali.size ? " " + Array.from(ali).join(" ") + " " : "")
  // telefone visível no card: se só havia o número do WhatsApp, mostra ele
  const W2 = A.getString("wa_id")
  if (!da.tel && W2) da.tel = foneBR(W2)
  if (!A.getString("telefone") && da.tel) A.set("telefone", da.tel)
  da.ids = identidades(A)
  A.set("nome", da.nome)
  A.set("dados", da)

  e.app.runInTransaction((tx) => {
    tx.save(A)
    // compromissos do contato juntado passam para o mantido
    tx.findRecordsByFilter("eventos", "empresa = {:e}", "", 0, 0, { e: empresaId }).forEach((ev) => {
      const dv = W.lerDados(ev)
      if (dv.contato === idB) { dv.contato = idA; ev.set("dados", dv); tx.save(ev) }
    })
    tx.delete(B)
  })
  return e.json(200, { ok: true, contato: da })
}, $apis.requireAuth("users"))

/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: transcrever áudio recebido (WhatsApp, Instagram, Messenger) com o Gemini da empresa.
//   POST /api/abertocore/transcrever { contato: local_id, msg: id da mensagem na Meta }
//   Grava o texto em msg.transcricao e devolve { texto }. A transcrição em si fica em transcreve.js.
routerAdd("POST", "/api/abertocore/transcrever", (e) => {
  const T = require(`${__hooks}/transcreve.js`)
  const W = require(`${__hooks}/wa.js`)
  const auth = e.auth, empresaId = auth.getString("empresa")
  const b = e.requestInfo().body || {}
  let rec
  try { rec = e.app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: parseInt(b.contato, 10) || 0 }) }
  catch (x) { throw new NotFoundError("Contato não encontrado.") }
  const d = W.lerDados(rec)
  const m = (d.msgs || []).filter((x) => x.wa && x.wa === String(b.msg || ""))[0]
  if (!m || !m.audio) throw new BadRequestError("Esta mensagem não tem áudio para transcrever.")
  if (m.transcricao) return e.json(200, { texto: m.transcricao })
  let texto
  try { texto = T.transcrever(e.app, empresaId, m) }
  catch (x) { throw new BadRequestError(String(x.message || x)) }

  const atual = e.app.findRecordById("contatos", rec.id), dd = W.lerDados(atual)
  ;(dd.msgs || []).forEach((x) => { if (x.wa === m.wa) x.transcricao = texto })
  atual.set("dados", dd)
  e.app.save(atual)
  return e.json(200, { texto: texto })
}, $apis.requireAuth("users"))

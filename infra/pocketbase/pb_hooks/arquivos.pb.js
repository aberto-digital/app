/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: envia um arquivo da empresa (biblioteca, PDF da auditoria ou da proposta) para um contato,
// pelo canal da conversa: WhatsApp (documento/imagem), Instagram/Messenger (anexo) ou e-mail (link no corpo).
//   POST /api/abertocore/arquivo/enviar  { contato: local_id, arquivo: id, texto?, k? }

routerAdd("POST", "/api/abertocore/arquivo/enviar", (e) => {
  const W = require(`${__hooks}/wa.js`)
  const M = require(`${__hooks}/meta.js`)
  const E = require(`${__hooks}/email.js`)
  const PUB = $os.getenv("ABERTOCORE_PUBLIC_URL") || "https://api.abertodigital.com"

  const empresaId = e.auth.getString("empresa")
  const b = e.requestInfo().body || {}
  const localId = parseInt(b.contato, 10)
  const texto = String(b.texto || "").trim().slice(0, 1000)
  if (!localId || !b.arquivo) throw new BadRequestError("Escolha o arquivo e o contato.")

  let arq
  try { arq = $app.findRecordById("arquivos", String(b.arquivo)) } catch (err) { throw new NotFoundError("Arquivo não encontrado.") }
  if (arq.getString("empresa") !== empresaId) throw new ForbiddenError("Arquivo de outra empresa.")
  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: localId }) }
  catch (err) { throw new NotFoundError("Contato não encontrado no servidor. Aguarde salvar e tente de novo.") }

  const arquivo = arq.getString("arquivo")
  const nome = arq.getString("nome") || arquivo
  const link = PUB + "/api/files/arquivos/" + arq.id + "/" + encodeURIComponent(arquivo)
  const ext = (arquivo.split(".").pop() || "").toLowerCase()
  const tipo = /^(jpe?g|png|webp|gif)$/.test(ext) ? "image" : /^(mp4)$/.test(ext) ? "video" : /^(mp3|ogg|opus|m4a|aac|amr)$/.test(ext) ? "audio" : "document"

  const d = W.lerDados(rec)
  const sid = rec.getString("social_id")
  let id = "", via = ""
  try {
    if (sid.indexOf("em:") === 0) {
      via = "email"
      const canal = M.canalDaEmpresaTipo($app, empresaId, "email")
      if (!canal) throw new Error("O e-mail desta empresa não está conectado.")
      let assinatura = ""
      try { assinatura = String((W.lerDados($app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId })).email || {}).assinatura || "") } catch (err) {}
      const assunto = String(d.assunto || "").trim()
      id = "em:" + E.envia($app, canal, sid.slice(3), /^re:/i.test(assunto) || !assunto ? (assunto || nome) : "Re: " + assunto,
        texto || "Segue o arquivo.", d.emailMsg || "", assinatura, [{ nome: nome, url: link }])
    } else if (sid.indexOf("ig:") === 0 || sid.indexOf("fb:") === 0) {
      const tp = sid.indexOf("ig:") === 0 ? "instagram" : "messenger"
      via = tp
      const canal = M.canalDaEmpresaTipo($app, empresaId, tp)
      if (!canal) throw new Error((tp === "instagram" ? "O Instagram" : "O Messenger") + " desta empresa não está conectado.")
      const pessoa = sid.slice(3)
      if (texto) M.enviaSocial($app, canal, pessoa, texto)
      try { id = M.enviaAnexoSocial($app, canal, pessoa, link, tipo === "document" ? "file" : tipo) }
      catch (err) {
        // alguns perfis não aceitam arquivo (PDF) no Direct: manda o link
        id = M.enviaSocial($app, canal, pessoa, "📎 " + nome + ": " + link)
      }
    } else {
      via = "whatsapp"
      const canal = W.canalDaEmpresa($app, empresaId)
      if (!canal) throw new Error("O WhatsApp desta empresa ainda não está conectado.")
      let para = rec.getString("wa_id")
      if (!para) {
        let dg = W.digitos(rec.getString("telefone"))
        if (dg.length === 10 || dg.length === 11) dg = "55" + dg
        if (dg.length < 12) throw new Error("Este contato não tem um número de WhatsApp válido.")
        para = dg
      }
      id = W.enviaMidia($app, canal, para, tipo, link, nome, texto)
      rec.set("wa_id", para); d.wa = para
    }
  } catch (err) {
    const msg = String(err.message || err)
    if (/re-?engagement|24 ?h|131047/i.test(msg)) throw new BadRequestError("Passaram 24 horas desde a última mensagem do cliente. O WhatsApp só permite responder livremente dentro desse prazo.")
    throw new BadRequestError("Não consegui enviar o arquivo: " + msg)
  }

  d.msgs = W.unirMsgs(d.msgs, [{ de: "eq", txt: (texto ? texto + "\n" : "") + "📎 " + nome, anexo: { nome: nome, url: link }, ts: Date.now(), wa: id, k: b.k || undefined, st: "sent" }])
  d.status = "esperando"
  d.bot = Object.assign({}, d.bot || {}, { modo: "humano", ate: Date.now() + 12 * 3600000 })
  rec.set("dados", d)
  $app.save(rec)
  return e.json(200, { ok: true, via: via, dados: d })
}, $apis.requireAuth("users"))

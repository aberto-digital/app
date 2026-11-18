/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: formulário e chat do site (rotas públicas, sem login)
//   POST /api/site/lead            formulário "Deixe seus dados": vira contato no AbertoCore
//   POST /api/site/chat/iniciar    visitante abre uma conversa
//   POST /api/site/chat/enviar     visitante manda mais uma mensagem
//   GET  /api/site/chat            visitante busca as respostas (?chave=&sessao=)
// A equipe responde pelo próprio AbertoCore, como qualquer conversa.

routerAdd("POST", "/api/site/lead", (e) => {
  const S = require(`${__hooks}/site.js`)
  const b = e.requestInfo().body || {}
  if (b.site_url) return e.json(200, { ok: true }) // armadilha para robôs
  const c = S.canal($app, b.chave)
  const ip = e.realIP()
  S.limita($app, "lead|" + ip, 5, 3600000)
  const nome = S.limpa(b.nome, 120), negocio = S.limpa(b.negocio, 120)
  const tel = S.telefone(b.whatsapp)
  if (!nome || !tel) throw new BadRequestError("Preencha nome e WhatsApp.")
  if (!b.consentimento) throw new BadRequestError("Marque a autorização de contato.")
  const empresaId = c.getString("empresa")
  const linhas = ["Formulário do site"]
  if (negocio) linhas.push("Negócio: " + negocio + (b.tipo ? " (" + S.limpa(b.tipo, 60) + ")" : ""))
  else if (b.tipo) linhas.push("Tipo: " + S.limpa(b.tipo, 60))
  if (b.cidade) linhas.push("Cidade: " + S.limpa(b.cidade, 80))
  if (b.precisa) linhas.push("Precisa: " + S.limpa(b.precisa, 120))
  linhas.push("Autorizou contato pelo WhatsApp.")

  let rec = S.acharPorTelefone($app, empresaId, tel), novo = false
  if (!rec) { rec = S.novoContato($app, empresaId, { nome: nome, tel: tel, negocio: negocio, canal: "WhatsApp", origem: "Site" }); novo = true }
  const d = S.chegou(rec, linhas.join("\n"))
  if (!d.negocio && negocio) { d.negocio = negocio; rec.set("dados", d) }
  $app.save(rec)
  S.avisaEquipe($app, empresaId, (novo ? "Novo lead pelo site: " : "Pedido pelo site de novo: ") + nome + (negocio ? " (" + negocio + ")" : "") + ", " + tel + ".", rec.getInt("local_id"))
  return e.json(200, { ok: true })
})

routerAdd("POST", "/api/site/chat/iniciar", (e) => {
  const S = require(`${__hooks}/site.js`)
  const b = e.requestInfo().body || {}
  if (b.site_url) return e.json(200, { ok: true })
  const c = S.canal($app, b.chave)
  const ip = e.realIP()
  S.limita($app, "chatnovo|" + ip, 4, 3600000)
  const txt = S.limpa(b.txt, 1000)
  const nome = S.limpa(b.nome, 80) || "Visitante do site"
  const tel = S.telefone(b.whatsapp)
  if (!txt) throw new BadRequestError("Escreva sua mensagem.")
  const empresaId = c.getString("empresa")
  const rec = S.novoContato($app, empresaId, { nome: nome, tel: tel, canal: "Chat do site", origem: "Site" })
  const sessao = $security.randomString(40)
  rec.set("site_sessao", sessao)
  S.chegou(rec, txt)
  const sd = c.getString("saudacao")
  if (!S.respondeIA($app, c, rec) && sd) {
    let t = sd.replace("{nome}", nome !== "Visitante do site" ? ", " + nome.split(" ")[0] : "")
    if (tel && t.indexOf(" Se preferir") > 0) t = t.slice(0, t.indexOf(" Se preferir")) + " Anotamos seu WhatsApp " + tel + " também."
    S.chegou(rec, t, "bot")
  }
  $app.save(rec)
  S.avisaEquipe($app, empresaId, "Nova conversa no chat do site: " + nome + ": \"" + txt.replace(/\s+/g, " ").slice(0, 140) + "\"", rec.getInt("local_id"))
  return e.json(200, { sessao: sessao, msgs: S.msgsPublicas(rec) })
})

routerAdd("POST", "/api/site/chat/enviar", (e) => {
  const S = require(`${__hooks}/site.js`)
  const b = e.requestInfo().body || {}
  const c = S.canal($app, b.chave)
  const sessao = String(b.sessao || "")
  if (sessao.length !== 40) throw new BadRequestError("Conversa inválida.")
  S.limita($app, "chat|" + sessao, 12, 60000)
  const txt = S.limpa(b.txt, 1000)
  if (!txt) throw new BadRequestError("Escreva sua mensagem.")
  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && site_sessao = {:s}", { e: c.getString("empresa"), s: sessao }) }
  catch (err) { throw new NotFoundError("Conversa não encontrada.") }
  S.chegou(rec, txt)
  S.respondeIA($app, c, rec)
  $app.save(rec)
  return e.json(200, { msgs: S.msgsPublicas(rec) })
})

routerAdd("GET", "/api/site/chat", (e) => {
  const S = require(`${__hooks}/site.js`)
  const q = e.request.url.query()
  const c = S.canal($app, q.get("chave"))
  const sessao = String(q.get("sessao") || "")
  if (sessao.length !== 40) throw new BadRequestError("Conversa inválida.")
  S.limita($app, "chatler|" + sessao, 40, 60000)
  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && site_sessao = {:s}", { e: c.getString("empresa"), s: sessao }) }
  catch (err) { throw new NotFoundError("Conversa não encontrada.") }
  return e.json(200, { msgs: S.msgsPublicas(rec) })
})

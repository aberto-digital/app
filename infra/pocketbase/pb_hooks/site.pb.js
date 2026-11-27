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
  if (negocio && !b.interesse) linhas.push("Negócio: " + negocio + (b.tipo ? " (" + S.limpa(b.tipo, 60) + ")" : ""))
  else if (b.tipo) linhas.push("Tipo: " + S.limpa(b.tipo, 60))
  if (b.cidade) linhas.push("Cidade: " + S.limpa(b.cidade, 80))
  if (b.precisa) linhas.push("Precisa: " + S.limpa(b.precisa, 120))
  if (b.interesse) linhas.push("Interesse: " + S.limpa(b.interesse, 120))
  if (b.mensagem) linhas.push("Mensagem: " + S.limpa(b.mensagem, 600))
  // página pública de auditoria (abertodigital.com/auditoria)
  const aud = b.origem === "auditoria"
  if (aud) {
    linhas[0] = b.modo === "feita_por_nos" ? "🔎 Pediu a auditoria gratuita feita pela abertodigital" : "🔎 Fez o teste de presença digital no site"
    if (negocio) linhas.splice(1, 0, "Negócio: " + negocio + (b.ramo ? " (" + S.limpa(b.ramo, 60) + ")" : ""))
    if (b.nota !== undefined && b.nota !== null && b.nota !== "") linhas.push("Nota do teste: " + Math.max(0, Math.min(100, parseInt(b.nota, 10) || 0)) + "/100" + (b.areas ? " (" + S.limpa(b.areas, 160) + ")" : ""))
    if (b.fracos) linhas.push("Pontos fracos: " + S.limpa(b.fracos, 500))
    if (b.instagram) linhas.push("Instagram: @" + S.limpa(String(b.instagram).replace(/^@/, ""), 60))
    if (b.site) linhas.push("Site: " + S.limpa(b.site, 120))
    if (b.email) linhas.push("E-mail: " + S.limpa(b.email, 120))
  }
  linhas.push("Autorizou contato pelo WhatsApp.")

  let rec = S.acharPorTelefone($app, empresaId, tel), novo = false
  if (!rec) { rec = S.novoContato($app, empresaId, { nome: nome, tel: tel, negocio: negocio, canal: "WhatsApp", origem: aud ? "Auditoria gratuita" : "Site" }); novo = true }
  const d = S.chegou(rec, linhas.join("\n"))
  if (!d.negocio && negocio) d.negocio = negocio
  if (aud) {
    const mail = S.limpa(b.email, 120).toLowerCase()
    if (!d.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) d.email = mail
    const ig = S.limpa(String(b.instagram || "").replace(/^@/, ""), 60)
    if (!d.usuario && /^[A-Za-z0-9._]{2,30}$/.test(ig)) d.usuario = ig
    if (!d.site && b.site) d.site = S.limpa(b.site, 120)
    if (!d.cidade && b.cidade) d.cidade = S.limpa(b.cidade, 80)
    d.etiquetas = Array.from(new Set([].concat(d.etiquetas || [], ["Auditoria gratuita"])))
    if (d.etiqFora) d.etiqFora = d.etiqFora.filter((x) => x !== "Auditoria gratuita")
    d.tipo = d.tipo || "Lead"
    if (b.modo === "feita_por_nos") d.etapa = d.etapa === "Novo contato" || !d.etapa ? "Qualificado" : d.etapa
    // retorno no próximo dia útil
    if (!d.followup) { const t = new Date(Date.now() - 3 * 3600000 + 86400000); while (t.getUTCDay() === 0 || t.getUTCDay() === 6) t.setUTCDate(t.getUTCDate() + 1); d.followup = t.toISOString().slice(0, 10) }
  }
  rec.set("dados", d)
  $app.save(rec)
  S.avisaEquipe($app, empresaId, (aud ? (b.modo === "feita_por_nos" ? "Pediu auditoria gratuita: " : "Fez o teste de presença digital (nota " + (parseInt(b.nota, 10) || 0) + "): ") : novo ? "Novo lead pelo site: " : "Pedido pelo site de novo: ") + nome + (negocio ? " (" + negocio + ")" : "") + ", " + tel + ".", rec.getInt("local_id"))
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

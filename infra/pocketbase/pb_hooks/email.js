// AbertoCore: e-mail como canal pela API do Zoho Mail (OAuth).
// A caixa é lida a cada 2 minutos (email.pb.js); cada remetente vira um contato "E-mail"
// e a equipe responde pelo app. A IA não responde e-mail sozinha (evita responder newsletters e robôs).

const W = require(`${__hooks}/wa.js`)

const ESCOPOS = "ZohoMail.messages.ALL,ZohoMail.accounts.READ,ZohoMail.folders.READ"
const RETORNO = "https://api.abertodigital.com/api/email/zoho/callback"

function appZoho(app) {
  try { return app.findFirstRecordByFilter("email_app", "provedor = 'zoho'") } catch (e) { return null }
}
function ext(canal) { try { return JSON.parse(canal.getString("extra") || "{}") || {} } catch (e) { return {} } }
// testes locais: ABERTOCORE_ZOHO_BASE troca accounts e mail da Zoho por um servidor de teste
function teste() { return $os.getenv("ABERTOCORE_ZOHO_BASE") || "" }
function mailDomain(accountsServer) {
  if (teste()) return teste()
  const h = String(accountsServer || "https://accounts.zoho.com").replace(/^https?:\/\//, "")
  return "https://" + h.replace(/^accounts\./, "mail.")
}

function tokenPost(app, accountsServer, params) {
  const z = appZoho(app)
  if (!z || !z.getString("client_id") || !z.getString("client_secret")) throw new Error("O app da Zoho ainda não está configurado no servidor.")
  params.client_id = z.getString("client_id"); params.client_secret = z.getString("client_secret")
  const q = Object.keys(params).map((k) => k + "=" + encodeURIComponent(params[k])).join("&")
  const res = $http.send({ url: (teste() || String(accountsServer || "https://accounts.zoho.com")) + "/oauth/v2/token?" + q, method: "POST", timeout: 20 })
  const j = res.json || {}
  if (res.statusCode >= 300 || j.error || !j.access_token) throw new Error("Zoho: " + (j.error || ("HTTP " + res.statusCode)))
  return j
}

// access_token válido (renova com o refresh_token quando passa de 50 minutos)
function token(app, canal) {
  const x = ext(canal)
  if (canal.getString("access_token") && x.tokTs && Date.now() - x.tokTs < 50 * 60000) return canal.getString("access_token")
  const j = tokenPost(app, x.accountsServer, { refresh_token: canal.getString("refresh_token"), grant_type: "refresh_token" })
  x.tokTs = Date.now()
  canal.set("access_token", j.access_token)
  canal.set("extra", x)
  app.save(canal)
  return j.access_token
}

function zoho(app, canal, metodo, caminho, corpo) {
  const x = ext(canal)
  const res = $http.send({ url: x.mailDomain + "/api/accounts/" + x.accountId + caminho, method: metodo,
    headers: { "Authorization": "Zoho-oauthtoken " + token(app, canal), "Content-Type": "application/json", "Accept": "application/json" },
    body: corpo ? JSON.stringify(corpo) : "", timeout: 25 })
  const j = res.json || {}
  if (res.statusCode >= 300) throw new Error("Zoho Mail: " + ((j.data && (j.data.moreInfo || j.data.errorCode)) || (j.status && j.status.description) || ("HTTP " + res.statusCode)))
  return j.data
}

// Liga a caixa depois do login na Zoho (callback do OAuth)
function liga(app, empresaId, code, accountsServer) {
  const tk = tokenPost(app, accountsServer, { code: code, grant_type: "authorization_code", redirect_uri: RETORNO })
  if (!tk.refresh_token) throw new Error("A Zoho não devolveu o acesso permanente. Tente conectar de novo.")
  const dom = mailDomain(accountsServer)
  const contas = $http.send({ url: dom + "/api/accounts", method: "GET", headers: { "Authorization": "Zoho-oauthtoken " + tk.access_token }, timeout: 20 }).json || {}
  const conta = ((contas.data || [])[0]) || null
  if (!conta) throw new Error("Não encontrei a caixa de e-mail nessa conta da Zoho.")
  const email = conta.primaryEmailAddress || conta.mailboxAddress || conta.incomingUserName || ""
  const pastas = $http.send({ url: dom + "/api/accounts/" + conta.accountId + "/folders", method: "GET", headers: { "Authorization": "Zoho-oauthtoken " + tk.access_token }, timeout: 20 }).json || {}
  const inbox = (pastas.data || []).filter((f) => String(f.folderType).toLowerCase() === "inbox")[0]
  let rec = null
  try { rec = app.findFirstRecordByFilter("canais", "tipo = 'email' && conta = {:c}", { c: email }) } catch (e) {}
  if (rec && rec.getString("empresa") !== empresaId) throw new Error("Esta caixa já está ligada a outra empresa no AbertoCore.")
  if (!rec) { rec = new Record(app.findCollectionByNameOrId("canais")); rec.set("empresa", empresaId) }
  rec.set("tipo", "email"); rec.set("conta", email); rec.set("nome", email)
  rec.set("access_token", tk.access_token); rec.set("refresh_token", tk.refresh_token)
  rec.set("extra", { accountId: String(conta.accountId), folderId: inbox ? String(inbox.folderId) : "", accountsServer: accountsServer || "https://accounts.zoho.com",
    mailDomain: dom, desde: Date.now(), ultimo: Date.now(), tokTs: Date.now() })
  rec.set("ativo", true)
  app.save(rec)
  return email
}

function textoDeHtml(h) {
  return String(h || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim()
}
// corta a parte citada da resposta ("Em ... escreveu:", "On ... wrote:", linhas com >)
function semCitacao(t) {
  const linhas = String(t || "").split("\n"), out = []
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    if (/^(Em .+ escreveu:|On .+ wrote:|-----Original Message-----|---- On .+ wrote ----|De: .+|From: .+)$/i.test(l.trim())) break
    if (/^>/.test(l.trim())) continue
    out.push(l)
  }
  return out.join("\n").trim()
}
const ROBO = /(no-?reply|nao-?responda|mailer-daemon|postmaster|notifications?@|notificacao|newsletter|bounce|calendar-notification)/i

// contato que já tem este e-mail salvo no card (ex.: lead do Instagram) ganha a identidade de e-mail
function porEmailSalvo(app, empresaId, email) {
  const sid = "em:" + String(email).toLowerCase()
  let rec = null
  try { rec = app.findFirstRecordByFilter("contatos", "empresa = {:e} && (social_id = {:s} || aliases ~ {:a})", { e: empresaId, s: sid, a: " " + sid + " " }) } catch (e) {}
  if (rec) return rec
  try { rec = app.findFirstRecordByFilter("contatos", "empresa = {:e} && dados.email = {:m}", { e: empresaId, m: String(email).toLowerCase() }) } catch (e) {}
  if (!rec) try { rec = app.findFirstRecordByFilter("contatos", "empresa = {:e} && dados ~ {:m}", { e: empresaId, m: '"email":"' + String(email).toLowerCase() + '"' }) } catch (e) {}
  if (!rec) return null
  ligaEmail(rec, email)
  return rec
}
function ligaEmail(rec, email) {
  const sid = "em:" + String(email).toLowerCase()
  if (rec.getString("social_id") === sid || (rec.getString("aliases") || "").indexOf(" " + sid + " ") >= 0) return
  if (!rec.getString("social_id")) rec.set("social_id", sid)
  else rec.set("aliases", " " + (rec.getString("aliases") || "").split(" ").filter(Boolean).concat([sid]).join(" ") + " ")
  const d = W.lerDados(rec)
  d.ids = [].concat(d.ids || []).concat(d.ids && d.ids.indexOf("em") >= 0 ? [] : ["em"])
  if (!d.email) d.email = String(email).toLowerCase()
  rec.set("dados", d)
}

function contatoEmail(app, empresaId, email, nome) {
  const sid = "em:" + String(email).toLowerCase()
  const achado = porEmailSalvo(app, empresaId, email)
  if (achado) return achado
  const S = require(`${__hooks}/site.js`)
  const rec = S.novoContato(app, empresaId, { nome: nome || email, canal: "E-mail", origem: "E-mail", nota: email })
  rec.set("social_id", sid)
  const d = W.lerDados(rec); d.social = sid; d.email = String(email).toLowerCase()
  rec.set("dados", d)
  return rec
}

// Lê a caixa de entrada e grava o que chegou desde a última leitura
function le(app, canal) {
  const x = ext(canal)
  if (!x.folderId) return 0
  const lista = zoho(app, canal, "GET", "/messages/view?folderId=" + x.folderId + "&limit=25&sortorder=false") || []
  const meu = String(canal.getString("conta")).toLowerCase()
  let n = 0, maior = x.ultimo || 0
  lista.filter((m) => parseInt(m.receivedTime, 10) > (x.ultimo || 0)).sort((a, b) => parseInt(a.receivedTime, 10) - parseInt(b.receivedTime, 10)).forEach((m) => {
    const ts = parseInt(m.receivedTime, 10) || Date.now()
    maior = Math.max(maior, ts)
    const de = String(m.fromAddress || "").toLowerCase()
    if (!de || de === meu || ROBO.test(de)) return
    let corpo = ""
    try { corpo = textoDeHtml((zoho(app, canal, "GET", "/folders/" + x.folderId + "/messages/" + m.messageId + "/content") || {}).content) } catch (e) { corpo = m.summary || "" }
    corpo = semCitacao(corpo).slice(0, 4000)
    const assunto = String(m.subject || "").slice(0, 200)
    const rec = contatoEmail(app, canal.getString("empresa"), de, String(m.sender || "").replace(/<.*>/, "").replace(/"/g, "").trim())
    const d = W.lerDados(rec)
    const antes = (d.msgs || []).length
    d.msgs = W.unirMsgs(d.msgs, [{ de: "cli", txt: (assunto ? "Assunto: " + assunto + "\n\n" : "") + corpo, ts: ts, wa: "em:" + m.messageId }])
    if (d.msgs.length === antes) return
    d.naoLidas = (d.naoLidas || 0) + 1
    if (d.status !== "entrada") d.status = "entrada"
    d.assunto = assunto; d.emailMsg = String(m.messageId)
    rec.set("dados", d)
    app.save(rec)
    n++
  })
  if (maior !== x.ultimo) {
    const fresco = app.findRecordById("canais", canal.id)
    const fx = ext(fresco)
    fx.ultimo = maior
    fresco.set("extra", fx)
    app.save(fresco)
  }
  return n
}

// E-mails mandados direto pelo Zoho (fora do app) para alguém que já é contato: entram na conversa
function leEnviados(app, canal) {
  const x = ext(canal)
  if (!x.sentId) {
    try {
      const pastas = zoho(app, canal, "GET", "/folders") || []
      const s = pastas.filter((f) => String(f.folderType).toLowerCase() === "sent")[0]
      if (!s) return 0
      x.sentId = String(s.folderId); x.ultimoEnv = x.ultimoEnv || Date.now() - 3 * 86400000
      const fr = app.findRecordById("canais", canal.id); const fx = ext(fr); fx.sentId = x.sentId; fx.ultimoEnv = x.ultimoEnv; fr.set("extra", fx); app.save(fr)
    } catch (e) { return 0 }
  }
  const lista = zoho(app, canal, "GET", "/messages/view?folderId=" + x.sentId + "&limit=25&sortorder=false") || []
  let n = 0, maior = x.ultimoEnv || 0
  lista.filter((m) => parseInt(m.sentDateInGMT || m.receivedTime, 10) > (x.ultimoEnv || 0)).forEach((m) => {
    const ts = parseInt(m.sentDateInGMT || m.receivedTime, 10) || Date.now()
    maior = Math.max(maior, ts)
    const paras = String(m.toAddress || "").toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || []
    paras.forEach((para) => {
      const rec = porEmailSalvo(app, canal.getString("empresa"), para)
      if (!rec) return
      const d = W.lerDados(rec)
      if ((d.msgs || []).some((x2) => x2.wa === "em:" + m.messageId || (x2.de === "eq" && Math.abs((x2.ts || 0) - ts) < 120000 && /^em:/.test(x2.wa || "")))) return
      let corpo = ""
      try { corpo = textoDeHtml((zoho(app, canal, "GET", "/folders/" + x.sentId + "/messages/" + m.messageId + "/content") || {}).content) } catch (e) { corpo = m.summary || "" }
      const assunto = String(m.subject || "").slice(0, 200)
      d.msgs = W.unirMsgs(d.msgs, [{ de: "eq", txt: (assunto ? "Assunto: " + assunto + "\n\n" : "") + semCitacao(corpo).slice(0, 4000), ts: ts, wa: "em:" + m.messageId, st: "sent" }])
      if (!d.assunto) d.assunto = assunto
      d.emailMsg = d.emailMsg || String(m.messageId)
      rec.set("dados", d)
      app.save(rec)
      n++
    })
  })
  if (maior !== x.ultimoEnv) {
    const fr = app.findRecordById("canais", canal.id); const fx = ext(fr); fx.ultimoEnv = maior; fr.set("extra", fx); app.save(fr)
  }
  return n
}

function leTodos(app) {
  let canais = []
  try { canais = app.findRecordsByFilter("canais", "tipo = 'email' && ativo = true", "", 0, 0) } catch (e) { return }
  canais.forEach((c) => {
    try { const n = le(app, c); if (n) app.logger().info("email: mensagens recebidas", "conta", c.getString("conta"), "n", n) }
    catch (e) { app.logger().warn("email: falha ao ler a caixa", "conta", c.getString("conta"), "erro", String(e.message || e)) }
    try { leEnviados(app, app.findRecordById("canais", c.id)) }
    catch (e) { app.logger().warn("email: falha ao ler enviados", "conta", c.getString("conta"), "erro", String(e.message || e)) }
  })
}

// Responde (ou escreve um e-mail novo) para o contato
function htmlDe(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") }

// assinatura em texto (uma linha por item); vira um bloco de e-mail com separador
function assinaturaHtml(a) {
  a = String(a || "").trim()
  if (!a) return ""
  const linhas = a.split("\n").map((l) => l.trim())
  const fmt = linhas.map((l, i) => {
    let h = htmlDe(l)
    h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2F6FED">$1</a>')
    h = h.replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1" style="color:#2F6FED">$1</a>')
    return i === 0 ? '<b style="color:#1E3050">' + h + "</b>" : h
  }).join("<br>")
  return '<br><br><table cellpadding="0" cellspacing="0" style="border-top:2px solid #FFB020;padding-top:10px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#444"><tr><td style="padding-top:10px">' + fmt + "</td></tr></table>"
}

function anexosHtml(anexos) {
  if (!anexos || !anexos.length) return ""
  return "<br><br>" + anexos.map((a) =>
    '<a href="' + htmlDe(a.url) + '" style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border:1px solid #d5dbe6;border-radius:8px;color:#1E3050;text-decoration:none;font-family:Arial,sans-serif;font-size:13px">&#128206; <b>' + htmlDe(a.nome) + "</b> &middot; abrir</a>").join("")
}

function envia(app, canal, para, assunto, texto, responderA, assinatura, anexos) {
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#222">' + htmlDe(texto) + anexosHtml(anexos) + assinaturaHtml(assinatura) + "</div>"
  const corpo = { fromAddress: canal.getString("conta"), toAddress: para, subject: assunto || "Contato", content: html, mailFormat: "html" }
  let r
  if (responderA) {
    corpo.action = "reply"
    r = zoho(app, canal, "POST", "/messages/" + responderA, corpo)
  } else r = zoho(app, canal, "POST", "/messages", corpo)
  return (r && (r.messageId || r.mailId)) ? String(r.messageId || r.mailId) : "em:out" + Date.now().toString(36)
}

module.exports = { ESCOPOS, RETORNO, appZoho, liga, le, leEnviados, leTodos, envia, ligaEmail }

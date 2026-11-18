// AbertoCore: funções do WhatsApp usadas pelos hooks (carregadas com require).
// Cada handler do PocketBase roda isolado, por isso tudo que é compartilhado fica aqui.

function digitos(t) { return String(t || "").replace(/\D/g, "") }

// Formata 5511991233627 -> (11) 99123-3627 ; outros países ficam como +<dígitos>
function telBonito(wa) {
  const d = digitos(wa)
  if (d.length === 13 && d.startsWith("55")) return "(" + d.slice(2, 4) + ") " + d.slice(4, 9) + "-" + d.slice(9)
  if (d.length === 12 && d.startsWith("55")) return "(" + d.slice(2, 4) + ") " + d.slice(4, 8) + "-" + d.slice(8)
  return "+" + d
}

// Mesmo número? Compara os 8 últimos dígitos (o 9º dígito do celular varia no Brasil)
function mesmoNumero(a, b) {
  const x = digitos(a), y = digitos(b)
  return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8)
}

function lerDados(rec) {
  try { return JSON.parse(rec.getString("dados") || "{}") || {} } catch (e) { return {} }
}

function chaveMsg(m) { return m.k || m.wa || (m.de + "|" + m.ts + "|" + m.txt) }

// União de duas listas de mensagens, sem repetir, em ordem de horário
function unirMsgs(a, b) {
  const vistos = {}, out = []
  ;(a || []).concat(b || []).forEach((m) => {
    if (!m) return
    const k = chaveMsg(m)
    if (vistos[k] !== undefined) {
      // a versão do servidor (com wa id / status) vence a otimista do app
      const i = vistos[k]
      out[i] = Object.assign({}, out[i], m, { pend: (out[i].pend && m.pend) || undefined })
      return
    }
    vistos[k] = out.length
    out.push(m)
  })
  out.sort((x, y) => (x.ts || 0) - (y.ts || 0))
  return out
}

function metaApp(app) {
  try { return app.findFirstRecordByFilter("meta_app", "id != ''") } catch (e) { return null }
}

function versao(app) {
  const m = metaApp(app)
  return (m && m.getString("versao_api")) || "v25.0"
}

function canalPorPhoneId(app, phoneId) {
  try { return app.findFirstRecordByFilter("canais", "phone_number_id = {:p} && ativo = true", { p: phoneId }) } catch (e) { return null }
}

function canalDaEmpresa(app, empresaId) {
  try { return app.findFirstRecordByFilter("canais", "empresa = {:e} && tipo = 'whatsapp' && ativo = true", { e: empresaId }) } catch (e) { return null }
}

// Acha o contato da empresa pelo número; se não existir, cria
function contatoPorNumero(app, empresaId, waId, nomePerfil) {
  const col = app.findCollectionByNameOrId("contatos")
  let rec = null
  try { rec = app.findFirstRecordByFilter("contatos", "empresa = {:e} && wa_id = {:w}", { e: empresaId, w: waId }) } catch (e) {}
  if (!rec) {
    const todos = app.findRecordsByFilter("contatos", "empresa = {:e}", "", 0, 0, { e: empresaId })
    for (let i = 0; i < todos.length; i++) {
      if (mesmoNumero(todos[i].getString("telefone"), waId)) { rec = todos[i]; break }
    }
  }
  if (rec) {
    if (!rec.getString("wa_id")) rec.set("wa_id", waId)
    return rec
  }
  // novo contato: próximo local_id da empresa
  let maior = 0
  const ids = app.findRecordsByFilter("contatos", "empresa = {:e}", "-local_id", 1, 0, { e: empresaId })
  if (ids.length) maior = ids[0].getInt("local_id")
  try {
    const cfg = app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId })
    const c = lerDados(cfg)
    if (c.prox && c.prox.c) maior = Math.max(maior, c.prox.c - 1)
  } catch (e) {}
  const hoje = new Date().toISOString().slice(0, 10)
  const nome = nomePerfil || telBonito(waId)
  rec = new Record(col)
  rec.set("empresa", empresaId)
  rec.set("local_id", maior + 1)
  rec.set("wa_id", waId)
  rec.set("nome", nome)
  rec.set("telefone", telBonito(waId))
  rec.set("canal", "WhatsApp")
  rec.set("etapa", "Novo contato")
  rec.set("dados", {
    id: maior + 1, nome: nome, negocio: "", canal: "WhatsApp", tipo: "Lead", etapa: "Novo contato", valor: 0,
    followup: null, status: "entrada", tel: telBonito(waId), origem: "WhatsApp", nota: "", naoLidas: 0,
    criado: hoje, criadoTs: Date.now(), wa: waId, msgs: [],
  })
  return rec
}

function textoDaMensagem(m) {
  switch (m.type) {
    case "text": return (m.text && m.text.body) || ""
    case "button": return (m.button && m.button.text) || "[botão]"
    case "interactive": {
      const i = m.interactive || {}
      return (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || "[resposta]"
    }
    case "image": return "📷 Foto" + (m.image && m.image.caption ? ": " + m.image.caption : "")
    case "video": return "🎬 Vídeo" + (m.video && m.video.caption ? ": " + m.video.caption : "")
    case "audio": return "🎤 Áudio"
    case "document": return "📄 Documento" + (m.document && m.document.filename ? ": " + m.document.filename : "")
    case "sticker": return "Figurinha"
    case "location": return "📍 Localização"
    case "contacts": return "👤 Contato compartilhado"
    case "reaction": return null // reações não viram mensagem
    default: return "[" + (m.type || "mensagem") + "]"
  }
}

// Processa o corpo do webhook. Retorna quantas mensagens foram gravadas.
function processaWebhook(app, corpo) {
  let n = 0
  ;(corpo.entry || []).forEach((entry) => {
    ;(entry.changes || []).forEach((ch) => {
      const v = ch.value || {}
      const phoneId = v.metadata && v.metadata.phone_number_id
      if (!phoneId) return
      const canal = canalPorPhoneId(app, phoneId)
      if (!canal) { app.logger().warn("whatsapp: número sem canal", "phone_number_id", phoneId); return }
      const empresaId = canal.getString("empresa")
      const perfis = {}
      ;(v.contacts || []).forEach((c) => { perfis[c.wa_id] = c.profile && c.profile.name })

      ;(v.messages || []).forEach((m) => {
        const txt = textoDaMensagem(m)
        if (txt === null) return
        const rec = contatoPorNumero(app, empresaId, m.from, perfis[m.from])
        const d = lerDados(rec)
        const msg = { de: "cli", txt: txt, ts: (parseInt(m.timestamp, 10) || Math.floor(Date.now() / 1000)) * 1000, wa: m.id }
        const antes = (d.msgs || []).length
        d.msgs = unirMsgs(d.msgs, [msg])
        if (d.msgs.length === antes) return // repetida (a Meta reenvia às vezes)
        d.naoLidas = (d.naoLidas || 0) + 1
        if (d.status === "finalizado" || d.status === "esperando") d.status = "entrada"
        d.wa = m.from
        rec.set("dados", d)
        app.save(rec)
        n++
        try { rodaBot(app, canal, rec, txt) } catch (e) { app.logger().error("whatsapp: erro no robô", "erro", String(e)) }
      })

      // status das mensagens enviadas (entregue / lida / falhou)
      ;(v.statuses || []).forEach((s) => {
        let rec = null
        try { rec = app.findFirstRecordByFilter("contatos", "empresa = {:e} && wa_id = {:w}", { e: empresaId, w: s.recipient_id }) } catch (e) { return }
        const d = lerDados(rec)
        let mudou = false
        ;(d.msgs || []).forEach((m) => {
          if (m.wa === s.id && m.st !== "read") {
            m.st = s.status
            if (s.status === "failed") m.erro = (s.errors && s.errors[0] && (s.errors[0].title || s.errors[0].message)) || "Não entregue"
            mudou = true
          }
        })
        if (mudou) { rec.set("dados", d); app.save(rec) }
      })
    })
  })
  return n
}


// ---------- chatbot de menu ----------
const BOT_PADRAO = {
  ativo: false,
  saudacao: "Olá! 👋 Aqui é {empresa}. Como podemos ajudar? Responda com o número da opção:",
  opcoes: [
    { titulo: "Orçamento", resposta: "Ótimo! Conte em poucas palavras o que você precisa que alguém da equipe já te responde.", humano: true },
    { titulo: "Horário de atendimento", resposta: "Atendemos de segunda a sexta, das 9h às 18h.", humano: false },
    { titulo: "Falar com uma pessoa", resposta: "Certo! Já avisei a equipe, em instantes alguém te responde.", humano: true },
  ],
  rodape: "Digite 0 para ver o menu de novo.",
  pausaHoras: 12,
}

function configBot(app, empresaId) {
  let c = {}
  try { c = lerDados(app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId })) } catch (e) {}
  const b = Object.assign({}, BOT_PADRAO, c.bot || {})
  b.opcoes = (b.opcoes || []).filter((o) => o && String(o.titulo || "").trim())
  return b
}

function nomeEmpresa(app, empresaId) {
  try { return app.findRecordById("empresas", empresaId).getString("nome") || "nossa empresa" } catch (e) { return "nossa empresa" }
}

function textoMenu(app, empresaId, b) {
  const linhas = b.opcoes.map((o, i) => (i + 1) + " - " + String(o.titulo).trim())
  return String(b.saudacao || "").replace(/\{empresa\}/g, nomeEmpresa(app, empresaId)) + "\n\n" + linhas.join("\n") + (b.rodape ? "\n\n" + b.rodape : "")
}

// Decide a resposta do robô para a mensagem que acabou de chegar.
// Retorna { texto, humano } ou null (robô fica quieto).
function decideBot(app, empresaId, d, txt) {
  const b = configBot(app, empresaId)
  if (!b.ativo || !b.opcoes.length) return null
  const agora = Date.now(), st = d.bot || {}
  const t = String(txt || "").trim()
  const pediuMenu = t === "0" || /^menu$/i.test(t)
  if (st.modo === "humano" && agora < (st.ate || 0) && !pediuMenu) return null
  if (pediuMenu) return { texto: textoMenu(app, empresaId, b), menu: true, volta: true }
  const m = t.match(/^(\d{1,2})[\s.)-]*$/)
  if (m) {
    const o = b.opcoes[parseInt(m[1], 10) - 1]
    if (o) return { texto: String(o.resposta || "").trim() || "Certo!", humano: !!o.humano, pausa: b.pausaHoras }
    return { texto: "Não encontrei essa opção. " + textoMenu(app, empresaId, b), menu: true }
  }
  // texto livre: manda o menu se ainda não mandou nesta conversa recente
  const janela = (b.pausaHoras || 12) * 3600000
  if (!st.ultimoMenu || agora - st.ultimoMenu > janela) return { texto: textoMenu(app, empresaId, b), menu: true }
  return null
}

// Executa a resposta do robô (envia e grava). Chamado depois de salvar a mensagem do cliente.
function rodaBot(app, canal, rec, txtCliente) {
  const empresaId = canal.getString("empresa")
  const d = lerDados(rec)
  const r = decideBot(app, empresaId, d, txtCliente)
  if (!r) return false
  let waId = null, erro = null
  try { waId = enviaTexto(app, canal, rec.getString("wa_id"), r.texto) } catch (e) { erro = String(e.message || e) }
  const agora = Date.now()
  d.bot = d.bot || {}
  if (r.menu) d.bot.ultimoMenu = agora
  if (r.volta) { delete d.bot.modo; delete d.bot.ate }
  if (r.humano) { d.bot.modo = "humano"; d.bot.ate = agora + (r.pausa || 12) * 3600000 }
  const msg = { de: "bot", txt: r.texto, ts: agora, st: waId ? "sent" : undefined, wa: waId || undefined }
  if (erro) msg.erro = erro
  d.msgs = unirMsgs(d.msgs, [msg])
  rec.set("dados", d)
  app.save(rec)
  if (erro) app.logger().error("whatsapp: robô não conseguiu responder", "erro", erro)
  return true
}

// Envia texto pelo WhatsApp. Retorna o id da mensagem na Meta.
function enviaTexto(app, canal, para, texto) {
  const base = $os.getenv("ABERTOCORE_GRAPH_BASE") || "https://graph.facebook.com"
  const url = base + "/" + versao(app) + "/" + canal.getString("phone_number_id") + "/messages"
  const res = $http.send({
    url: url,
    method: "POST",
    headers: { "Authorization": "Bearer " + canal.getString("access_token"), "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: para, type: "text", text: { preview_url: false, body: texto } }),
    timeout: 20,
  })
  const j = res.json || {}
  if (res.statusCode >= 300 || !j.messages || !j.messages.length) {
    const err = (j.error && (j.error.error_user_msg || j.error.message)) || ("HTTP " + res.statusCode)
    throw new Error(err)
  }
  return j.messages[0].id
}

module.exports = { digitos, telBonito, mesmoNumero, lerDados, unirMsgs, metaApp, canalDaEmpresa, processaWebhook, enviaTexto, decideBot, BOT_PADRAO }

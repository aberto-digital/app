// AbertoCore: assistente de IA interno (funções compartilhadas, carregadas com require).
// Não fala com o cliente final: organiza o CRM, resume conversas e responde perguntas do dono.
// Provedor atual: Google Gemini (API generateContent). A chave fica em ia_config.api_key (escondida).

const ETAPAS = ["Novo contato", "Qualificado", "Proposta enviada", "Negociação", "Fechado", "Perdido"]
const FINAIS = ["Fechado", "Perdido"]
const MODELO_PADRAO = "gemini-flash-lite-latest"
const FUSO_MS = -3 * 3600000 // Brasília

function lerDados(rec) {
  try { return JSON.parse(rec.getString("dados") || "{}") || {} } catch (e) { return {} }
}

function cfgDaEmpresa(app, empresaId) {
  try { return app.findFirstRecordByFilter("ia_config", "empresa = {:e}", { e: empresaId }) } catch (e) { return null }
}

// datas no fuso de Brasília
function diaBR(ms) { return new Date((ms || Date.now()) + FUSO_MS).toISOString().slice(0, 10) }
function dataHoraBR(ms) {
  const s = new Date(ms + FUSO_MS).toISOString()
  return s.slice(8, 10) + "/" + s.slice(5, 7) + " " + s.slice(11, 16)
}
function dataCurta(iso) { return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "" }
function milhar(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") }
function brl(v) { return "R$ " + milhar(v) }

function quem(de) { return { cli: "Cliente", eq: "Equipe", bot: "Chatbot", ia: "IA", sis: "Nota" }[de] || de }

// ---------- chamada ao provedor ----------
// Retorna { texto, tin, tout }. Lança Error com mensagem em português.
function chamaGemini(apiKey, modelo, sistema, texto, json, maxTokens) {
  const base = $os.getenv("ABERTOCORE_GEMINI_BASE") || "https://generativelanguage.googleapis.com"
  const res = $http.send({
    url: base + "/v1beta/models/" + encodeURIComponent(modelo || MODELO_PADRAO) + ":generateContent",
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: "user", parts: [{ text: texto }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens || 1024, responseMimeType: json ? "application/json" : "text/plain" },
    }),
    timeout: 60,
  })
  const j = res.json || {}
  if (res.statusCode >= 300) {
    const m = (j.error && j.error.message) || ("HTTP " + res.statusCode)
    if (res.statusCode === 400 && /api key/i.test(m)) throw new Error("A chave da API não foi aceita pelo Google. Confira se copiou a chave inteira.")
    if (res.statusCode === 403) throw new Error("O Google recusou a chave (sem permissão para a API do Gemini).")
    if (res.statusCode === 404) throw new Error("Modelo \"" + modelo + "\" não encontrado no Gemini.")
    if (res.statusCode === 429) throw new Error("Limite de uso do Gemini atingido (na camada grátis o limite por minuto e por dia é baixo). Tente de novo daqui a pouco.")
    throw new Error("Erro do Gemini: " + m)
  }
  const cand = (j.candidates || [])[0] || {}
  const partes = (cand.content && cand.content.parts) || []
  const saida = partes.filter((p) => !p.thought && p.text).map((p) => p.text).join("").trim()
  if (!saida) throw new Error("O Gemini não devolveu resposta" + (cand.finishReason ? " (" + cand.finishReason + ")" : "") + ".")
  const u = j.usageMetadata || {}
  return { texto: saida, tin: u.promptTokenCount || 0, tout: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) }
}

function registraUso(app, empresaId, tipo, modelo, tin, tout, ok) {
  try {
    const r = new Record(app.findCollectionByNameOrId("ia_uso"))
    r.set("empresa", empresaId); r.set("tipo", tipo); r.set("modelo", modelo)
    r.set("tokens_in", tin || 0); r.set("tokens_out", tout || 0); r.set("ok", !!ok)
    app.save(r)
  } catch (e) { app.logger().warn("ia: uso não registrado", "erro", String(e)) }
}

// Chama a IA com a configuração da empresa e registra o uso.
function chama(app, cfg, tipo, sistema, texto, json, maxTokens) {
  const empresaId = cfg.getString("empresa")
  const modelo = cfg.getString("modelo") || MODELO_PADRAO
  const chave = cfg.getString("api_key")
  if (!chave) throw new Error("A chave da API de IA ainda não foi cadastrada.")
  let r
  try { r = chamaGemini(chave, modelo, sistema, texto, json, maxTokens) }
  catch (e) { registraUso(app, empresaId, tipo, modelo, 0, 0, false); throw e }
  registraUso(app, empresaId, tipo, modelo, r.tin, r.tout, true)
  if (!json) return r.texto
  try { return JSON.parse(r.texto.replace(/^```(json)?\s*|\s*```$/g, "")) }
  catch (e) { throw new Error("A IA devolveu um formato inesperado.") }
}

// ---------- contexto do negócio ----------
function contextoEmpresa(app, empresaId) {
  let nome = "", base = "", perfil = {}
  try {
    const emp = app.findRecordById("empresas", empresaId)
    nome = emp.getString("nome")
    try { perfil = JSON.parse(emp.getString("perfil") || "{}") || {} } catch (e) {}
  } catch (e) {}
  try {
    const c = app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: empresaId })
    const d = lerDados(c)
    base = (d.ia && d.ia.base) || ""
  } catch (e) {}
  const etapas = Array.isArray(perfil.etapas) && perfil.etapas.length > 2 ? perfil.etapas : ETAPAS
  const finais = [perfil.etapaGanho || "Fechado", perfil.etapaPerda || "Perdido"]
  const desc = perfil.descEtapas || "Qualificado = cliente explicou o que precisa; Proposta enviada = a empresa mandou preço ou orçamento; Negociação = discutindo preço, prazo ou condições; Fechado = cliente confirmou a compra; Perdido = cliente desistiu"
  return { nome: nome || "a empresa", base: base, etapas: etapas, finais: finais, desc: desc }
}

function ultimaMsg(d) {
  const ms = (d.msgs || []).filter((m) => m.de !== "sis")
  return ms.length ? ms[ms.length - 1] : null
}

function conversa(d, n) {
  return (d.msgs || []).filter((m) => m.de !== "sis").slice(-(n || 20))
    .map((m) => "[" + dataHoraBR(m.ts || 0) + "] " + quem(m.de) + ": " + String(m.txt || "").replace(/\s+/g, " ").slice(0, 400))
    .join("\n")
}

function linhaContato(d) {
  const u = ultimaMsg(d)
  const partes = [
    "#" + d.id + " " + (d.nome || "Sem nome") + (d.negocio ? " (" + d.negocio + ")" : ""),
    "tipo " + (d.tipo || "Lead"),
    "etapa " + (d.etapa || ETAPAS[0]),
    "valor " + brl(d.valor),
    "retorno " + (d.followup ? dataCurta(d.followup) : "-"),
    d.ficha && d.ficha.proxima ? "próxima manutenção " + dataCurta(d.ficha.proxima) + (d.ficha.metodo ? " (" + d.ficha.metodo + ")" : "") : "",
    "conversa " + ({ entrada: "aguardando a equipe", esperando: "aguardando o cliente", finalizado: "finalizada" }[d.status] || d.status || "-"),
  ]
  if (u) partes.push("última msg " + dataHoraBR(u.ts || 0) + " de " + quem(u.de) + ": \"" + String(u.txt || "").replace(/\s+/g, " ").slice(0, 120) + "\"")
  if (d.ia && d.ia.resumo) partes.push("resumo: " + d.ia.resumo)
  if (d.ia && d.ia.atencao) partes.push("ATENÇÃO: " + (d.ia.motivo || "precisa de resposta"))
  return partes.filter(Boolean).join(" | ")
}

function contatosDaEmpresa(app, empresaId, limite) {
  return app.findRecordsByFilter("contatos", "empresa = {:e}", "-updated", limite || 300, 0, { e: empresaId })
    .map((r) => { const d = lerDados(r); d.id = r.getInt("local_id"); return d })
}

function agendaDaEmpresa(app, empresaId, de, ate) {
  return app.findRecordsByFilter("eventos", "empresa = {:e} && data >= {:a} && data <= {:b}", "data", 200, 0, { e: empresaId, a: de, b: ate })
    .map((r) => lerDados(r))
}

// ---------- conversa "Assistente AbertoCore" ----------
function postaChat(app, empresaId, de, tipo, txt, autor, contato) {
  const r = new Record(app.findCollectionByNameOrId("ia_chat"))
  r.set("empresa", empresaId); r.set("de", de); r.set("tipo", tipo)
  r.set("txt", String(txt || "").slice(0, 20000)); r.set("autor", autor || "")
  if (contato) r.set("contato", contato)
  r.set("ts", Date.now())
  app.save(r)
  return chatJson(r)
}
function chatJson(r) {
  return { id: r.id, de: r.getString("de"), tipo: r.getString("tipo"), txt: r.getString("txt"), autor: r.getString("autor"), contato: r.getInt("contato") || null, ts: r.getInt("ts") }
}
function chatDaEmpresa(app, empresaId, limite) {
  return app.findRecordsByFilter("ia_chat", "empresa = {:e}", "-ts", limite || 200, 0, { e: empresaId }).map(chatJson).reverse()
}

// ---------- 1) CRM preenchido sozinho ----------
const SIS_ANALISE = (ctx, hoje) =>
  "Você organiza o CRM de " + ctx.nome + ". Leia a conversa de WhatsApp entre a empresa e um contato e extraia o que importa para a equipe. " +
  "Hoje é " + hoje + " (horário de Brasília). Responda só com JSON neste formato:\n" +
  "{\"resumo\": string (até 2 frases curtas: o que o cliente quer e em que pé está), " +
  "\"interesse\": string (produto ou serviço, curto; vazio se não souber), " +
  "\"valor\": number ou null (valor em reais combinado ou orçado na conversa; null se não houver número claro), " +
  "\"proximo_retorno\": string AAAA-MM-DD ou null (quando a equipe deve voltar a falar com o cliente, se a conversa indicar), " +
  "\"etapa\": uma de " + JSON.stringify(ctx.etapas) + " (" + ctx.desc + "), " +
  "\"atencao\": boolean (true se a última mensagem é do cliente e ele espera resposta da equipe, ou se ele reclamou), " +
  "\"motivo\": string (por que precisa de atenção, curto; vazio se atencao for false)}\n" +
  "Não invente valores, datas ou nomes. Use português do Brasil." +
  (ctx.base ? "\n\nInformações do negócio:\n" + ctx.base.slice(0, 4000) : "")

function analisaContato(app, cfg, rec) {
  const empresaId = cfg.getString("empresa")
  const d = lerDados(rec)
  d.id = rec.getInt("local_id")
  const u = ultimaMsg(d)
  if (!u || !(d.msgs || []).some((m) => m.de === "cli")) return null
  const ctx = contextoEmpresa(app, empresaId)
  const hoje = diaBR()
  const texto = "Contato: " + (d.nome || "Sem nome") + (d.negocio ? " (" + d.negocio + ")" : "") +
    "\nEtapa atual no funil: " + (d.etapa || ctx.etapas[0]) + "\nValor atual no card: " + brl(d.valor) +
    "\nPróximo retorno atual: " + (d.followup || "nenhum") + "\n\nConversa (mais antiga primeiro):\n" + conversa(d, 30)
  const r = chama(app, cfg, "crm", SIS_ANALISE(ctx, hoje), texto, true, 600)

  // grava de novo em cima da versão mais recente do registro
  const atual = app.findRecordById("contatos", rec.id)
  const dd = lerDados(atual)
  const mudou = []
  const alertado = dd.ia && dd.ia.alertado
  dd.ia = {
    resumo: String(r.resumo || "").slice(0, 400),
    interesse: String(r.interesse || "").slice(0, 120),
    atencao: !!r.atencao,
    motivo: r.atencao ? String(r.motivo || "").slice(0, 200) : "",
    ts: Date.now(),
    ate: u.ts || 0,
    alertado: alertado,
  }
  const v = Number(r.valor)
  if (v > 0 && !(dd.valor > 0)) { dd.valor = Math.round(v * 100) / 100; mudou.push("valor " + brl(dd.valor)) }
  if (r.proximo_retorno && /^\d{4}-\d{2}-\d{2}$/.test(r.proximo_retorno) && r.proximo_retorno >= hoje && !dd.followup) {
    dd.followup = r.proximo_retorno; mudou.push("retorno em " + dataCurta(dd.followup))
  }
  // a IA só avança o card nas etapas do meio; fechar ou perder fica com a equipe
  const ET = ctx.etapas, FI = ctx.finais
  const iNova = ET.indexOf(r.etapa), iAtual = ET.indexOf(dd.etapa || ET[0])
  if (iNova > iAtual && FI.indexOf(r.etapa) < 0 && FI.indexOf(dd.etapa) < 0) {
    dd.etapa = r.etapa; atual.set("etapa", r.etapa); mudou.push("etapa " + r.etapa)
  }
  if (mudou.length) dd.msgs = (dd.msgs || []).concat([{ de: "sis", txt: "IA atualizou o card: " + mudou.join(", ") + ".", ts: Date.now() }])
  atual.set("dados", dd)
  app.save(atual)
  return dd.ia
}

// Contatos com mensagem nova desde a última análise.
function pendentesDeAnalise(app, empresaId, limite) {
  const desde = new Date(Date.now() - 3 * 86400000).toISOString().replace("T", " ")
  const recs = app.findRecordsByFilter("contatos", "empresa = {:e} && updated >= {:t}", "-updated", 200, 0, { e: empresaId, t: desde })
  return recs.filter((r) => {
    const d = lerDados(r), u = ultimaMsg(d)
    if (!u || !(d.msgs || []).some((m) => m.de === "cli")) return false
    return !d.ia || (u.ts || 0) > (d.ia.ate || 0)
  }).slice(0, limite || 10)
}

// Cliente mandou mensagem há mais de 3 horas e ninguém respondeu: avisa uma vez por mensagem.
function alertaSemResposta(app, empresaId) {
  const agora = Date.now()
  const desde = new Date(agora - 3 * 86400000).toISOString().replace("T", " ")
  const recs = app.findRecordsByFilter("contatos", "empresa = {:e} && updated >= {:t}", "-updated", 300, 0, { e: empresaId, t: desde })
  let n = 0
  recs.forEach((r) => {
    const d = lerDados(r), u = ultimaMsg(d)
    if (!u || u.de !== "cli" || d.status === "finalizado") return
    if (agora - (u.ts || 0) < 3 * 3600000 || agora - (u.ts || 0) > 3 * 86400000) return
    if (d.ia && d.ia.alertado === u.ts) return
    const horas = Math.round((agora - u.ts) / 3600000)
    postaChat(app, empresaId, "ia", "aviso", (d.nome || "Um contato") + " mandou mensagem há " + horas + " horas e ninguém respondeu: \"" + String(u.txt || "").replace(/\s+/g, " ").slice(0, 140) + "\"", "", r.getInt("local_id"))
    const atual = app.findRecordById("contatos", r.id), dd = lerDados(atual)
    dd.ia = Object.assign({}, dd.ia || {}, { alertado: u.ts })
    atual.set("dados", dd); app.save(atual)
    n++
  })
  return n
}

function rodaCrm(app) {
  const cfgs = app.findRecordsByFilter("ia_config", "crm_auto = true && api_key != ''", "", 100, 0)
  let n = 0
  cfgs.forEach((cfg) => {
    try { alertaSemResposta(app, cfg.getString("empresa")) } catch (e) { app.logger().warn("ia: alerta falhou", "erro", String(e)) }
    pendentesDeAnalise(app, cfg.getString("empresa"), 8).some((rec) => {
      try { analisaContato(app, cfg, rec); n++; return false }
      catch (e) {
        app.logger().warn("ia: análise falhou", "empresa", cfg.getString("empresa"), "erro", String(e.message || e))
        return /limite|chave|recusou|não encontrado/i.test(String(e.message)) // para esta empresa nesta rodada
      }
    })
  })
  return n
}

// ---------- 2) Perguntas sobre o negócio ----------
function perguntar(app, cfg, pergunta, historico) {
  const empresaId = cfg.getString("empresa")
  const ctx = contextoEmpresa(app, empresaId)
  const hoje = diaBR()
  const contatos = contatosDaEmpresa(app, empresaId, 300)
  const agenda = agendaDaEmpresa(app, empresaId, hoje, diaBR(Date.now() + 30 * 86400000))
  const sistema = "Você é o assistente interno do AbertoCore, o sistema de atendimento de " + ctx.nome + ". " +
    "Responde perguntas do dono e da equipe sobre os contatos, o funil, a agenda e os números do negócio, usando só os dados abaixo. " +
    "Hoje é " + hoje + " (Brasília). Responda em português do Brasil, curto e direto, em texto simples (listas com hífen quando ajudar). " +
    "Cite os contatos pelo nome. Se os dados não respondem, diga isso. Não invente."
  const texto = "Etapas do funil: " + ctx.etapas.join(" > ") + "\n\nContatos (" + contatos.length + "):\n" +
    (contatos.map(linhaContato).join("\n") || "(nenhum)") +
    "\n\nAgenda dos próximos 30 dias:\n" + (agenda.map((ev) => dataCurta(ev.data) + " " + (ev.hora || "") + " " + (ev.titulo || "") + (ev.tipo ? " (" + ev.tipo + ")" : "")).join("\n") || "(vazia)") +
    (historico && historico.length ? "\n\nConversa recente com a equipe (para entender a pergunta):\n" + historico.map((m) => (m.de === "eu" ? "Equipe" : "Assistente") + ": " + String(m.txt).slice(0, 600)).join("\n") : "") +
    "\n\nPergunta: " + String(pergunta).slice(0, 1000)
  return chama(app, cfg, "pergunta", sistema, texto, false, 1200)
}

// ---------- 3) Resumo do dia ----------
function resumoDia(app, cfg) {
  const empresaId = cfg.getString("empresa")
  const ctx = contextoEmpresa(app, empresaId)
  const hoje = diaBR(), amanha = diaBR(Date.now() + 86400000)
  const contatos = contatosDaEmpresa(app, empresaId, 500)
  const doDia = contatos.filter((d) => (d.msgs || []).some((m) => m.de !== "sis" && diaBR(m.ts || 0) === hoje))
  const novos = contatos.filter((d) => { const p = (d.msgs || [])[0]; return p && diaBR(p.ts || 0) === hoje })
  const atencao = contatos.filter((d) => d.status === "entrada" && ctx.finais.indexOf(d.etapa) < 0 && (d.ia && d.ia.atencao || (ultimaMsg(d) || {}).de === "cli"))
  const retornos = contatos.filter((d) => d.followup && d.followup <= amanha && ctx.finais.indexOf(d.etapa) < 0)
  const negociando = contatos.filter((d) => ctx.finais.indexOf(d.etapa) < 0)
  const emAberto = negociando.reduce((a, d) => a + (d.valor || 0), 0)
  const agenda = agendaDaEmpresa(app, empresaId, hoje, amanha)
  const numeros = {
    conversas_hoje: doDia.length, contatos_novos: novos.length, aguardando_resposta: atencao.length,
    retornos_ate_amanha: retornos.length, valor_em_negociacao: brl(emAberto),
  }
  const sistema = "Você escreve o resumo do fim do dia para o dono de " + ctx.nome + ", que vai ler no celular. " +
    "Português do Brasil, texto simples, no máximo 12 linhas. Comece com uma linha de números do dia. " +
    "Depois \"Precisam de você:\" com até 5 contatos (nome e o que falta, em poucas palavras), " +
    "depois \"Amanhã:\" com compromissos e retornos. Se não houver nada numa parte, omita a parte. Não invente nada."
  const texto = "Data: " + hoje + "\nNúmeros: " + JSON.stringify(numeros) +
    "\n\nConversas de hoje:\n" + (doDia.slice(0, 60).map(linhaContato).join("\n") || "(nenhuma)") +
    "\n\nAguardando resposta da equipe:\n" + (atencao.slice(0, 30).map(linhaContato).join("\n") || "(ninguém)") +
    "\n\nRetornos combinados até amanhã:\n" + (retornos.slice(0, 30).map(linhaContato).join("\n") || "(nenhum)") +
    "\n\nAgenda de hoje e amanhã:\n" + (agenda.map((ev) => dataCurta(ev.data) + " " + (ev.hora || "") + " " + (ev.titulo || "")).join("\n") || "(vazia)")
  const saida = chama(app, cfg, "resumo", sistema, texto, false, 800)
  const res = { texto: saida, numeros: numeros, data: hoje, ts: Date.now() }
  cfg.set("resumo", res)
  app.save(cfg)
  try { postaChat(app, empresaId, "ia", "resumo", "Resumo do dia " + dataCurta(hoje) + "\n\n" + saida, "") } catch (e) {}
  return res
}

function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") }

// Manda o resumo por e-mail para o dono (e admins) da empresa.
function enviaResumoEmail(app, empresaId, res) {
  const users = app.findRecordsByFilter("users", "empresa = {:e} && (papel = 'dono' || papel = 'admin')", "", 20, 0, { e: empresaId })
  const meta = app.settings().meta
  users.forEach((u) => {
    const email = u.getString("email")
    if (!email) return
    const msg = new MailerMessage({
      from: { address: meta.senderAddress, name: meta.senderName || "AbertoCore" },
      to: [{ address: email }],
      subject: "Resumo do dia " + dataCurta(res.data) + " - AbertoCore",
      html: "<div style='font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap'>" + escHtml(res.texto) + "</div>" +
        "<p style='color:#777;font-size:12px'>Gerado pelo assistente de IA do AbertoCore. Veja tudo em <a href='https://app.abertodigital.com'>app.abertodigital.com</a>.</p>",
    })
    app.newMailClient().send(msg)
  })
  return users.length
}

function rodaResumoDia(app) {
  const cfgs = app.findRecordsByFilter("ia_config", "resumo_dia = true && api_key != ''", "", 100, 0)
  cfgs.forEach((cfg) => {
    try {
      const res = resumoDia(app, cfg)
      enviaResumoEmail(app, cfg.getString("empresa"), res)
    } catch (e) {
      app.logger().warn("ia: resumo do dia falhou", "empresa", cfg.getString("empresa"), "erro", String(e.message || e))
    }
  })
}

function usoDoMes(app, empresaId) {
  const ini = diaBR().slice(0, 8) + "01 03:00:00.000Z"
  const recs = app.findRecordsByFilter("ia_uso", "empresa = {:e} && created >= {:t}", "", 100000, 0, { e: empresaId, t: ini })
  const u = { chamadas: 0, erros: 0, tokens_in: 0, tokens_out: 0 }
  recs.forEach((r) => {
    if (r.getBool("ok")) u.chamadas++; else u.erros++
    u.tokens_in += r.getInt("tokens_in"); u.tokens_out += r.getInt("tokens_out")
  })
  return u
}

// ---------- usados pelas rotas ----------
function podeConfigurar(auth) { return auth.getString("papel") !== "equipe" }

function situacao(cfg, empresaId) {
  if (!cfg) return { conectada: false, provedor: "gemini", modelo: MODELO_PADRAO, crm_auto: true, resumo_dia: true, uso: usoDoMes($app, empresaId), resumo: null }
  let resumo = null
  try { resumo = JSON.parse(cfg.getString("resumo") || "null") } catch (e) {}
  return {
    conectada: !!cfg.getString("api_key"),
    provedor: cfg.getString("provedor") || "gemini",
    modelo: cfg.getString("modelo") || MODELO_PADRAO,
    final: cfg.getString("final_chave"),
    crm_auto: cfg.getBool("crm_auto"),
    resumo_dia: cfg.getBool("resumo_dia"),
    uso: usoDoMes($app, empresaId),
    resumo: resumo && resumo.texto ? resumo : null,
  }
}

function precisaCfg(empresaId) {
  const cfg = cfgDaEmpresa($app, empresaId)
  if (!cfg || !cfg.getString("api_key")) throw new BadRequestError("Conecte a IA primeiro: cole a chave da API em Atendimento automático → Assistente de IA.")
  return cfg
}


module.exports = {
  podeConfigurar, situacao, precisaCfg, postaChat, chatDaEmpresa,
  ETAPAS, MODELO_PADRAO, lerDados, cfgDaEmpresa, chamaGemini, chama, analisaContato, rodaCrm,
  perguntar, resumoDia, enviaResumoEmail, rodaResumoDia, usoDoMes, contextoEmpresa, conversa,
}

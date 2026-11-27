/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: assistente de IA interno
//   GET  /api/abertocore/ia            situação (conectada, modelo, final da chave, o que está ligado, uso do mês, último resumo)
//   POST /api/abertocore/ia            salva modelo, chave (testada antes) e opções; {remover:true} apaga a chave
//   GET  /api/abertocore/ia/chat       conversa "Assistente AbertoCore" (últimas 200 mensagens)
//   POST /api/abertocore/ia/perguntar  pergunta na conversa (pergunta e resposta ficam salvas)
//   POST /api/abertocore/ia/resumo     gera o resumo do dia agora
//   POST /api/abertocore/ia/analisar   atualiza o card de um contato agora
// Rotinas: "ia-crm" a cada 10 min (cards com mensagem nova) e "ia-resumo-dia" às 21:00 UTC (18h Brasília, por e-mail).

routerAdd("GET", "/api/abertocore/ia", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const empresaId = e.auth.getString("empresa")
  return e.json(200, I.situacao(I.cfgDaEmpresa($app, empresaId), empresaId))
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/ia", (e) => {
  const I = require(`${__hooks}/ia.js`)
  if (!I.podeConfigurar(e.auth)) throw new ForbiddenError("Só o dono da conta pode mudar a configuração da IA.")
  const empresaId = e.auth.getString("empresa")
  if (!empresaId) throw new BadRequestError("Usuário sem empresa.")
  const b = e.requestInfo().body || {}
  let cfg = I.cfgDaEmpresa($app, empresaId)
  if (!cfg) {
    cfg = new Record($app.findCollectionByNameOrId("ia_config"))
    cfg.set("empresa", empresaId); cfg.set("provedor", "gemini"); cfg.set("modelo", I.MODELO_PADRAO)
    cfg.set("crm_auto", true); cfg.set("resumo_dia", true)
  }
  const modelo = String(b.modelo || cfg.getString("modelo") || I.MODELO_PADRAO).trim()
  if (!/^[a-z0-9.\-]{3,80}$/i.test(modelo)) throw new BadRequestError("Nome de modelo inválido.")
  cfg.set("modelo", modelo)
  if (typeof b.crm_auto === "boolean") cfg.set("crm_auto", b.crm_auto)
  if (typeof b.resumo_dia === "boolean") cfg.set("resumo_dia", b.resumo_dia)

  if (typeof b.fonte_url === "string" && I.podeConfigurar(e.auth)) {
    const urls = I.urlsFonte(b.fonte_url)
    if (urls.length > 6) throw new BadRequestError("Use no máximo 6 abas.")
    const ruim = urls.find((u) => !I.validaUrlFonte(u))
    if (ruim) throw new BadRequestError("Link inválido. Use o link de \"Publicar na web\" da aba, no formato .csv (começa com https://docs.google.com/spreadsheets/d/e/).")
    cfg.set("fonte_url", urls.join("\n"))
    try { I.atualizaFonte($app, cfg) } catch (err) { throw new BadRequestError(String(err.message || err)) }
  }
  if (b.remover) { cfg.set("api_key", ""); cfg.set("final_chave", "") }
  const chave = String(b.chave || "").trim()
  if (chave) {
    if (chave.length < 20 || /\s/.test(chave)) throw new BadRequestError("Essa chave não parece completa. Copie de novo no Google AI Studio.")
    try { I.chamaGemini(chave, modelo, "Responda apenas: ok", "teste de conexão", false, 64) }
    catch (err) { throw new BadRequestError(String(err.message || err)) }
    cfg.set("api_key", chave); cfg.set("final_chave", chave.slice(-4))
  } else if (b.modelo && cfg.getString("api_key") && b.testar) {
    try { I.chamaGemini(cfg.getString("api_key"), modelo, "Responda apenas: ok", "teste de conexão", false, 64) }
    catch (err) { throw new BadRequestError(String(err.message || err)) }
  }
  $app.save(cfg)
  return e.json(200, I.situacao(cfg, empresaId))
}, $apis.requireAuth("users"))

routerAdd("GET", "/api/abertocore/ia/chat", (e) => {
  const I = require(`${__hooks}/ia.js`)
  return e.json(200, { msgs: I.chatDaEmpresa($app, e.auth.getString("empresa"), 200) })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/ia/perguntar", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const empresaId = e.auth.getString("empresa")
  const cfg = I.precisaCfg(empresaId)
  if (!I.internaLigada($app, empresaId)) throw new BadRequestError("A IA interna está desligada em Atendimento automático.")
  if (!require(`${__hooks}/atende.js`).recursoLigado($app, empresaId, "assistente")) throw new BadRequestError("O Assistente interno está desligado em Atendimento automático.")
  const p = String((e.requestInfo().body || {}).pergunta || "").trim()
  if (!p) throw new BadRequestError("Escreva uma pergunta.")
  const hist = I.chatDaEmpresa($app, empresaId, 8).filter((m) => m.tipo === "pergunta" || m.tipo === "resposta")
  const autor = e.auth.getString("name") || e.auth.getString("email").split("@")[0]
  const q = I.postaChat($app, empresaId, "eu", "pergunta", p, autor)
  let r
  try { r = I.postaChat($app, empresaId, "ia", "resposta", I.perguntar($app, cfg, p, hist), "") }
  catch (err) { r = I.postaChat($app, empresaId, "ia", "erro", "Não consegui responder: " + String(err.message || err), "") }
  return e.json(200, { pergunta: q, resposta: r })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/ia/resumo", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const cfg = I.precisaCfg(e.auth.getString("empresa"))
  if (!I.internaLigada($app, e.auth.getString("empresa"))) throw new BadRequestError("A IA interna está desligada em Atendimento automático.")
  try { return e.json(200, I.resumoDia($app, cfg)) }
  catch (err) { throw new BadRequestError(String(err.message || err)) }
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/abertocore/ia/analisar", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const empresaId = e.auth.getString("empresa")
  const cfg = I.precisaCfg(empresaId)
  if (!I.internaLigada($app, empresaId)) throw new BadRequestError("A IA interna está desligada em Atendimento automático.")
  const localId = parseInt((e.requestInfo().body || {}).contato, 10)
  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: localId }) }
  catch (err) { throw new NotFoundError("Contato não encontrado no servidor. Aguarde salvar e tente de novo.") }
  let ia
  try { ia = I.analisaContato($app, cfg, rec) }
  catch (err) { throw new BadRequestError(String(err.message || err)) }
  if (!ia) throw new BadRequestError("Este contato ainda não tem mensagens do cliente para analisar.")
  const atual = $app.findRecordById("contatos", rec.id)
  return e.json(200, { ia: ia, dados: I.lerDados(atual) })
}, $apis.requireAuth("users"))

cronAdd("ia-crm", "*/10 * * * *", () => {
  const I = require(`${__hooks}/ia.js`)
  const n = I.rodaCrm($app)
  if (n) $app.logger().info("ia: cards atualizados", "n", n)
})

cronAdd("ia-resumo-dia", "0 21 * * *", () => {
  const I = require(`${__hooks}/ia.js`)
  I.rodaResumoDia($app)
})

// assistência na caixa de mensagem: sugerir, resumir, reformular, tornar formal (o texto volta para a equipe revisar)
routerAdd("POST", "/api/abertocore/ia/assistir", (e) => {
  const I = require(`${__hooks}/ia.js`)
  const empresaId = e.auth.getString("empresa")
  const cfg = I.precisaCfg(empresaId)
  if (!I.internaLigada($app, empresaId)) throw new BadRequestError("A IA interna está desligada em Atendimento automático.")
  if (!require(`${__hooks}/atende.js`).recursoLigado($app, empresaId, "ajuda")) throw new BadRequestError("A ajuda da IA na caixa de mensagem está desligada em Atendimento automático.")
  const b = e.requestInfo().body || {}
  const localId = parseInt(b.contato, 10)
  const acao = String(b.acao || "")
  if (["sugerir", "resumir", "reformular", "formal"].indexOf(acao) < 0) throw new BadRequestError("Ação desconhecida.")
  let rec
  try { rec = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: localId }) }
  catch (err) { throw new NotFoundError("Contato não encontrado no servidor. Aguarde salvar e tente de novo.") }
  let texto
  try { texto = I.assistir($app, cfg, rec, acao, b.texto) }
  catch (err) { throw new BadRequestError(String(err.message || err)) }
  if (!texto) throw new BadRequestError("A IA não devolveu texto. Tente de novo.")
  return e.json(200, { texto: texto })
}, $apis.requireAuth("users"))

// custo de IA por contato (local_id -> chamadas, tokens, R$ aproximado)
routerAdd("GET", "/api/abertocore/ia/custos", (e) => {
  const I = require(`${__hooks}/ia.js`)
  return e.json(200, { contatos: I.custos($app, e.auth.getString("empresa")) })
}, $apis.requireAuth("users"))

// franquia de IA: avisos de 80%, 100% e 120% (uma vez por mês cada)
cronAdd("ia-franquia", "17 * * * *", () => {
  const I = require(`${__hooks}/ia.js`)
  I.avisaFranquias($app)
})

// base de conhecimento da planilha: atualiza a cada hora
cronAdd("ia-fonte", "41 * * * *", () => {
  const I = require(`${__hooks}/ia.js`)
  I.rodaFontes($app)
})

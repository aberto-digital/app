// AbertoCore: orçamento online (página pública com os produtos e serviços da empresa)
//   GET  /api/orcamento/{slug}        empresa, marca e produtos marcados para orçamento
//   POST /api/orcamento/{slug}/pedir  { itens:[{id,qtd}], nome, whatsapp, email, obs, consentimento }
//        cria (ou atualiza) o contato no funil com o pedido na conversa e avisa a equipe

routerAdd("GET", "/api/orcamento/{slug}", (e) => {
  const O = require(`${__hooks}/orcamento.js`)
  const A = require(`${__hooks}/agenda.js`)
  const r = O.porSlug($app, e.request.pathValue("slug"))
  if (!r) throw new NotFoundError("Orçamento online não encontrado ou desativado.")
  const emp = A.nomeEmpresa($app, r.empresaId)
  return e.json(200, {
    empresa: emp.nome, whatsapp: emp.whatsapp, site: emp.site, titulo: r.orc.titulo || "", aviso: r.orc.aviso || "",
    mostrarPrecos: r.orc.mostrarPrecos !== false, marca: A.marcaPublica(A.cfg($app, r.empresaId)),
    produtos: O.catalogo($app, r.empresaId, r.orc),
  })
})

routerAdd("POST", "/api/orcamento/{slug}/pedir", (e) => {
  const O = require(`${__hooks}/orcamento.js`)
  const A = require(`${__hooks}/agenda.js`)
  const S = require(`${__hooks}/site.js`)
  const b = e.requestInfo().body || {}
  if (b.site_url) return e.json(200, { ok: true }) // armadilha para robôs
  const r = O.porSlug($app, e.request.pathValue("slug"))
  if (!r) throw new NotFoundError("Orçamento online não encontrado.")
  S.limita($app, "orcamento|" + e.realIP(), 6, 3600000)
  const nome = S.limpa(b.nome, 120), tel = S.telefone(b.whatsapp), email = S.limpa(b.email, 160).toLowerCase(), obs = S.limpa(b.obs, 600)
  if (!nome || !tel) throw new BadRequestError("Preencha seu nome e WhatsApp.")
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestError("Confira o e-mail.")
  if (!b.consentimento) throw new BadRequestError("Marque a autorização para receber o retorno.")
  let calc
  try { calc = O.calcula(O.catalogo($app, r.empresaId, r.orc), b.itens) } catch (er) { throw new BadRequestError(String(er.message || er)) }
  const mostra = r.orc.mostrarPrecos !== false
  const emp = A.nomeEmpresa($app, r.empresaId)
  const resumo = O.textoPedido(calc, mostra)
  let resp = {}
  $app.runInTransaction((tx) => {
    let c = S.acharPorTelefone(tx, r.empresaId, tel), novo = false
    if (!c) { c = S.novoContato(tx, r.empresaId, { nome: nome, tel: tel, canal: "WhatsApp", origem: "Orçamento online" }); novo = true }
    const linhas = ["Pediu orçamento online:", resumo]
    if (email) linhas.push("E-mail: " + email)
    if (obs) linhas.push("Observação: " + obs)
    const dc = S.chegou(c, linhas.join("\n"))
    if (email && !dc.email) { dc.email = email; c.set("dados", dc) }
    tx.save(c)
    resp = { contato: c.getInt("local_id"), novo: novo }
  })
  if (email) A.emailCliente($app, r.empresaId, email, "Recebemos seu pedido de orçamento · " + emp.nome,
    "Olá, " + nome.split(" ")[0] + "!\n\nRecebemos seu pedido de orçamento:\n" + resumo + "\n\nEm breve entramos em contato." + (r.orc.aviso ? "\n\n" + r.orc.aviso : ""))
  S.avisaEquipe($app, r.empresaId, "Novo pedido de orçamento online: " + nome + " (" + tel + "), " + calc.itens + (calc.itens === 1 ? " item" : " itens") + (mostra && (calc.setup || calc.mensal) ? ", " + [calc.setup ? O.brl(calc.setup) : "", calc.mensal ? O.brl(calc.mensal) + "/mês" : ""].filter(Boolean).join(" + ") : "") + ".", resp.contato)
  return e.json(200, { ok: true, empresa: emp.nome, itens: calc.itens, setup: mostra ? calc.setup : null, mensal: mostra ? calc.mensal : null })
})

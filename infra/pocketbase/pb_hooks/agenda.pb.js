/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: agendamento online (rotas públicas, sem login) e lembretes
//   GET  /api/agenda/{slug}                     empresa, serviços e regras públicas
//   GET  /api/agenda/{slug}/dias?servico=       dias com horário livre
//   GET  /api/agenda/{slug}/horarios?data=&servico=
//   POST /api/agenda/{slug}/reservar            { servico, data, hora, nome, whatsapp, email, obs, consentimento }
//   GET  /api/agenda/reserva?token=             dados da reserva (página de cancelamento)
//   POST /api/agenda/cancelar                   { token }
//   cron agenda-lembretes (a cada 5 min): lembrete para o cliente (e-mail; WhatsApp se a conversa estiver aberta) e para o dono (push)

// endereço próprio: a página no domínio do cliente descobre qual agenda mostrar
routerAdd("GET", "/api/agenda-dominio", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  const r = A.porDominio($app, e.request.url.query().get("host"))
  if (!r) throw new NotFoundError("Nenhuma agenda usa este endereço.")
  return e.json(200, { slug: r.ag.slug })
})
// o Caddy pergunta antes de emitir o certificado HTTPS de um domínio novo
routerAdd("GET", "/api/agenda-dominio/ok", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  if (!A.porDominio($app, e.request.url.query().get("domain"))) throw new NotFoundError("não")
  return e.string(200, "ok")
})

routerAdd("GET", "/api/agenda/{slug}", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  const r = A.porSlug($app, e.request.pathValue("slug"))
  if (!r) throw new NotFoundError("Agenda não encontrada ou desativada.")
  const emp = A.nomeEmpresa($app, r.empresaId)
  return e.json(200, {
    empresa: emp.nome, whatsapp: emp.whatsapp, site: emp.site, titulo: r.ag.titulo || "", aviso: r.ag.aviso || "", marca: A.marcaPublica(r.ag),
    confirmacao: r.ag.confirmacao, limiteDias: r.ag.limiteDias, servicos: A.servicos($app, r.empresaId, r.ag),
  })
})

routerAdd("GET", "/api/agenda/{slug}/dias", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  const r = A.porSlug($app, e.request.pathValue("slug"))
  if (!r) throw new NotFoundError("Agenda não encontrada.")
  const sid = parseInt(e.request.url.query().get("servico"), 10) || 0
  const sv = A.servicos($app, r.empresaId, r.ag).filter((s) => s.id === sid)[0] || A.servicos($app, r.empresaId, r.ag)[0]
  return e.json(200, { dias: A.diasLivres($app, r.empresaId, r.ag, sv.dur) })
})

routerAdd("GET", "/api/agenda/{slug}/horarios", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  const r = A.porSlug($app, e.request.pathValue("slug"))
  if (!r) throw new NotFoundError("Agenda não encontrada.")
  const q = e.request.url.query()
  const sid = parseInt(q.get("servico"), 10) || 0
  const sv = A.servicos($app, r.empresaId, r.ag).filter((s) => s.id === sid)[0] || A.servicos($app, r.empresaId, r.ag)[0]
  return e.json(200, { horarios: A.horarios($app, r.empresaId, r.ag, String(q.get("data") || ""), sv.dur) })
})

routerAdd("POST", "/api/agenda/{slug}/reservar", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  const S = require(`${__hooks}/site.js`)
  const W = require(`${__hooks}/wa.js`)
  const b = e.requestInfo().body || {}
  if (b.site_url) return e.json(200, { ok: true }) // armadilha para robôs
  const r = A.porSlug($app, e.request.pathValue("slug"))
  if (!r) throw new NotFoundError("Agenda não encontrada.")
  S.limita($app, "agenda|" + e.realIP(), 6, 3600000)
  const nome = S.limpa(b.nome, 120), tel = S.telefone(b.whatsapp), email = S.limpa(b.email, 160).toLowerCase(), obs = S.limpa(b.obs, 500)
  if (!nome || !tel) throw new BadRequestError("Preencha seu nome e WhatsApp.")
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestError("Confira o e-mail.")
  if (!b.consentimento) throw new BadRequestError("Marque a autorização para receber a confirmação e os lembretes.")
  const sv = A.servicos($app, r.empresaId, r.ag).filter((s) => s.id === (parseInt(b.servico, 10) || 0))[0]
  if (!sv) throw new BadRequestError("Escolha o serviço.")
  const data = String(b.data || ""), hora = String(b.hora || "")
  if (A.horarios($app, r.empresaId, r.ag, data, sv.dur).indexOf(hora) < 0) throw new BadRequestError("Esse horário acabou de ser ocupado. Escolha outro.")
  const status = r.ag.confirmacao === "manual" ? "pendente" : "confirmado"
  const emp = A.nomeEmpresa($app, r.empresaId)
  let resp = {}
  $app.runInTransaction((tx) => {
    // contato: acha pelo WhatsApp ou cria
    let c = S.acharPorTelefone(tx, r.empresaId, tel), novo = false
    if (!c) { c = S.novoContato(tx, r.empresaId, { nome: nome, tel: tel, canal: "WhatsApp", origem: "Agendamento online" }); novo = true }
    const linhas = ["Agendou online: " + sv.nome + ", " + A.dataBonita(data) + " às " + hora + (status === "pendente" ? " (aguardando sua confirmação)" : "") + "."]
    if (email) linhas.push("E-mail: " + email)
    if (obs) linhas.push("Observação: " + obs)
    const dc = S.chegou(c, linhas.join("\n"))
    if (email && !dc.email) { dc.email = email; c.set("dados", dc) }
    tx.save(c)
    // evento
    const id = A.proximoEventoId(tx, r.empresaId), tok = A.token()
    const ev = new Record(tx.findCollectionByNameOrId("eventos"))
    ev.set("empresa", r.empresaId); ev.set("local_id", id); ev.set("titulo", sv.nome); ev.set("data", data)
    ev.set("dados", { id: id, contato: c.getInt("local_id"), titulo: sv.nome, data: data, hora: hora, tipo: "Agendamento online", dur: sv.dur, servico: sv.id,
      status: status, online: true, cliente: { nome: nome, tel: tel, email: email }, obs: obs, token: tok, criadoTs: Date.now() })
    tx.save(ev)
    resp = { contato: c.getInt("local_id"), token: tok, novo: novo }
  })
  // e-mail ao cliente e aviso ao dono (fora da transação: rede)
  const quando = A.dataBonita(data) + " às " + hora
  if (email) A.emailCliente($app, r.empresaId, email,
    (status === "pendente" ? "Recebemos seu pedido de horário" : "Horário confirmado") + " · " + emp.nome,
    "Olá, " + nome.split(" ")[0] + "!\n\n" + (status === "pendente"
      ? "Recebemos seu pedido para " + sv.nome + " em " + quando + ". Assim que for confirmado, você recebe outro e-mail."
      : "Seu horário de " + sv.nome + " está confirmado para " + quando + ".") +
    (r.ag.aviso ? "\n\n" + r.ag.aviso : "") + "\n\nPrecisa desmarcar? " + A.linkCancelar(resp.token, r.ag))
  S.avisaEquipe($app, r.empresaId, (status === "pendente" ? "Pedido de horário para confirmar: " : "Novo agendamento online: ") + nome + ", " + sv.nome + ", " + quando + " (" + tel + ").", resp.contato)
  return e.json(200, { ok: true, status: status, token: resp.token, servico: sv.nome, data: data, hora: hora, quando: quando, empresa: emp.nome })
})

routerAdd("GET", "/api/agenda/reserva", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  const W = require(`${__hooks}/wa.js`)
  const tok = String(e.request.url.query().get("token") || "")
  if (tok.length < 16) throw new NotFoundError("Reserva não encontrada.")
  const L = $app.findRecordsByFilter("eventos", "local_id >= 1000000 && data >= {:d}", "", 0, 0, { d: A.addDias(A.hojeSP(), -1) })
  const r = L.filter((x) => W.lerDados(x).token === tok)[0]
  if (!r) throw new NotFoundError("Reserva não encontrada.")
  const d = W.lerDados(r), emp = A.nomeEmpresa($app, r.getString("empresa"))
  return e.json(200, { empresa: emp.nome, servico: d.titulo, data: d.data, hora: d.hora, quando: A.dataBonita(d.data) + " às " + d.hora, status: d.status, nome: (d.cliente || {}).nome || "", site: emp.site, marca: A.marcaPublica(A.cfg($app, r.getString("empresa"))) })
})

routerAdd("POST", "/api/agenda/cancelar", (e) => {
  const A = require(`${__hooks}/agenda.js`)
  const S = require(`${__hooks}/site.js`)
  const W = require(`${__hooks}/wa.js`)
  const tok = String((e.requestInfo().body || {}).token || "")
  S.limita($app, "agcancel|" + e.realIP(), 10, 3600000)
  if (tok.length < 16) throw new NotFoundError("Reserva não encontrada.")
  const L = $app.findRecordsByFilter("eventos", "local_id >= 1000000 && data >= {:d}", "", 0, 0, { d: A.hojeSP() })
  const r = L.filter((x) => W.lerDados(x).token === tok)[0]
  if (!r) throw new NotFoundError("Reserva não encontrada ou já passou.")
  const d = W.lerDados(r)
  if (d.status === "cancelado") return e.json(200, { ok: true, status: "cancelado" })
  d.status = "cancelado"; d.canceladoPor = "cliente"; d.canceladoTs = Date.now()
  r.set("dados", d); $app.save(r)
  const quando = A.dataBonita(d.data) + " às " + d.hora, cli = d.cliente || {}
  S.avisaEquipe($app, r.getString("empresa"), "Horário desmarcado pelo cliente: " + (cli.nome || "") + ", " + d.titulo + ", " + quando + ".", d.contato)
  try {
    const c = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: r.getString("empresa"), l: d.contato })
    S.chegou(c, "Desmarcou pelo link: " + d.titulo + ", " + quando + "."); $app.save(c)
  } catch (err) {}
  return e.json(200, { ok: true, status: "cancelado" })
})

// o dono confirmou, recusou ou desmarcou no app: avisa o cliente por e-mail
onRecordAfterUpdateSuccess((e) => {
  e.next()
  try {
    const A = require(`${__hooks}/agenda.js`)
    const W = require(`${__hooks}/wa.js`)
    const d = W.lerDados(e.record), antes = W.lerDados(e.record.original())
    if (!d.online || !d.cliente || d.status === antes.status || d.canceladoPor === "cliente") return
    const emp = A.nomeEmpresa($app, e.record.getString("empresa")), quando = A.dataBonita(d.data) + " às " + d.hora
    const pn = String(d.cliente.nome || "").split(" ")[0]
    let assunto = "", txt = ""
    if (d.status === "confirmado") { assunto = "Horário confirmado"; txt = "Olá, " + pn + "! Seu horário de " + d.titulo + " está confirmado para " + quando + ".\n\nPrecisa desmarcar? " + A.linkCancelar(d.token, A.cfg($app, e.record.getString("empresa"))) }
    else if (d.status === "recusado") { assunto = "Não conseguimos confirmar seu horário"; txt = "Olá, " + pn + ". Infelizmente não conseguimos confirmar " + d.titulo + " em " + quando + ". Escolha outro horário ou fale com a gente." }
    else if (d.status === "cancelado") { assunto = "Horário desmarcado"; txt = "Olá, " + pn + ". Seu horário de " + d.titulo + " em " + quando + " foi desmarcado. Se quiser, escolha outro horário ou fale com a gente." }
    if (assunto && d.cliente.email) A.emailCliente($app, e.record.getString("empresa"), d.cliente.email, assunto + " · " + emp.nome, txt)
  } catch (err) { $app.logger().warn("agenda: aviso de mudança falhou", "erro", String(err)) }
}, "eventos")

cronAdd("agenda-lembretes", "*/5 * * * *", () => {
  const A = require(`${__hooks}/agenda.js`)
  const W = require(`${__hooks}/wa.js`)
  const P = require(`${__hooks}/push.js`)
  const cfgs = $app.findRecordsByFilter("configuracoes", "id != ''", "", 0, 0)
  const agora = Date.now(), hoje = A.hojeSP()
  cfgs.forEach((cr) => {
    const ag = Object.assign({}, A.PADRAO, W.lerDados(cr).agenda || {})
    if (!ag.ativo) return
    const empresaId = cr.getString("empresa"), emp = A.nomeEmpresa($app, empresaId)
    let evs = []
    try { evs = $app.findRecordsByFilter("eventos", "empresa = {:e} && data >= {:a} && data <= {:b}", "", 0, 0, { e: empresaId, a: hoje, b: A.addDias(hoje, 3) }) } catch (err) { return }
    evs.forEach((r) => {
      const d = W.lerDados(r)
      if (!d.hora || d.status === "cancelado" || d.status === "recusado" || d.status === "pendente") return
      const avisaCliente = d.lembrar !== false
      const ts = A.tsDe(d.data, d.hora), falta = (ts - agora) / 60000
      if (falta <= 0) return
      const base = r.id + "|" + d.data + "T" + d.hora
      let contato = null
      try { contato = $app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: d.contato }) } catch (err) {}
      const dc = contato ? W.lerDados(contato) : {}
      const nome = (d.cliente && d.cliente.nome) || dc.nome || "cliente"
      const email = (d.cliente && d.cliente.email) || dc.email || (dc.lead && dc.lead.email) || ""
      const quando = A.dataBonita(d.data) + " às " + d.hora
      ;(avisaCliente ? (ag.lembretesCliente || []) : []).forEach((m) => {
        if (!(falta <= m && falta > m - 60)) return
        if (A.jaEnviou($app, empresaId, base + "|c|" + m)) return
        const txt = "Olá, " + nome.split(" ")[0] + "! Passando para lembrar do seu horário " + A.antecedenciaTxt(m) + ": " + (d.titulo || "atendimento") + ", " + quando + (emp.nome ? ", com " + emp.nome : "") + "." + (ag.aviso ? "\n\n" + ag.aviso : "")
        const porWa = A.whatsCliente($app, empresaId, contato, txt)
        if (!porWa && email) A.emailCliente($app, empresaId, email, "Lembrete do seu horário · " + emp.nome, txt + (d.token ? "\n\nPrecisa desmarcar? " + A.linkCancelar(d.token, ag) : ""))
      })
      ;(ag.lembretesDono || []).forEach((m) => {
        if (!(falta <= m && falta > m - 60)) return
        if (A.jaEnviou($app, empresaId, base + "|d|" + m)) return
        P.notifica($app, empresaId, "agenda", { titulo: "Daqui " + A.antecedenciaTxt(m).replace(/^em /, "") + ": " + nome, corpo: (d.titulo || "Compromisso") + ", " + quando, url: "/#agenda", tag: "ev" + d.id })
      })
    })
  })
})

// todo dia às 8h (Brasília): avisa o dono dos retornos combinados de hoje e das manutenções que vencem na semana
cronAdd("retornos-do-dia", "0 11 * * *", () => {
  const A = require(`${__hooks}/agenda.js`)
  const W = require(`${__hooks}/wa.js`)
  const P = require(`${__hooks}/push.js`)
  const hoje = A.hojeSP(), semana = A.addDias(hoje, 7)
  let inscs = []
  try { inscs = $app.findRecordsByFilter("push_inscricoes", "id != ''", "", 0, 0) } catch (e) { return }
  const empresas = {}
  inscs.forEach((r) => { empresas[r.getString("empresa")] = 1 })
  Object.keys(empresas).forEach((empresaId) => {
    try {
      const contatos = $app.findRecordsByFilter("contatos", "empresa = {:e}", "", 0, 0, { e: empresaId }).map((r) => { const d = W.lerDados(r); d.id = r.getInt("local_id"); return d })
      const futuros = $app.findRecordsByFilter("eventos", "empresa = {:e} && data >= {:d}", "", 0, 0, { e: empresaId, d: hoje }).map((r) => W.lerDados(r))
      const fechado = (d) => d.status === "finalizado" || /perdid|desist/i.test(String(d.etapa || ""))
      const temHorario = (d) => futuros.some((ev) => ev.contato === d.id && ev.status !== "cancelado" && ev.status !== "recusado")
      const ret = contatos.filter((d) => d.followup && d.followup <= hoje && !fechado(d))
      const man = contatos.filter((d) => d.ficha && d.ficha.proxima && d.ficha.proxima <= semana && !fechado(d) && !temHorario(d))
      if (!ret.length && !man.length) return
      const nomes = (L) => L.slice(0, 4).map((d) => String(d.nome || "").split(" ")[0]).join(", ") + (L.length > 4 ? " e mais " + (L.length - 4) : "")
      const partes = []
      if (ret.length) partes.push(ret.length + (ret.length === 1 ? " retorno" : " retornos") + " para hoje: " + nomes(ret))
      if (man.length) partes.push(man.length + (man.length === 1 ? " manutenção vence" : " manutenções vencem") + " até " + semana.slice(8, 10) + "/" + semana.slice(5, 7) + " sem horário marcado: " + nomes(man))
      P.notifica($app, empresaId, "agenda", { titulo: "Bom dia! Quem chamar hoje", corpo: partes.join(". ") + ".", url: "/#agenda", tag: "retornos-" + hoje })
    } catch (e) { $app.logger().warn("retornos do dia falhou", "empresa", empresaId, "erro", String(e)) }
  })
})

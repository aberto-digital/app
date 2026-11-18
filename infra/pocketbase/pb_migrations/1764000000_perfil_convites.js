/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: perfil por empresa (segmento) + convites de acesso + 1ª cliente (Mega Hair Marcela)
//   empresas.perfil: o que muda de um negócio para outro (etapas do funil, tipos de compromisso,
//                    manutenção, textos). O app lê depois do login.
//   convites:        link de uso único para a pessoa criar a própria senha (ninguém mais sabe a senha).
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")
  empresas.fields.add(new JSONField({ name: "perfil", maxSize: 200000 }))
  app.save(empresas)

  const users = app.findCollectionByNameOrId("users")
  const convites = new Collection({
    type: "base",
    name: "convites",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "usuario", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "hash", required: true, max: 100, hidden: true },
      { type: "text", name: "expira", max: 30 },
      { type: "bool", name: "usado" },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_convites_hash ON convites (hash)"],
  })
  app.save(convites)

  // ---------- Mega Hair Marcela ----------
  const perfil = {
    segmento: "beleza",
    empresa: "Mega Hair Marcela",
    site: "megahairmarcela.com.br",
    responsavel: "Marcela",
    whatsapp: "+1 (561) 871-5434",
    email: "marcelaper@icloud.com",
    etapas: ["Novo contato", "Avaliação marcada", "Orçamento enviado", "Aplicação marcada", "Cliente", "Perdido"],
    coresEtapas: ["#AEB6C6", "#2F6FED", "#FFB020", "#B0417A", "#1F9D55", "#D64545"],
    etapaGanho: "Cliente",
    etapaPerda: "Perdido",
    descEtapas: "Avaliação marcada = combinou dia para avaliar o cabelo; Orçamento enviado = recebeu valor; Aplicação marcada = marcou a colocação; Cliente = já fez a aplicação; Perdido = desistiu",
    tiposEvento: ["Avaliação", "Aplicação", "Manutenção", "Remoção", "Outro"],
    metodos: { "Queratina": 60, "Microcápsula": 60, "Ponto americano": 40, "Fita adesiva": 45, "Outro": 60 },
    rotuloNegocio: "Serviço de interesse",
    exemploNegocio: "Ex.: Mega hair loiro, 60 cm",
    catalogo: false,
  }
  let emp
  try { emp = app.findFirstRecordByFilter("empresas", "nome = 'Mega Hair Marcela'") } catch (e) {
    emp = new Record(empresas)
    emp.set("nome", "Mega Hair Marcela")
  }
  emp.set("plano", "Completo")
  emp.set("ativa", true)
  emp.set("perfil", perfil)
  app.save(emp)

  const base = "Mega Hair Marcela: alongamento de cabelo (mega hair) em Arujá/SP, desde 2008.\n" +
    "Métodos: queratina, microcápsula, ponto americano e outros. Atende cabelo liso, ondulado, cacheado e afro, e loiros.\n" +
    "Atendimento em ateliê particular, com hora marcada (uma cliente por vez). O endereço é enviado na confirmação do horário.\n" +
    "Preço: depende do método, do comprimento e da quantidade de cabelo; a Marcela passa o valor depois da avaliação.\n" +
    "Manutenção: em média a cada 40 a 60 dias, conforme o método.\n" +
    "Próximo passo: marcar a avaliação com a Marcela (pedir nome e WhatsApp).\n" +
    "Passar para a Marcela: valor exato, horários livres, reclamação, cabelo com química recente ou couro cabeludo sensível."

  const confCol = app.findCollectionByNameOrId("configuracoes")
  let conf
  try { conf = app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: emp.id }) } catch (e) { conf = null }
  if (!conf) {
    conf = new Record(confCol)
    conf.set("empresa", emp.id)
    conf.set("dados", {
      ia: { ativo: true, nome: "Assistente da Mega Hair Marcela", tom: "Carinhoso e direto", horario: "Responde 24 horas. Passa para a Marcela quando precisa.", base: base, humano: true, agendar: true },
      msgsCanal: {}, prox: { c: 1, e: 1, p: 7 }, catalogoV: 99,
    })
    app.save(conf)

    const prodCol = app.findCollectionByNameOrId("produtos")
    const servicos = [
      ["Avaliação", "Análise do cabelo, escolha do método, da cor e do comprimento"],
      ["Aplicação: queratina", "Mega hair com pontos de queratina"],
      ["Aplicação: microcápsula", "Mega hair com microcápsulas, acabamento invisível"],
      ["Aplicação: ponto americano", "Mega hair costurado em ponto americano"],
      ["Manutenção", "Reposicionamento das mechas, conforme o método"],
      ["Remoção", "Retirada do mega hair com cuidado com os fios"],
    ]
    servicos.forEach((s, i) => {
      const p = new Record(prodCol)
      p.set("empresa", emp.id)
      p.set("local_id", i + 1)
      p.set("nome", s[0])
      p.set("tipo", "Serviço")
      p.set("dados", { id: i + 1, nome: s[0], tipo: "Serviço", setup: null, mensal: null, ds: s[1], ativo: true })
      app.save(p)
    })
  }

  // IA: usa a mesma chave do Gemini da abertodigital (o cliente não precisa ter conta no Google AI)
  try {
    const ad = app.findFirstRecordByFilter("empresas", "nome = 'abertodigital'")
    const fonte = app.findFirstRecordByFilter("ia_config", "empresa = {:e} && api_key != ''", { e: ad.id })
    let ic
    try { ic = app.findFirstRecordByFilter("ia_config", "empresa = {:e}", { e: emp.id }) } catch (e) { ic = new Record(app.findCollectionByNameOrId("ia_config")) }
    ic.set("empresa", emp.id)
    ic.set("provedor", fonte.getString("provedor") || "gemini")
    ic.set("modelo", fonte.getString("modelo"))
    ic.set("api_key", fonte.getString("api_key"))
    ic.set("final_chave", fonte.getString("final_chave"))
    ic.set("crm_auto", true)
    ic.set("resumo_dia", true)
    app.save(ic)
  } catch (e) {}

  // o objetivo do chat agora vem do contexto de cada site
  try {
    const cad = app.findFirstRecordByFilter("canais_site", "chave = 'abertodigital'")
    const t = cad.getString("contexto")
    if (t.indexOf("Próximo passo:") < 0) { cad.set("contexto", (t + "\nPróximo passo: oferecer a auditoria gratuita ou uma conversa com a equipe.").slice(0, 8000)); app.save(cad) }
  } catch (e) {}

  const canais = app.findCollectionByNameOrId("canais_site")
  let ch
  try { ch = app.findFirstRecordByFilter("canais_site", "chave = 'megahairmarcela'") } catch (e) { ch = new Record(canais) }
  ch.set("empresa", emp.id)
  ch.set("chave", "megahairmarcela")
  ch.set("ativo", true)
  ch.set("ia", true)
  ch.set("saudacao", "Oi{nome}! Que bom te ver por aqui 💛 A Marcela responde assim que sair do atendimento. Se preferir, deixe seu WhatsApp que ela chama você lá.")
  ch.set("contexto", base)
  app.save(ch)
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("convites")) } catch (e) {}
  try { app.delete(app.findFirstRecordByFilter("canais_site", "chave = 'megahairmarcela'")) } catch (e) {}
  const empresas = app.findCollectionByNameOrId("empresas")
  empresas.fields.removeByName("perfil")
  app.save(empresas)
})

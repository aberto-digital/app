/// <reference path="../pb_data/types.d.ts" />
// Mega Hair Marcela: preços reais, manutenção a cada 90 dias e avaliação grátis (online ou no ateliê)
migrate((app) => {
  let emp
  try { emp = app.findFirstRecordByFilter("empresas", "nome = 'Mega Hair Marcela'") } catch (e) { return }

  let perfil = {}
  try { perfil = JSON.parse(emp.getString("perfil") || "{}") || {} } catch (e) {}
  perfil.metodos = { "Queratina": 90, "Microcápsula": 90, "Ponto americano": 90, "Fita adesiva": 90, "Outro": 90 }
  perfil.email = "contato@megahairmarcela.com.br"
  emp.set("perfil", perfil)
  app.save(emp)

  const base = "Mega Hair Marcela: alongamento de cabelo (mega hair) em Arujá/SP, desde 2008.\n" +
    "Métodos: queratina, microcápsula, ponto americano e outros. Atende cabelo liso, ondulado, cacheado e afro, e loiros.\n" +
    "Atendimento em ateliê particular, com hora marcada (uma cliente por vez). O endereço é enviado na confirmação do horário.\n" +
    "Avaliação: grátis. Pode ser online (a cliente manda fotos do cabelo pelo WhatsApp) ou presencial no ateliê, para ver o cabelo antes de decidir.\n" +
    "Preços (cabelo + aplicação inclusos): cabelo indiano a partir de R$ 1.800; cabelo brasileiro a partir de R$ 4.500. O valor final depende dos gramas e do comprimento e é confirmado na avaliação.\n" +
    "Manutenção: de R$ 600 a R$ 800 conforme o volume, a cada 3 meses (90 dias) em média.\n" +
    "Próximo passo: marcar a avaliação grátis (pedir nome e WhatsApp; perguntar se prefere online ou no ateliê).\n" +
    "Passar para a Marcela: valor exato de um caso específico, horários livres, reclamação, cabelo com química recente ou couro cabeludo sensível."

  try {
    const ch = app.findFirstRecordByFilter("canais_site", "chave = 'megahairmarcela'")
    ch.set("contexto", base)
    ch.set("saudacao", "Oi{nome}! Que bom te ver por aqui 💛 A avaliação é grátis, online ou no ateliê. Me conta o que você quer fazer no cabelo. Se preferir, deixe seu WhatsApp que a Marcela chama você lá.")
    app.save(ch)
  } catch (e) {}

  try {
    const conf = app.findFirstRecordByFilter("configuracoes", "empresa = {:e}", { e: emp.id })
    const d = JSON.parse(conf.getString("dados") || "{}") || {}
    d.ia = d.ia || {}
    d.ia.base = base
    conf.set("dados", d)
    app.save(conf)
  } catch (e) {}

  const precos = {
    "Avaliação": [0, "Grátis. Online (fotos pelo WhatsApp) ou no ateliê"],
    "Aplicação: queratina": [1800, "Cabelo + aplicação. A partir de R$ 1.800 (indiano); brasileiro a partir de R$ 4.500"],
    "Aplicação: microcápsula": [1800, "Cabelo + aplicação. A partir de R$ 1.800 (indiano); brasileiro a partir de R$ 4.500"],
    "Aplicação: ponto americano": [1800, "Cabelo + aplicação. A partir de R$ 1.800 (indiano); brasileiro a partir de R$ 4.500"],
    "Manutenção": [600, "De R$ 600 a R$ 800 conforme o volume, a cada 3 meses"],
  }
  app.findRecordsByFilter("produtos", "empresa = {:e}", "", 50, 0, { e: emp.id }).forEach((p) => {
    const nome = p.getString("nome")
    if (!precos[nome]) return
    let d = {}
    try { d = JSON.parse(p.getString("dados") || "{}") || {} } catch (e) {}
    d.setup = precos[nome][0]
    d.ds = precos[nome][1]
    p.set("dados", d)
    app.save(p)
  })
}, (app) => {})

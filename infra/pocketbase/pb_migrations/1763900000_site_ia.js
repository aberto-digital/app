/// <reference path="../pb_data/types.d.ts" />
// Chat do site: atendimento pela IA (24h) e informações que a IA usa para responder
migrate((app) => {
  const c = app.findCollectionByNameOrId("canais_site")
  c.fields.add(new BoolField({ name: "ia" }))
  c.fields.add(new TextField({ name: "contexto", max: 8000 }))
  app.save(c)
  try {
    const r = app.findFirstRecordByFilter("canais_site", "chave = 'abertodigital'")
    r.set("ia", true)
    r.set("saudacao", "Oi{nome}! Recebemos sua mensagem 🙂 Nossa equipe responde por aqui mesmo, de segunda a sexta, das 10h às 16h. Se preferir, deixe seu WhatsApp que a gente chama você lá.")
    r.set("contexto", [
      "A abertodigital é uma agência de presença digital de Arujá/SP (MEI, CNPJ 70.156.191/0001-60). Atende Arujá e região, presencial e remoto. Responsável: Julio. WhatsApp (11) 99123-3627. Site abertodigital.com. Equipe humana responde de segunda a sexta, das 10h às 16h; o chat do site responde 24h.",
      "O que fazemos: perfil no Google (Maps), site, WhatsApp Business com catálogo e chatbot, identidade visual, Instagram, e o AbertoCore, nosso sistema que junta conversas de WhatsApp, Instagram, Facebook, e-mail e site numa caixa só, com funil de clientes, agenda e IA que organiza os clientes e manda o resumo do dia às 18h.",
      "Auditoria gratuita: diagnóstico de 1 página do Google, WhatsApp, site e redes do negócio, com nota de 0 a 100 e os pontos que estão fazendo perder clientes, com a nossa solução para cada um. Sem compromisso, entregue em até 2 dias. Para pedir: nome do negócio, cidade e WhatsApp.",
      "Pacotes (implantação + mensalidade). Start: R$ 650 + R$ 49/mês (ou 12x de R$ 34,30 no plano de 12 meses). Perfil no Google otimizado e verificado, site de 1 página com botão de WhatsApp, domínio no 1º ano, hospedagem e 1 alteração por mês. Entrega em 7 dias úteis.",
      "Presença (o mais escolhido): R$ 1.650 + R$ 150/mês (ou 12x de R$ 105 no plano de 12 meses). Tudo do Start + logo e identidade visual, relatório mensal do Google, 1º mês de acompanhamento com reunião, WhatsApp Business com catálogo e respostas rápidas, AbertoCore para até 2 usuários e chatbot de menu com botões. Entrega em 15 dias úteis.",
      "Completo: R$ 3.500 + R$ 450/mês (ou 12x de R$ 315 no plano de 12 meses). Tudo do Presença + IA que atende sozinha 24h, qualifica e agenda; Instagram, Facebook e e-mail na mesma caixa; agendamento online; campanhas para quem já comprou; AbertoCore sem limite de usuários. Entrega em 30 dias úteis.",
      "Planos: mensal sem fidelidade (cancela com 30 dias de aviso), 6 meses com 15% de desconto na mensalidade, 12 meses com 30%. Também há módulos avulsos (ex.: vídeos curtos, gestão de Instagram, identidade visual); valores sob consulta com a equipe. Nada vai ao ar sem aprovação do cliente e a entrega vem com um passo a passo de uso. Custos de terceiros, como mensagens do WhatsApp acima da cota gratuita da Meta, ficam por conta do cliente.",
    ].join("\n"))
    app.save(r)
  } catch (e) {}
}, (app) => {
  const c = app.findCollectionByNameOrId("canais_site")
  c.fields.removeByName("ia"); c.fields.removeByName("contexto")
  app.save(c)
})

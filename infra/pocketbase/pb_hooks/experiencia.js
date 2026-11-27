// AbertoCore: IA do "Link de experiência" (demo que a abertodigital manda para leads).
// O visitante conversa no site modelo e a IA responde como atendente do negócio do lead.
// Usa a chave de IA da conta abertodigital. Não grava a conversa.
// Limites: 30 mensagens por hora por IP, 20 mensagens do cliente por conversa,
// 12 mensagens de histórico (500 caracteres cada), 40 itens, resposta de até 300 tokens.

const MAX_HORA = 30, MAX_CONVERSA = 20, MAX_MSGS = 12, MAX_TXT = 500, MAX_TOKENS = 300, MAX_DIA = 300

// Catálogo de cada nicho, guardado no servidor: o que o visitante manda NÃO entra na instrução da IA.
// m = modelo (pedido | agendamento | orcamento). Pedido e agendamento: preço (R$) e usd; agendamento: dur (min),
// abre/fecha (horário). Orçamento: faixa de/ate (R$) e deUsd/ateUsd.
// Precisa ser igual a experiencia/nichos.js (o teste tests/experiencia/ia.test.js confere).
const CATALOGO = {"pizzaria":{"m":"pedido","itens":[{"cat":"Pizzas","catEn":"Pizzas","pt":"Mussarela","en":"Mozzarella","preco":44.9,"usd":16.9},{"cat":"Pizzas","catEn":"Pizzas","pt":"Calabresa","en":"Pepperoni","preco":49.9,"usd":18.9},{"cat":"Pizzas","catEn":"Pizzas","pt":"Margherita","en":"Margherita","preco":54.9,"usd":19.9},{"cat":"Pizzas","catEn":"Pizzas","pt":"Portuguesa","en":"Ham & egg","preco":52.9,"usd":19.5},{"cat":"Pizzas","catEn":"Pizzas","pt":"Frango com catupiry","en":"Chicken & cream cheese","preco":54.9,"usd":19.9},{"cat":"Doces","catEn":"Desserts","pt":"Pizza de chocolate","en":"Chocolate pizza","preco":42.9,"usd":15.9},{"cat":"Bebidas","catEn":"Drinks","pt":"Refrigerante 2 L","en":"Soda 2 L","preco":14,"usd":3.5},{"cat":"Bebidas","catEn":"Drinks","pt":"Suco natural 500 ml","en":"Fresh juice 16 oz","preco":10,"usd":4.5}]},"hamburgueria":{"m":"pedido","itens":[{"cat":"Lanches","catEn":"Burgers","pt":"Smash clássico","en":"Classic smash","preco":29.9,"usd":9.9},{"cat":"Lanches","catEn":"Burgers","pt":"Smash duplo","en":"Double smash","preco":36.9,"usd":12.9},{"cat":"Lanches","catEn":"Burgers","pt":"Bacon burger","en":"Bacon burger","preco":38.9,"usd":13.5},{"cat":"Lanches","catEn":"Burgers","pt":"Chicken crispy","en":"Crispy chicken","preco":32.9,"usd":11.5},{"cat":"Acompanhamentos","catEn":"Sides","pt":"Batata frita","en":"Fries","preco":14.9,"usd":4.5},{"cat":"Acompanhamentos","catEn":"Sides","pt":"Onion rings","en":"Onion rings","preco":18.9,"usd":5.5},{"cat":"Bebidas","catEn":"Drinks","pt":"Refrigerante lata","en":"Canned soda","preco":7,"usd":2.5},{"cat":"Bebidas","catEn":"Drinks","pt":"Milkshake","en":"Milkshake","preco":19.9,"usd":6.5}]},"doceria":{"m":"pedido","itens":[{"cat":"Docinhos","catEn":"Sweets","pt":"Brigadeiro gourmet","en":"Gourmet brigadeiro","preco":28,"usd":10},{"cat":"Docinhos","catEn":"Sweets","pt":"Beijinho","en":"Coconut kisses","preco":26,"usd":9.5},{"cat":"Docinhos","catEn":"Sweets","pt":"Casadinho","en":"Casadinho","preco":30,"usd":11},{"cat":"Docinhos","catEn":"Sweets","pt":"Cajuzinho","en":"Cajuzinho","preco":26,"usd":9.5},{"cat":"Docinhos","catEn":"Sweets","pt":"Trufas recheadas","en":"Filled truffles","preco":38,"usd":14},{"cat":"Salgados","catEn":"Savory snacks","pt":"Coxinha de frango","en":"Chicken coxinha","preco":22,"usd":8},{"cat":"Salgados","catEn":"Savory snacks","pt":"Kibe","en":"Kibbeh","preco":22,"usd":8},{"cat":"Salgados","catEn":"Savory snacks","pt":"Empadinha","en":"Mini pie","preco":28,"usd":10},{"cat":"Salgados","catEn":"Savory snacks","pt":"Esfiha aberta","en":"Open esfiha","preco":26,"usd":9.5},{"cat":"Salgados","catEn":"Savory snacks","pt":"Pastelzinho","en":"Mini pastel","preco":24,"usd":9},{"cat":"Salgados","catEn":"Savory snacks","pt":"Risole de camarão","en":"Shrimp rissole","preco":30,"usd":11},{"cat":"Para a festa","catEn":"For parties","pt":"Cento de salgados variados","en":"Hundred mixed snacks","preco":120,"usd":45},{"cat":"Para a festa","catEn":"For parties","pt":"Kit festa (50 docinhos + 50 salgados)","en":"Party kit (50 sweets + 50 snacks)","preco":125,"usd":48},{"cat":"Bebidas","catEn":"Drinks","pt":"Refrigerante 2 L","en":"Soda 2 L","preco":14,"usd":3.5},{"cat":"Bebidas","catEn":"Drinks","pt":"Suco natural 500 ml","en":"Fresh juice 16 oz","preco":10,"usd":4.5}]},"estetica":{"m":"agendamento","itens":[{"cat":"Sobrancelhas e cílios","catEn":"Brows & lashes","pt":"Design de sobrancelhas","en":"Brow shaping","preco":60,"usd":35,"dur":45},{"cat":"Sobrancelhas e cílios","catEn":"Brows & lashes","pt":"Sobrancelha com henna","en":"Brow henna tint","preco":80,"usd":45,"dur":60},{"cat":"Sobrancelhas e cílios","catEn":"Brows & lashes","pt":"Lash lifting","en":"Lash lift","preco":120,"usd":75,"dur":60},{"cat":"Sobrancelhas e cílios","catEn":"Brows & lashes","pt":"Extensão de cílios fio a fio","en":"Classic lash extensions","preco":180,"usd":120,"dur":120},{"cat":"Unhas","catEn":"Nails","pt":"Manicure","en":"Manicure","preco":35,"usd":25,"dur":45},{"cat":"Unhas","catEn":"Nails","pt":"Pé e mão","en":"Mani + pedi","preco":60,"usd":45,"dur":90},{"cat":"Pele","catEn":"Skin","pt":"Limpeza de pele","en":"Facial cleansing","preco":150,"usd":95,"dur":90}],"abre":9,"fecha":19,"info":"Segunda a sábado · 9h às 19h","infoEn":"Monday to Saturday · 9 am to 7 pm"},"barbearia":{"m":"agendamento","itens":[{"cat":"Cabelo e barba","catEn":"Hair & beard","pt":"Corte","en":"Haircut","preco":45,"usd":30,"dur":40},{"cat":"Cabelo e barba","catEn":"Hair & beard","pt":"Barba","en":"Beard trim","preco":35,"usd":20,"dur":30},{"cat":"Cabelo e barba","catEn":"Hair & beard","pt":"Corte + barba","en":"Cut + beard","preco":70,"usd":45,"dur":70},{"cat":"Cabelo e barba","catEn":"Hair & beard","pt":"Pezinho","en":"Line-up","preco":15,"usd":10,"dur":15},{"cat":"Cabelo e barba","catEn":"Hair & beard","pt":"Sobrancelha","en":"Eyebrows","preco":15,"usd":10,"dur":15}],"abre":9,"fecha":20,"info":"Segunda a sábado · 9h às 20h","infoEn":"Monday to Saturday · 9 am to 8 pm"},"pilates":{"m":"agendamento","itens":[{"cat":"Pilates","catEn":"Pilates","pt":"Aula experimental","en":"Trial class","preco":0,"usd":0,"dur":50},{"cat":"Pilates","catEn":"Pilates","pt":"Aula de pilates","en":"Pilates class","preco":80,"usd":45,"dur":50},{"cat":"Fisioterapia","catEn":"Physical therapy","pt":"Avaliação postural","en":"Posture assessment","preco":120,"usd":90,"dur":60},{"cat":"Fisioterapia","catEn":"Physical therapy","pt":"Sessão de fisioterapia","en":"PT session","preco":130,"usd":95,"dur":50}],"abre":7,"fecha":20,"info":"Segunda a sábado · 7h às 20h","infoEn":"Monday to Saturday · 7 am to 8 pm"},"mecanica":{"m":"orcamento","itens":[{"cat":"Serviços","catEn":"Services","pt":"Revisão completa","en":"Full service","de":350,"ate":900,"deUsd":150,"ateUsd":400},{"cat":"Serviços","catEn":"Services","pt":"Freios","en":"Brakes","de":250,"ate":700,"deUsd":150,"ateUsd":450},{"cat":"Serviços","catEn":"Services","pt":"Suspensão","en":"Suspension","de":400,"ate":1200,"deUsd":300,"ateUsd":900},{"cat":"Serviços","catEn":"Services","pt":"Troca de óleo","en":"Oil change","de":150,"ate":300,"deUsd":50,"ateUsd":120},{"cat":"Serviços","catEn":"Services","pt":"Ar-condicionado","en":"A/C","de":200,"ate":600,"deUsd":120,"ateUsd":350},{"cat":"Serviços","catEn":"Services","pt":"Diagnóstico (luz no painel)","en":"Diagnostics (warning light)","de":120,"ate":400,"deUsd":80,"ateUsd":200}]},"vidracaria":{"m":"orcamento","itens":[{"cat":"Serviços","catEn":"Services","pt":"Box para banheiro","en":"Shower enclosure","de":900,"ate":1800,"deUsd":800,"ateUsd":1800},{"cat":"Serviços","catEn":"Services","pt":"Janela ou porta de vidro","en":"Glass window or door","de":700,"ate":2500,"deUsd":600,"ateUsd":2500},{"cat":"Serviços","catEn":"Services","pt":"Espelho sob medida","en":"Custom mirror","de":250,"ate":900,"deUsd":200,"ateUsd":700},{"cat":"Serviços","catEn":"Services","pt":"Portão ou grade","en":"Gate or railing","de":1200,"ate":4500,"deUsd":1200,"ateUsd":4500},{"cat":"Serviços","catEn":"Services","pt":"Cobertura de vidro","en":"Glass canopy","de":2500,"ate":8000,"deUsd":2500,"ateUsd":8000},{"cat":"Serviços","catEn":"Services","pt":"Manutenção e troca de vidro","en":"Repair or glass replacement","de":150,"ate":500,"deUsd":150,"ateUsd":450}]},"reformas":{"m":"orcamento","itens":[{"cat":"Serviços","catEn":"Services","pt":"Pintura","en":"Painting","de":800,"ate":3500,"deUsd":600,"ateUsd":3500},{"cat":"Serviços","catEn":"Services","pt":"Elétrica","en":"Electrical","de":150,"ate":1200,"deUsd":150,"ateUsd":1200},{"cat":"Serviços","catEn":"Services","pt":"Hidráulica","en":"Plumbing","de":150,"ate":1000,"deUsd":150,"ateUsd":1000},{"cat":"Serviços","catEn":"Services","pt":"Piso e revestimento","en":"Flooring & tile","de":1500,"ate":6000,"deUsd":1500,"ateUsd":6000},{"cat":"Serviços","catEn":"Services","pt":"Reforma de banheiro","en":"Bathroom remodel","de":4000,"ate":15000,"deUsd":5000,"ateUsd":15000},{"cat":"Serviços","catEn":"Services","pt":"Pequenos reparos","en":"Small repairs","de":120,"ate":400,"deUsd":100,"ateUsd":350}]}}

const PRONTAS = {
  pt: {
    pizzaria: "Oi! Agora estou com muitas mensagens. Você pode montar seu pedido pelo cardápio aqui no site: é só tocar no + das pizzas.",
    hamburgueria: "Oi! Agora estou com muitas mensagens. Monte seu pedido pelo cardápio aqui no site: toque no + dos lanches.",
    doceria: "Oi! Agora estou com muitas mensagens. Monte seu pedido pelo cardápio aqui no site: toque nos docinhos e salgados que quiser.",
    agendamento: "Oi! Agora estou com muitas mensagens. Você pode escolher o serviço e o horário aqui no site: toque em Agendar.",
    orcamento: "Oi! Agora estou com muitas mensagens. Você pode pedir seu orçamento aqui no site: escolha o serviço e mande as fotos.",
    padrao: "Oi! Agora estou com muitas mensagens. Você pode seguir pelo site, é rapidinho.",
  },
  en: {
    pizzaria: "Hi! I'm handling a lot of messages right now. You can build your order from the menu on this page: just tap the + on the pizzas.",
    hamburgueria: "Hi! I'm handling a lot of messages right now. Build your order from the menu on this page: tap the + on the burgers.",
    doceria: "Hi! I'm handling a lot of messages right now. Build your order from the menu on this page: tap the sweets and snacks you want.",
    agendamento: "Hi! I'm handling a lot of messages right now. You can pick the service and the time on this page: tap Book.",
    orcamento: "Hi! I'm handling a lot of messages right now. You can request your quote on this page: pick the service and send photos.",
    padrao: "Hi! I'm handling a lot of messages right now. You can keep going on this page, it only takes a minute.",
  },
}

function txt(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) }
function idioma(l) { return l === "en" ? "en" : "pt" }
function nicho(n) { return /^[a-z-]{2,30}$/.test(String(n || "")) ? String(n) : "padrao" }

function respostaPronta(n, l) {
  const p = PRONTAS[idioma(l)], k = nicho(n)
  return p[k] || (CATALOGO[k] && p[CATALOGO[k].m]) || p.padrao
}

function reais(v) { return "R$ " + v.toFixed(2).replace(".", ",") }
function dolar(v) { return "$" + v.toFixed(2) }

// Monta a instrução fixa (sistema) e o texto com o histórico, já limitados.
function monta(b) {
  b = b && typeof b === "object" ? b : {}
  const l = idioma(b.l)
  // nome e cidade: só letras, números, espaço e pontuação simples (nada de quebra de linha ou chaves)
  const seguro = (v, max) => txt(v, max).replace(/[^A-Za-z0-9À-ÿ .,'&\-]/g, "").trim()
  const nome = seguro(b.nome, 40) || (l === "en" ? "the business" : "o negócio")
  const cidade = seguro(b.cidade, 40)
  const C = CATALOGO[nicho(b.n)] || CATALOGO.pizzaria, en = l === "en"
  const itens = C.itens.map((i) => {
    const cat = en ? i.catEn : i.cat, nm = en ? i.en : i.pt
    if (C.m === "orcamento") return "- " + nm + " — " + (en ? "from " + dolar(i.deUsd) + " to " + dolar(i.ateUsd) : "de " + reais(i.de) + " a " + reais(i.ate))
    const pr = en ? i.usd : i.preco, valor = pr ? (en ? dolar(pr) : reais(pr)) : (en ? "free" : "grátis")
    return "- " + cat + ": " + nm + (i.dur ? " (" + i.dur + " min)" : "") + " — " + valor
  })
  const msgs = (Array.isArray(b.msgs) ? b.msgs : []).filter((m) => m && typeof m === "object").slice(-MAX_MSGS)
  const onde = cidade ? (en ? " in " + cidade : ", em " + cidade) : ""
  const papel = en
    ? "You are the customer service assistant of " + nome + onde + ", chatting on its website. Reply in English, short (up to 3 sentences), friendly."
    : "Você é o atendente virtual de " + nome + onde + ", conversando pelo site. Responda em português do Brasil, curto (até 3 frases), simpático."
  const demo = en
    ? "This is a demonstration made by abertodigital: if asked about real payment, real visits or real appointments, say kindly that this page is a demonstration."
    : "Esta página é uma demonstração feita pela abertodigital: se perguntarem sobre pagamento, visita ou atendimento de verdade, diga com gentileza que é uma demonstração."
  let regras, titulo
  if (C.m === "agendamento") {
    titulo = en ? "Services (duration and price):" : "Serviços (duração e preço):"
    regras = en
      ? ["Opening hours: " + C.infoEn + ".", "Use only the services, durations and prices below. Do not invent prices, services, promotions or free slots.", "Do not confirm a time in the chat: guide the customer to book on this page (tap Book on the service, pick the day and the time)."]
      : ["Horário de atendimento: " + C.info + ".", "Use só os serviços, durações e preços abaixo. Não invente preços, serviços, promoções nem horários livres.", "Não confirme horário pelo chat: leve o cliente a agendar pelo próprio site (tocar em Agendar no serviço e escolher o dia e o horário)."]
  } else if (C.m === "orcamento") {
    titulo = en ? "Services (reference price range):" : "Serviços (faixa de preço de referência):"
    regras = en
      ? ["The prices below are reference ranges only. Never give a closed price: the final quote depends on the details and photos.", "Do not invent services, prices, deadlines or promises.", "Guide the customer to request the quote on this page (tap Quote on the service, answer the questions and send photos)."]
      : ["Os valores abaixo são só uma faixa de referência. Nunca dê preço fechado: o valor final depende dos detalhes e das fotos.", "Não invente serviços, preços, prazos nem promessas.", "Leve o cliente a pedir o orçamento pelo próprio site (tocar em Orçamento no serviço, responder as perguntas e mandar fotos)."]
  } else {
    titulo = en ? "Menu:" : "Cardápio:"
    regras = en
      ? ["Use only the menu and prices below. Do not invent prices, products, promotions, delivery times or promises.", "Help the customer choose and guide them to place the order on this page (tap + on the items, then checkout)."]
      : ["Use só o cardápio e os preços abaixo. Não invente preços, produtos, promoções, prazos de entrega nem promessas.", "Ajude o cliente a escolher e leve ao pedido pelo próprio site (tocar no + dos itens e finalizar)."]
  }
  const sistema = [papel].concat(regras, [demo, "", titulo, itens.join("\n") || (en ? "(no items)" : "(sem itens)")]).join("\n")
  const quem = (m) => m.de === "cli" ? (l === "en" ? "Customer" : "Cliente") : (l === "en" ? "Assistant" : "Atendente")
  const texto = msgs.map((m) => quem(m) + ": " + txt(m.txt, MAX_TXT)).join("\n") + "\n\n" + (l === "en" ? "Reply to the customer's last message." : "Responda à última mensagem do cliente.")
  return { sistema: sistema, texto: texto, l: l, n: nicho(b.n), nCli: msgs.length ? (Array.isArray(b.msgs) ? b.msgs : []).filter((m) => m && m.de === "cli").length : 0 }
}

// Conta uma mensagem do IP na janela de 1 hora; devolve false se passou do limite.
function dentroDoLimite(app, ip) {
  const st = app.store(), agora = Date.now(), k = "lim:exp|" + String(ip || "?")
  let v = st.get(k)
  if (!v || agora - v.ini > 3600000) v = { ini: agora, n: 0 }
  v.n++
  st.set(k, v)
  if (v.n > MAX_HORA) return false
  // teto diário de todas as demos juntas: protege a chave do Gemini, que é a mesma do atendimento real
  const dia = new Date(agora - 3 * 3600000).toISOString().slice(0, 10)
  let g = st.get("lim:exp-dia")
  if (!g || g.dia !== dia) g = { dia: dia, n: 0 }
  g.n++
  st.set("lim:exp-dia", g)
  return g.n <= MAX_DIA
}

// Responde a uma mensagem do chat da demo. Nunca lança erro: devolve { texto, limite }.
function responde(app, b, ip) {
  const m = monta(b)
  if (m.nCli > MAX_CONVERSA || !dentroDoLimite(app, ip)) return { texto: respostaPronta(m.n, m.l), limite: true }
  try {
    const IA = require(`${__hooks}/ia.js`)
    const emp = app.findFirstRecordByFilter("empresas", "nome = 'abertodigital'")
    const cfg = IA.cfgDaEmpresa(app, emp.id)
    if (!cfg) throw new Error("IA da abertodigital não configurada")
    const r = txt(IA.chama(app, cfg, "experiencia", m.sistema, m.texto, false, MAX_TOKENS), 1200)
    return { texto: r || respostaPronta(m.n, m.l), limite: false }
  } catch (e) {
    try { app.logger().warn("experiencia: IA falhou", "erro", String(e)) } catch (x) {}
    return { texto: respostaPronta(m.n, m.l), limite: false }
  }
}

module.exports = { monta, responde, respostaPronta, CATALOGO }

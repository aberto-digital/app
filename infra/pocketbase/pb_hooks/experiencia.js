// AbertoCore: IA do "Link de experiência" (demo que a abertodigital manda para leads).
// O visitante conversa no site modelo e a IA responde como atendente do negócio do lead.
// Usa a chave de IA da conta abertodigital. Não grava a conversa.
// Limites: 30 mensagens por hora por IP, 20 mensagens do cliente por conversa,
// 12 mensagens de histórico (500 caracteres cada), 40 itens, resposta de até 300 tokens.

const MAX_HORA = 30, MAX_CONVERSA = 20, MAX_MSGS = 12, MAX_TXT = 500, MAX_TOKENS = 300, MAX_DIA = 300

// Cardápio de cada nicho, guardado no servidor: o que o visitante manda NÃO entra na instrução da IA.
// Precisa ser igual a experiencia/nichos.js (o teste tests/experiencia/ia.test.js confere).
const MENU = {"pizzaria":[{"cat":"Pizzas","catEn":"Pizzas","pt":"Mussarela","en":"Mozzarella","preco":44.9,"usd":16.9},{"cat":"Pizzas","catEn":"Pizzas","pt":"Calabresa","en":"Pepperoni","preco":49.9,"usd":18.9},{"cat":"Pizzas","catEn":"Pizzas","pt":"Margherita","en":"Margherita","preco":54.9,"usd":19.9},{"cat":"Pizzas","catEn":"Pizzas","pt":"Portuguesa","en":"Ham & egg","preco":52.9,"usd":19.5},{"cat":"Pizzas","catEn":"Pizzas","pt":"Frango com catupiry","en":"Chicken & cream cheese","preco":54.9,"usd":19.9},{"cat":"Doces","catEn":"Desserts","pt":"Pizza de chocolate","en":"Chocolate pizza","preco":42.9,"usd":15.9},{"cat":"Bebidas","catEn":"Drinks","pt":"Refrigerante 2 L","en":"Soda 2 L","preco":14,"usd":3.5},{"cat":"Bebidas","catEn":"Drinks","pt":"Suco natural 500 ml","en":"Fresh juice 16 oz","preco":10,"usd":4.5}],"hamburgueria":[{"cat":"Lanches","catEn":"Burgers","pt":"Smash clássico","en":"Classic smash","preco":29.9,"usd":9.9},{"cat":"Lanches","catEn":"Burgers","pt":"Smash duplo","en":"Double smash","preco":36.9,"usd":12.9},{"cat":"Lanches","catEn":"Burgers","pt":"Bacon burger","en":"Bacon burger","preco":38.9,"usd":13.5},{"cat":"Lanches","catEn":"Burgers","pt":"Chicken crispy","en":"Crispy chicken","preco":32.9,"usd":11.5},{"cat":"Acompanhamentos","catEn":"Sides","pt":"Batata frita","en":"Fries","preco":14.9,"usd":4.5},{"cat":"Acompanhamentos","catEn":"Sides","pt":"Onion rings","en":"Onion rings","preco":18.9,"usd":5.5},{"cat":"Bebidas","catEn":"Drinks","pt":"Refrigerante lata","en":"Canned soda","preco":7,"usd":2.5},{"cat":"Bebidas","catEn":"Drinks","pt":"Milkshake","en":"Milkshake","preco":19.9,"usd":6.5}]}

const PRONTAS = {
  pt: {
    pizzaria: "Oi! Agora estou com muitas mensagens. Você pode montar seu pedido pelo cardápio aqui no site: é só tocar no + das pizzas.",
    hamburgueria: "Oi! Agora estou com muitas mensagens. Monte seu pedido pelo cardápio aqui no site: toque no + dos lanches.",
    padrao: "Oi! Agora estou com muitas mensagens. Você pode seguir pelo site, é rapidinho.",
  },
  en: {
    pizzaria: "Hi! I'm handling a lot of messages right now. You can build your order from the menu on this page: just tap the + on the pizzas.",
    hamburgueria: "Hi! I'm handling a lot of messages right now. Build your order from the menu on this page: tap the + on the burgers.",
    padrao: "Hi! I'm handling a lot of messages right now. You can keep going on this page, it only takes a minute.",
  },
}

function txt(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) }
function idioma(l) { return l === "en" ? "en" : "pt" }
function nicho(n) { return /^[a-z-]{2,30}$/.test(String(n || "")) ? String(n) : "padrao" }

function respostaPronta(n, l) {
  const p = PRONTAS[idioma(l)]
  return p[nicho(n)] || p.padrao
}

// Monta a instrução fixa (sistema) e o texto com o histórico, já limitados.
function monta(b) {
  b = b && typeof b === "object" ? b : {}
  const l = idioma(b.l)
  // nome e cidade: só letras, números, espaço e pontuação simples (nada de quebra de linha ou chaves)
  const seguro = (v, max) => txt(v, max).replace(/[^A-Za-z0-9À-ÿ .,'&\-]/g, "").trim()
  const nome = seguro(b.nome, 40) || (l === "en" ? "the business" : "o negócio")
  const cidade = seguro(b.cidade, 40)
  const itens = (MENU[nicho(b.n)] || MENU.pizzaria)
    .map((i) => "- " + (l === "en" ? i.catEn : i.cat) + ": " + (l === "en" ? i.en : i.pt) + " — " + (l === "en" ? "$" + i.usd.toFixed(2) : "R$ " + i.preco.toFixed(2).replace(".", ",")))
  const msgs = (Array.isArray(b.msgs) ? b.msgs : []).filter((m) => m && typeof m === "object").slice(-MAX_MSGS)
  const sistema = l === "en"
    ? [
        "You are the customer service assistant of " + nome + (cidade ? " in " + cidade : "") + ", chatting on its website. Reply in English, short (up to 3 sentences), friendly.",
        "Use only the menu and prices below. Do not invent prices, products, promotions, delivery times or promises.",
        "Help the customer choose and guide them to place the order on this page (tap + on the items, then checkout).",
        "This is a demonstration made by abertodigital: if asked about real delivery or real payment, say kindly that this page is a demonstration.",
        "", "Menu:", itens.join("\n") || "(no items)",
      ].join("\n")
    : [
        "Você é o atendente virtual de " + nome + (cidade ? ", em " + cidade : "") + ", conversando pelo site. Responda em português do Brasil, curto (até 3 frases), simpático.",
        "Use só o cardápio e os preços abaixo. Não invente preços, produtos, promoções, prazos de entrega nem promessas.",
        "Ajude o cliente a escolher e leve ao pedido pelo próprio site (tocar no + dos itens e finalizar).",
        "Esta página é uma demonstração feita pela abertodigital: se perguntarem sobre entrega ou pagamento de verdade, diga com gentileza que é uma demonstração.",
        "", "Cardápio:", itens.join("\n") || "(sem itens)",
      ].join("\n")
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

module.exports = { monta, responde, respostaPronta, MENU }

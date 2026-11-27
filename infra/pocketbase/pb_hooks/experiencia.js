// AbertoCore: IA do "Link de experiência" (demo que a abertodigital manda para leads).
// O visitante conversa no site modelo e a IA responde como atendente do negócio do lead.
// Usa a chave de IA da conta abertodigital. Não grava a conversa.
// Limites: 30 mensagens por hora por IP, 20 mensagens do cliente por conversa,
// 12 mensagens de histórico (500 caracteres cada), 40 itens, resposta de até 300 tokens.

const MAX_HORA = 30, MAX_CONVERSA = 20, MAX_MSGS = 12, MAX_TXT = 500, MAX_ITENS = 40, MAX_TOKENS = 300

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
  const nome = txt(b.nome, 80) || (l === "en" ? "the business" : "o negócio")
  const cidade = txt(b.cidade, 60)
  const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, MAX_ITENS)
    .map((i) => i && typeof i === "object" ? "- " + txt(i.cat, 30) + ": " + txt(i.nome, 60) + (i.preco != null && isFinite(Number(i.preco)) ? " — " + (l === "en" ? "$" : "R$ ") + Number(i.preco).toFixed(2) : "") : "")
    .filter(Boolean)
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
  return v.n <= MAX_HORA
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

module.exports = { monta, responde, respostaPronta }

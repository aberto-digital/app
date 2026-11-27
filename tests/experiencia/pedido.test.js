// Testes do pedido e do chat do Link de experiência (experiencia/pedido.js e experiencia/chat.js).
// Rodar: node tests/experiencia/pedido.test.js
const assert = require('assert')
const Pedido = require('../../experiencia/pedido.js')
const Chat = require('../../experiencia/chat.js')
const Marca = require('../../experiencia/marca.js')

function memoria() { const m = new Map(); return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
let ok = 0
async function t(nome, fn) { try { await fn(); ok++; console.log('ok -', nome) } catch (e) { console.log('FALHOU -', nome, '\n ', e.message); process.exitCode = 1 } }

;(async () => {
  const cfg = Marca.ler('?n=pizzaria&nome=Bella')

  await t('adicionar e remover itens soma certo, com taxa de entrega do nicho', () => {
    const p = Pedido.novo(cfg)
    Pedido.adiciona(p, 'calabresa'); Pedido.adiciona(p, 'calabresa'); Pedido.adiciona(p, 'refri')
    assert.strictEqual(Pedido.qtd(p, 'calabresa'), 2)
    Pedido.remove(p, 'calabresa')
    const r = Pedido.resumo(p, 'entrega')
    assert.strictEqual(r.itens, 2)
    assert.strictEqual(r.subtotal, 63.9)
    assert.strictEqual(r.taxa, 6)
    assert.strictEqual(r.total, 69.9)
    assert.strictEqual(Pedido.resumo(p, 'retirada').taxa, 0)
  })

  await t('em inglês usa preços em dólar', () => {
    const p = Pedido.novo(Marca.ler('?n=pizzaria&l=en'))
    Pedido.adiciona(p, 'calabresa')
    assert.strictEqual(Pedido.resumo(p, 'retirada').total, 18.9)
  })

  await t('finalizar com Pix "Já paguei" grava pedido #102 pago no estado', () => {
    const st = memoria()
    const p = Pedido.novo(cfg)
    Pedido.adiciona(p, 'margherita'); Pedido.adiciona(p, 'suco')
    const est = Pedido.finaliza(p, { entrega: 'entrega', endereco: 'Rua A, 10', cliente: { nome: 'João', tel: '11 99999-0000' }, pagamento: 'pix', pago: true }, st, [{ de: 'cli', txt: 'oi', ts: 1 }])
    const salvo = JSON.parse(st.getItem('abertocore-experiencia'))
    assert.deepStrictEqual(salvo, est)
    assert.strictEqual(salvo.pedido.num, 102)
    assert.strictEqual(salvo.pedido.pago, true)
    assert.strictEqual(salvo.pedido.pagamento, 'pix')
    assert.strictEqual(salvo.pedido.total, 64.9 + 6)
    assert.strictEqual(salvo.pedido.itens.length, 2)
    assert.strictEqual(salvo.cfg.nome, 'Bella')
    assert.strictEqual(salvo.chat.length, 1)
  })

  await t('pagar na entrega fica a pagar; carrinho vazio não finaliza', () => {
    const st = memoria()
    const p = Pedido.novo(cfg)
    assert.throws(() => Pedido.finaliza(p, { pagamento: 'entrega', cliente: { nome: 'A', tel: '1' } }, st, []), /vazio/)
    Pedido.adiciona(p, 'mussarela')
    const est = Pedido.finaliza(p, { entrega: 'retirada', pagamento: 'entrega', pago: false, cliente: { nome: 'A', tel: '1' } }, st, [])
    assert.strictEqual(est.pedido.pago, false)
    assert.strictEqual(est.pedido.taxa, 0)
  })

  await t('nome e telefone são obrigatórios para finalizar', () => {
    const p = Pedido.novo(cfg); Pedido.adiciona(p, 'mussarela')
    assert.throws(() => Pedido.finaliza(p, { pagamento: 'pix', cliente: { nome: '', tel: '' } }, memoria(), []), /nome/i)
  })

  await t('corpo do chat leva nicho, marca, itens do cardápio com preço e as mensagens', () => {
    const b = Chat.corpo(cfg, [{ de: 'cli', txt: 'tem calabresa?' }])
    assert.strictEqual(b.n, 'pizzaria'); assert.strictEqual(b.nome, 'Bella'); assert.strictEqual(b.l, 'pt')
    assert.ok(b.itens.some((i) => i.nome === 'Calabresa' && i.preco === 49.9 && i.cat === 'Pizzas'))
    assert.deepStrictEqual(b.msgs, [{ de: 'cli', txt: 'tem calabresa?' }])
  })

  await t('chat envia para a rota e devolve a resposta da IA', async () => {
    let url = null
    const fetchFalso = async (u, o) => { url = u; return { ok: true, json: async () => ({ texto: 'Temos sim! R$ 49,90.', limite: false }) } }
    const r = await Chat.envia(cfg, [{ de: 'cli', txt: 'tem calabresa?' }], fetchFalso, 'https://api.exemplo/api/experiencia/ia')
    assert.strictEqual(url, 'https://api.exemplo/api/experiencia/ia')
    assert.strictEqual(r, 'Temos sim! R$ 49,90.')
  })

  await t('chat sem rede responde com a mensagem pronta, sem quebrar', async () => {
    const r = await Chat.envia(cfg, [{ de: 'cli', txt: 'oi' }], async () => { throw new Error('offline') }, 'x')
    assert.ok(/cardápio/.test(r))
  })

  console.log(ok + ' testes ok')
})()

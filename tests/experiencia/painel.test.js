// Testes da vitrine do AbertoCore no Link de experiência (experiencia/painel.js).
// Rodar: node tests/experiencia/painel.test.js
const assert = require('assert')
const Painel = require('../../experiencia/painel.js')
const Pedido = require('../../experiencia/pedido.js')
const Marca = require('../../experiencia/marca.js')

function memoria() { const m = new Map(); return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) } }
let ok = 0
function t(nome, fn) { try { fn(); ok++; console.log('ok -', nome) } catch (e) { console.log('FALHOU -', nome, '\n ', e.message); process.exitCode = 1 } }
const cfg = Marca.ler('?n=pizzaria&nome=Bella')

function comPedido() {
  const st = memoria(), p = Pedido.novo(cfg)
  Pedido.adiciona(p, 'calabresa'); Pedido.adiciona(p, 'refri')
  Pedido.finaliza(p, { entrega: 'entrega', endereco: 'Rua A', cliente: { nome: 'João', tel: '11 9' }, pagamento: 'pix', pago: true }, st, [{ de: 'cli', txt: 'tem calabresa?', ts: 1 }, { de: 'ia', txt: 'Temos!', ts: 2 }])
  return st
}

t('com pedido: #102 do cliente aparece na coluna Novo e é o destaque', () => {
  const e = Painel.estado(comPedido(), cfg)
  assert.strictEqual(e.real, true)
  assert.strictEqual(e.destaque.num, 102)
  assert.strictEqual(e.pedidos.find((x) => x.num === 102).coluna, 'novo')
  assert.strictEqual(e.destaque.cliente.nome, 'João')
})

t('sem pedido (abriu a vitrine direto ou recarregou vazio): mostra exemplo, não quebra', () => {
  const e = Painel.estado(memoria(), cfg)
  assert.strictEqual(e.real, false)
  assert.ok(e.pedidos.length >= 2)
  assert.ok(e.destaque && e.destaque.num)
})

t('estado corrompido no armazenamento cai no exemplo', () => {
  const st = memoria(); st.setItem('abertocore-experiencia', '{lixo')
  assert.strictEqual(Painel.estado(st, cfg).real, false)
})

t('mover pedido avança coluna e grava; não passa de Concluído', () => {
  const st = comPedido(), e = Painel.estado(st, cfg)
  Painel.avanca(e, 102, st); assert.strictEqual(e.pedidos.find((x) => x.num === 102).coluna, 'preparo')
  Painel.avanca(e, 102, st); Painel.avanca(e, 102, st); Painel.avanca(e, 102, st)
  assert.strictEqual(e.pedidos.find((x) => x.num === 102).coluna, 'concluido')
  assert.strictEqual(Painel.estado(st, cfg).pedidos.find((x) => x.num === 102).coluna, 'concluido')
})

t('conversa do cliente: chat do site + confirmação automática com número, itens e total', () => {
  const e = Painel.estado(comPedido(), cfg)
  const c = Painel.conversa(e)
  assert.strictEqual(c[0].txt, 'tem calabresa?')
  const conf = c[c.length - 1]
  assert.strictEqual(conf.de, 'ia')
  assert.ok(/#102/.test(conf.txt) && /Calabresa/.test(conf.txt) && /R\$ 69,90/.test(conf.txt) && /pago/i.test(conf.txt))
})

t('resumo do dia soma pedidos e faturamento', () => {
  const e = Painel.estado(comPedido(), cfg)
  const r = Painel.resumoDia(e)
  assert.strictEqual(r.pedidos, e.pedidos.length)
  assert.strictEqual(r.faturamento, Math.round(e.pedidos.reduce((s, x) => s + x.total, 0) * 100) / 100)
})

t('link do WhatsApp da abertodigital leva o nome do negócio', () => {
  const u = Painel.linkWhats(cfg)
  assert.ok(u.startsWith('https://wa.me/5511991233627?text='))
  assert.ok(decodeURIComponent(u).includes('Bella'))
})

console.log(ok + ' testes ok')

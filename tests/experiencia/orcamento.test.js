// Testes do modelo Orçamento do Link de experiência (experiencia/orcamento.js).
// Rodar: node tests/experiencia/orcamento.test.js
const assert = require('assert')
const NICHOS = require('../../experiencia/nichos.js')
const Marca = require('../../experiencia/marca.js')
const Orc = require('../../experiencia/orcamento.js')

function memoria() { const m = new Map(); return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) } }
let ok = 0
function t(nome, fn) { try { fn(); ok++; console.log('ok -', nome) } catch (e) { console.log('FALHOU -', nome, '\n ', e.message); process.exitCode = 1 } }

const cfg = Marca.ler('?m=orcamento&n=vidracaria&nome=Vidros%20Arujá')
const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(200)

function pedido(st) {
  const o = Orc.novo(cfg)
  o.tipo = 'box'
  o.respostas = { medidas: '1,20 x 1,90 m', urgencia: 'Esta semana', invasor: 'x' }
  o.fotos = [FOTO, 'javascript:alert(1)', FOTO, FOTO, FOTO]
  return Orc.finaliza(o, { cliente: { nome: 'Carlos Lima', tel: '11 9' } }, st || memoria(), [{ de: 'cli', txt: 'quanto fica um box?', ts: 1 }])
}

t('nichos de orçamento: mecânica, vidraçaria e reformas com faixa de preço e perguntas', () => {
  ;['mecanica', 'vidracaria', 'reformas'].forEach((n) => {
    const x = NICHOS[n]
    assert.strictEqual(x.modelo, 'orcamento')
    const itens = x.categorias.flatMap((c) => c.itens)
    assert.ok(itens.length >= 5)
    itens.forEach((i) => assert.ok(i.id && i.nome.pt && i.nome.en && i.de > 0 && i.ate > i.de && i.deUsd > 0 && i.ateUsd > i.deUsd))
    assert.ok(x.perguntas.length >= 2)
    x.perguntas.forEach((p) => assert.ok(p.id && p.rot.pt && p.rot.en))
  })
  assert.strictEqual(Marca.ler('?m=orcamento').n, 'mecanica')
})

t('pedir orçamento grava #102 com o serviço, só as respostas conhecidas e até 3 fotos válidas', () => {
  const st = memoria(), est = pedido(st)
  assert.deepStrictEqual(JSON.parse(st.getItem('abertocore-experiencia')), est)
  const o = est.orcamento
  assert.strictEqual(o.num, 102)
  assert.strictEqual(o.tipo.id, 'box')
  assert.deepStrictEqual(o.respostas.map((r) => r.id).sort(), ['medidas', 'urgencia'])
  assert.ok(o.respostas.every((r) => r.p && r.r))
  assert.strictEqual(o.fotos.length, 3)
  assert.ok(o.fotos.every((f) => f.startsWith('data:image/')))
  assert.strictEqual(est.chat.length, 1)
})

t('sem serviço não envia; nome e telefone são obrigatórios', () => {
  assert.throws(() => Orc.finaliza(Orc.novo(cfg), { cliente: { nome: 'A', tel: '1' } }, memoria(), []), /servi/i)
  const o = Orc.novo(cfg); o.tipo = 'box'
  assert.throws(() => Orc.finaliza(o, { cliente: { nome: ' ', tel: '' } }, memoria(), []), /nome/i)
})

t('vitrine: orçamento do cliente em Novo orçamento, com respostas e fotos', () => {
  const st = memoria(); pedido(st)
  const e = Orc.vitrine.estado(st, cfg)
  assert.strictEqual(e.real, true)
  const d = e.cards.find((c) => c.real)
  assert.strictEqual(d.coluna, 'novo')
  assert.strictEqual(d.fotos.length, 3)
  assert.ok(e.cards.filter((c) => !c.real).length >= 2)
})

t('vitrine sem orçamento mostra exemplo, não quebra', () => {
  const e = Orc.vitrine.estado(memoria(), cfg)
  assert.strictEqual(e.real, false)
  assert.ok(e.destaque && e.destaque.tipo)
})

t('proposta de exemplo usa o meio da faixa do serviço, arredondado em 10', () => {
  const st = memoria(); pedido(st)
  const e = Orc.vitrine.estado(st, cfg), box = NICHOS.vidracaria.categorias.flatMap((c) => c.itens).find((i) => i.id === 'box')
  const p = Orc.vitrine.proposta(e)
  assert.strictEqual(p.valor, Math.round((box.de + box.ate) / 2 / 10) * 10)
  assert.strictEqual(p.num, 102)
  assert.ok(p.validade > 0)
})

t('enviar a proposta move o card para Proposta enviada, grava e entra na conversa', () => {
  const st = memoria(); pedido(st)
  const e = Orc.vitrine.estado(st, cfg)
  const antes = Orc.vitrine.conversa(e)
  assert.ok(/#102/.test(antes[antes.length - 1].txt) && /Vidros Aruj/.test(antes[antes.length - 1].txt))
  Orc.vitrine.enviaProposta(e, st)
  assert.strictEqual(e.cards.find((c) => c.real).coluna, 'proposta')
  const e2 = Orc.vitrine.estado(st, cfg)
  assert.strictEqual(e2.enviada, true)
  const depois = Orc.vitrine.conversa(e2)
  assert.strictEqual(depois.length, antes.length + 1)
  assert.ok(/R\$/.test(depois[depois.length - 1].txt))
})

t('em inglês a proposta e as mensagens saem em dólar', () => {
  const c = Marca.ler('?m=orcamento&n=reformas&l=en&nome=Fix%20Pro'), st = memoria()
  const o = Orc.novo(c); o.tipo = NICHOS.reformas.categorias[0].itens[0].id
  Orc.finaliza(o, { cliente: { nome: 'John', tel: '1' } }, st, [])
  const e = Orc.vitrine.estado(st, c)
  Orc.vitrine.enviaProposta(e, st)
  const m = Orc.vitrine.conversa(Orc.vitrine.estado(st, c))
  assert.ok(/\$\d/.test(m[m.length - 1].txt) && !/R\$/.test(m[m.length - 1].txt))
})

console.log(ok + ' testes ok')

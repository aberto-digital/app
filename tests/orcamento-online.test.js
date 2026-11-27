// node tests/orcamento-online.test.js
const assert = require('assert'), path = require('path')
global.__hooks = path.resolve(__dirname, '../infra/pocketbase/pb_hooks')
const O = require(global.__hooks + '/orcamento.js')

function rec(id, d, nome) { return { getInt: () => id, getString: (k) => (k === 'dados' ? JSON.stringify(d) : k === 'nome' ? (nome || d.nome) : ''), } }
const base = [
  rec(1, { nome: 'Site Essencial', tipo: 'Pacote', setup: 1500, mensal: 99, ds: 'Site pronto', orcavel: true, ativo: true, foto: 'data:image/jpeg;base64,AAAA' }),
  rec(2, { nome: 'Interno', setup: 10, orcavel: false, ativo: true }),
  rec(3, { nome: 'Desligado', setup: 10, orcavel: true, ativo: false }),
  rec(4, { nome: 'Esgotado', setup: 10, orcavel: true, ativo: true, estoque: 0 }),
  rec(5, { nome: 'Camiseta', tipo: 'Produto', setup: 49.9, orcavel: true, estoque: 3, foto: 'javascript:alert(1)' }),
  rec(6, { nome: 'Sob consulta', orcavel: true }),
]
const app = { findRecordsByFilter: () => base }

let cat = O.catalogo(app, 'e1', { mostrarPrecos: true })
assert.deepStrictEqual(cat.map((p) => p.id), [1, 5, 6], 'só os marcados, ativos e com estoque')
assert.strictEqual(cat[0].foto, 'data:image/jpeg;base64,AAAA')
assert.strictEqual(cat[1].foto, '', 'foto perigosa some')
assert.strictEqual(cat[2].setup, null)
assert.strictEqual(O.catalogo(app, 'e1', { mostrarPrecos: false })[0].setup, null, 'preços escondidos')

let c = O.calcula(cat, [{ id: 1, qtd: 1 }, { id: '5', qtd: 2 }])
assert.strictEqual(c.itens, 3); assert.strictEqual(c.setup, 1599.8); assert.strictEqual(c.mensal, 99)
assert.throws(() => O.calcula(cat, []), /pelo menos/)
assert.throws(() => O.calcula(cat, [{ id: 2, qtd: 1 }]), /disponível/)
assert.throws(() => O.calcula(cat, [{ id: 5, qtd: 4 }]), /Só temos 3/)
assert.throws(() => O.calcula(cat, [{ id: 1 }, { id: 1 }]), /repetido/)
assert.strictEqual(O.calcula(cat, [{ id: 1, qtd: -5 }]).itens, 1, 'quantidade mínima 1')
assert.strictEqual(O.calcula(cat, [{ id: 1, qtd: 9999 }]).itens, 99, 'quantidade máxima 99')
assert.strictEqual(O.brl(1234.5), 'R$ 1.234,50')
assert.strictEqual(O.brl(99), 'R$ 99,00')
const t = O.textoPedido(c, true)
assert.ok(/1× Site Essencial \(R\$ 1\.500,00 \+ R\$ 99,00\/mês\)/.test(t), t)
assert.ok(/Implantação: R\$ 1\.599,80 · Mensalidade: R\$ 99,00/.test(t), t)
assert.ok(!/R\$/.test(O.textoPedido(c, false)), 'sem preços quando escondidos')
console.log('orcamento-online: ok')

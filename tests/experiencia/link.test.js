// Testes do gerador do Link de experiência (experiencia/link.js), usado pelo botão no contato.
// Rodar: node tests/experiencia/link.test.js
const assert = require('assert')
const Link = require('../../experiencia/link.js')
const Marca = require('../../experiencia/marca.js')

let ok = 0
function t(nome, fn) { try { fn(); ok++; console.log('ok -', nome) } catch (e) { console.log('FALHOU -', nome, '\n ', e.message); process.exitCode = 1 } }

t('ramo vira nicho e modelo', () => {
  assert.deepStrictEqual(Link.nichoDoRamo('Pizzaria com delivery'), { m: 'pedido', n: 'pizzaria', exato: true })
  assert.deepStrictEqual(Link.nichoDoRamo('Hamburgueria smash'), { m: 'pedido', n: 'hamburgueria', exato: true })
  assert.deepStrictEqual(Link.nichoDoRamo('Burger joint (EUA)'), { m: 'pedido', n: 'hamburgueria', exato: true })
})

t('ramo de alimentação sem modelo próprio cai em pizzaria, marcado como aproximado', () => {
  assert.deepStrictEqual(Link.nichoDoRamo('Alimentação – Restaurante'), { m: 'pedido', n: 'pizzaria', exato: false })
})

t('ramo de outro modelo (ainda não disponível) volta aproximado', () => {
  const r = Link.nichoDoRamo('Serviços locais – Vidraçaria')
  assert.strictEqual(r.exato, false)
  assert.strictEqual(Link.nichoDoRamo('').exato, false)
})

t('monta o link e ele é lido de volta igual pela página', () => {
  const u = Link.monta('https://app.abertodigital.com/experiencia/', { m: 'pedido', n: 'pizzaria', nome: 'Pizzaria Bella & Cia', logo: 'https://api.abertodigital.com/api/files/c/r/foto.png', cor: '#b22222', cidade: 'Arujá', l: 'pt' })
  assert.ok(u.startsWith('https://app.abertodigital.com/experiencia/?m=pedido&n=pizzaria&'))
  assert.deepStrictEqual(Marca.ler(u.slice(u.indexOf('?'))), { m: 'pedido', n: 'pizzaria', nome: 'Pizzaria Bella & Cia', logo: 'https://api.abertodigital.com/api/files/c/r/foto.png', cor: '#B22222', cidade: 'Arujá', l: 'pt' })
})

t('campos vazios ficam fora do link', () => {
  const u = Link.monta('https://x/experiencia/', { m: 'pedido', n: 'hamburgueria', nome: 'Smash', logo: '', cor: '', cidade: '', l: 'en' })
  assert.strictEqual(u, 'https://x/experiencia/?m=pedido&n=hamburgueria&nome=Smash&l=en')
})

t('texto da mensagem para o lead traz o link', () => {
  const s = Link.texto('Marcos Silva', 'https://x/experiencia/?m=pedido', 'pt')
  assert.ok(s.startsWith('Oi, Marcos!') && s.includes('https://x/experiencia/?m=pedido'))
  assert.ok(Link.texto('', 'L', 'en').startsWith('Hi!'))
})

console.log(ok + ' testes ok')

// Testes do gerador do Link de experiência (experiencia/link.js), usado pelo botão no contato.
// Rodar: node tests/experiencia/link.test.js
const assert = require('assert')
const Link = require('../../experiencia/link.js')
const Marca = require('../../experiencia/marca.js')

let ok = 0
function t(nome, fn) { try { fn(); ok++; console.log('ok -', nome) } catch (e) { console.log('FALHOU -', nome, '\n ', e.message); process.exitCode = 1 } }

t('ramo vira nicho e modelo', () => {
  assert.deepStrictEqual(Link.nichoDoRamo('Pizzaria com delivery'), { m: 'pedido', n: 'pizzaria', exato: true })
  assert.deepStrictEqual(Link.nichoDoRamo('Docinhos e salgados para festa'), { m: 'pedido', n: 'doceria', exato: true })
  assert.deepStrictEqual(Link.nichoDoRamo('Confeitaria artesanal'), { m: 'pedido', n: 'doceria', exato: true })
  assert.deepStrictEqual(Link.nichoDoRamo('Hamburgueria smash'), { m: 'pedido', n: 'hamburgueria', exato: true })
  assert.deepStrictEqual(Link.nichoDoRamo('Burger joint (EUA)'), { m: 'pedido', n: 'hamburgueria', exato: true })
})

t('ramo de alimentação sem modelo próprio cai em pizzaria, marcado como aproximado', () => {
  assert.deepStrictEqual(Link.nichoDoRamo('Alimentação – Restaurante'), { m: 'pedido', n: 'pizzaria', exato: false })
})

t('ramos de agendamento e de orçamento viram o nicho certo', () => {
  const casos = {
    'Beleza – Barbearia masculina': ['agendamento', 'barbearia'],
    'Saúde/beleza – Cílios, sobrancelhas, make, unhas e estética': ['agendamento', 'estetica'],
    'Beleza – Manicure': ['agendamento', 'estetica'],
    'Saúde – Pilates clínico e fisioterapia': ['agendamento', 'pilates'],
    'Serviços locais – Mecânica/Automotivo': ['orcamento', 'mecanica'],
    'Automotivo – Lava rápido': ['orcamento', 'mecanica'],
    'Serviços locais – Vidraçaria/Serralheria': ['orcamento', 'vidracaria'],
    'Construção – Reformas e acabamento': ['orcamento', 'reformas'],
    'Serviços locais – Eletricista': ['orcamento', 'reformas'],
  }
  Object.keys(casos).forEach((r) => assert.deepStrictEqual(Link.nichoDoRamo(r), { m: casos[r][0], n: casos[r][1], exato: true }, r))
})

t('ramo sem modelo próprio volta aproximado no modelo mais parecido', () => {
  assert.strictEqual(Link.nichoDoRamo('Saúde – Nutrição').m, 'agendamento')
  assert.strictEqual(Link.nichoDoRamo('Saúde – Nutrição').exato, false)
  assert.strictEqual(Link.nichoDoRamo('').exato, false)
})

t('lista de nichos para o seletor: todos os nichos, com modelo, rótulo e cor', () => {
  const NICHOS = require('../../experiencia/nichos.js')
  assert.deepStrictEqual(Link.NICHOS.map((x) => x.n).sort(), Object.keys(NICHOS).sort())
  Link.NICHOS.forEach((x) => { assert.strictEqual(x.m, NICHOS[x.n].modelo); assert.strictEqual(x.cor, NICHOS[x.n].cor); assert.ok(x.rotulo) })
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

t('texto muda com o modelo: agendamento e orçamento', () => {
  assert.ok(/agend/i.test(Link.texto('Ana', 'U', 'pt', 'agendamento')) && Link.texto('Ana', 'U', 'pt', 'agendamento').includes('U'))
  assert.ok(/orçamento/i.test(Link.texto('Ana', 'U', 'pt', 'orcamento')))
  assert.ok(/booking|book/i.test(Link.texto('Ana', 'U', 'en', 'agendamento')))
  assert.ok(/quote/i.test(Link.texto('Ana', 'U', 'en', 'orcamento')))
  assert.ok(/pedido online/.test(Link.texto('Ana', 'U', 'pt')))
})

console.log(ok + ' testes ok')

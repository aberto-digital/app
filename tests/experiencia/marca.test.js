// Testes da personalização do Link de experiência (experiencia/marca.js + experiencia/nichos.js).
// Rodar: node tests/experiencia/marca.test.js
const assert = require('assert')
const NICHOS = require('../../experiencia/nichos.js')
const Marca = require('../../experiencia/marca.js')

let ok = 0
function t(nome, fn) { try { fn(); ok++; console.log('ok -', nome) } catch (e) { console.log('FALHOU -', nome, '\n ', e.message); process.exitCode = 1 } }

t('nichos pizzaria e hamburgueria existem, modelo pedido, cor e itens com preço', () => {
  ;['pizzaria', 'hamburgueria'].forEach((n) => {
    const x = NICHOS[n]
    assert.strictEqual(x.modelo, 'pedido')
    assert.ok(/^#[0-9a-f]{6}$/i.test(x.cor))
    const itens = x.categorias.flatMap((c) => c.itens)
    assert.ok(itens.length >= 6)
    itens.forEach((i) => { assert.ok(i.id && i.nome && typeof i.preco === 'number' && i.precoUsd > 0) })
    assert.ok(x.textos.pt.titulo && x.textos.en.titulo)
  })
})

t('link sem parâmetros: Seu negócio, cor do nicho, sem logo, pedido/pizzaria', () => {
  const c = Marca.ler('')
  assert.strictEqual(c.m, 'pedido'); assert.strictEqual(c.n, 'pizzaria')
  assert.strictEqual(c.nome, 'Seu negócio'); assert.strictEqual(c.cor, NICHOS.pizzaria.cor)
  assert.strictEqual(c.logo, ''); assert.strictEqual(c.l, 'pt')
})

t('link completo é lido e normalizado', () => {
  const c = Marca.ler('?m=pedido&n=hamburgueria&nome=Smash%20Bros&logo=https%3A%2F%2Fapi.abertodigital.com%2Fapi%2Ffiles%2Fx.png&cor=%23c0392b&cidade=Aruj%C3%A1&l=en')
  assert.deepStrictEqual(c, { m: 'pedido', n: 'hamburgueria', nome: 'Smash Bros', logo: 'https://api.abertodigital.com/api/files/x.png', cor: '#C0392B', cidade: 'Arujá', l: 'en' })
  assert.strictEqual(Marca.ler('?l=en').nome, 'Your business')
})

t('logo que não é https vira vazio (iniciais)', () => {
  assert.strictEqual(Marca.ler('?logo=http://x.com/a.png').logo, '')
  assert.strictEqual(Marca.ler('?logo=javascript:alert(1)').logo, '')
})

t('cor inválida ou nicho desconhecido caem no padrão', () => {
  assert.strictEqual(Marca.ler('?cor=red').cor, NICHOS.pizzaria.cor)
  const c = Marca.ler('?n=foguete&m=pedido')
  assert.strictEqual(c.n, 'pizzaria')
})

t('nome muito longo é cortado em 40 caracteres', () => {
  assert.strictEqual(Marca.ler('?nome=' + 'A'.repeat(90)).nome.length, 40)
})

t('cor do texto sobre a cor da marca: clara -> texto escuro, escura -> branco', () => {
  assert.strictEqual(Marca.corTexto('#FFFFFF'), '#101A2C')
  assert.strictEqual(Marca.corTexto('#FFE066'), '#101A2C')
  assert.strictEqual(Marca.corTexto('#101A2C'), '#FFFFFF')
  assert.strictEqual(Marca.corTexto('#C0392B'), '#FFFFFF')
})

t('iniciais: até 2 letras, maiúsculas, ignorando palavras curtas', () => {
  assert.strictEqual(Marca.iniciais('Pizzaria da Bella'), 'PB')
  assert.strictEqual(Marca.iniciais('smash'), 'S')
  assert.strictEqual(Marca.iniciais(''), '?')
})

t('preço formatado por idioma', () => {
  assert.strictEqual(Marca.preco(49.9, 'pt'), 'R$ 49,90')
  assert.strictEqual(Marca.preco(12.5, 'en'), '$12.50')
})

t('cor do texto escolhe o maior contraste (laranja e verde médios usam texto escuro)', () => {
  assert.strictEqual(Marca.corTexto('#E67E22'), '#101A2C')
  assert.strictEqual(Marca.corTexto('#27AE60'), '#101A2C')
  assert.strictEqual(Marca.corTexto('#1ABC9C'), '#101A2C')
  assert.strictEqual(Marca.corTexto('#B22222'), '#FFFFFF')
})

console.log(ok + ' testes ok')

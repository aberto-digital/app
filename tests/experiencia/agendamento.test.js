// Testes do modelo Agendamento do Link de experiência (experiencia/agendamento.js).
// Rodar: node tests/experiencia/agendamento.test.js
const assert = require('assert')
const NICHOS = require('../../experiencia/nichos.js')
const Marca = require('../../experiencia/marca.js')
const Ag = require('../../experiencia/agendamento.js')

function memoria() { const m = new Map(); return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) } }
let ok = 0
function t(nome, fn) { try { fn(); ok++; console.log('ok -', nome) } catch (e) { console.log('FALHOU -', nome, '\n ', e.message); process.exitCode = 1 } }

const AGORA = new Date(2026, 10, 25, 10, 30).getTime() // quarta, 25/11, 10:30
const cfg = Marca.ler('?m=agendamento&n=estetica&nome=Studio%20Bela')

function marcado(c, st) {
  const a = Ag.novo(c || cfg)
  const d = Ag.dias(a.cfg, AGORA)[1]
  const h = d.horarios.find((x) => x.livre)
  a.servico = 'sobrancelha'; a.prof = 'camila'; a.dia = d.iso; a.hora = h.h
  return { a, est: Ag.finaliza(a, { cliente: { nome: 'Maria Souza', tel: '11 9' }, sinal: 'pix', pago: true }, st || memoria(), [{ de: 'cli', txt: 'tem horário amanhã?', ts: 1 }], AGORA) }
}

t('nichos de agendamento: estética, barbearia e pilates com serviços de duração e preço', () => {
  ;['estetica', 'barbearia', 'pilates'].forEach((n) => {
    const x = NICHOS[n]
    assert.strictEqual(x.modelo, 'agendamento')
    assert.ok(x.abre < x.fecha && Array.isArray(x.fechado))
    const itens = x.categorias.flatMap((c) => c.itens)
    assert.ok(itens.length >= 4)
    itens.forEach((i) => assert.ok(i.id && i.nome.pt && i.nome.en && i.dur > 0 && typeof i.preco === 'number' && typeof i.precoUsd === 'number'))
    assert.ok(x.textos.pt.titulo && x.textos.en.titulo && x.textos.pt.info && x.textos.en.info)
  })
})

t('link de agendamento sem nicho cai em estética; nicho de outro modelo também', () => {
  assert.strictEqual(Marca.ler('?m=agendamento').n, 'estetica')
  assert.strictEqual(Marca.ler('?m=agendamento&n=pizzaria').n, 'estetica')
  assert.strictEqual(Marca.ler('?m=agendamento&n=barbearia').n, 'barbearia')
})

t('próximos 7 dias abertos, sem domingo, e hoje só com horários a partir de 1 hora depois de agora', () => {
  const d = Ag.dias(cfg, AGORA)
  assert.strictEqual(d.length, 7)
  assert.strictEqual(d[0].iso, '2026-11-25')
  d.forEach((x) => assert.notStrictEqual(new Date(x.iso + 'T12:00:00').getDay(), 0))
  assert.ok(!d.some((x) => x.iso === '2026-11-29'))
  d[0].horarios.filter((h) => h.livre).forEach((h) => assert.ok(h.h >= '12:00', h.h))
  const n = NICHOS.estetica
  d[2].horarios.forEach((h) => { const hh = parseInt(h.h, 10); assert.ok(hh >= n.abre && hh < n.fecha) })
  assert.ok(d[2].horarios.some((h) => !h.livre) && d[2].horarios.some((h) => h.livre))
  assert.deepStrictEqual(Ag.dias(cfg, AGORA), d)
})

t('confirmar grava o agendamento #102 com serviço, profissional, dia, hora e sinal pago', () => {
  const st = memoria(), { est } = marcado(cfg, st)
  const salvo = JSON.parse(st.getItem('abertocore-experiencia'))
  assert.deepStrictEqual(salvo, est)
  const a = salvo.agendamento
  assert.strictEqual(a.num, 102)
  assert.strictEqual(a.servico.id, 'sobrancelha'); assert.ok(a.servico.dur > 0)
  assert.strictEqual(a.prof.nome, 'Camila')
  assert.strictEqual(a.sinal.pago, true); assert.strictEqual(a.sinal.valor, NICHOS.estetica.sinal)
  assert.strictEqual(salvo.chat.length, 1)
})

t('sem serviço, dia ou hora não confirma; nome e telefone são obrigatórios; horário ocupado é recusado', () => {
  const a = Ag.novo(cfg)
  assert.throws(() => Ag.finaliza(a, { cliente: { nome: 'A', tel: '1' } }, memoria(), [], AGORA), /hor[áa]rio|servi/i)
  const d = Ag.dias(cfg, AGORA)[2]
  a.servico = 'manicure'; a.dia = d.iso; a.hora = d.horarios.find((x) => x.livre).h
  assert.throws(() => Ag.finaliza(a, { cliente: { nome: '', tel: '' } }, memoria(), [], AGORA), /nome/i)
  a.hora = d.horarios.find((x) => !x.livre).h
  assert.throws(() => Ag.finaliza(a, { cliente: { nome: 'A', tel: '1' } }, memoria(), [], AGORA), /ocupado/i)
})

t('pagar no local fica sem sinal pago; serviço grátis não tem sinal', () => {
  const p = Marca.ler('?m=agendamento&n=pilates')
  const a = Ag.novo(p), d = Ag.dias(p, AGORA)[1]
  a.servico = 'experimental'; a.dia = d.iso; a.hora = d.horarios.find((x) => x.livre).h
  const est = Ag.finaliza(a, { cliente: { nome: 'A', tel: '1' }, sinal: 'pix', pago: true }, memoria(), [], AGORA)
  assert.strictEqual(est.agendamento.servico.preco, 0)
  assert.strictEqual(est.agendamento.sinal.valor, 0)
  const de = Ag.dias(cfg, AGORA)[1]
  const b = Ag.novo(cfg); Object.assign(b, { servico: 'manicure', dia: de.iso, hora: de.horarios.find((x) => x.livre).h })
  const e2 = Ag.finaliza(b, { cliente: { nome: 'A', tel: '1' }, sinal: 'local', pago: false }, memoria(), [], AGORA)
  assert.strictEqual(e2.agendamento.sinal.pago, false)
})

t('vitrine: horário do cliente aparece na agenda em destaque e no funil como Agendado', () => {
  const st = memoria(), { est } = marcado(cfg, st)
  const e = Ag.vitrine.estado(st, cfg, AGORA)
  assert.strictEqual(e.real, true)
  const noDia = e.agenda.filter((x) => x.dia === est.agendamento.dia)
  assert.ok(noDia.some((x) => x.real && x.hora === est.agendamento.hora && x.nome === 'Maria Souza'))
  assert.ok(e.agenda.filter((x) => !x.real).length >= 3)
  assert.ok(!e.agenda.some((x) => !x.real && x.dia === est.agendamento.dia && x.hora === est.agendamento.hora))
  assert.strictEqual(e.funil.find((c) => c.real).coluna, 'agendado')
})

t('vitrine sem agendamento mostra exemplo, não quebra', () => {
  const e = Ag.vitrine.estado(memoria(), cfg, AGORA)
  assert.strictEqual(e.real, false)
  assert.ok(e.destaque && e.destaque.servico && e.agenda.length >= 3)
})

t('conversa: chat do site + confirmação automática + lembrete programado para o dia anterior', () => {
  const st = memoria(), { est } = marcado(cfg, st)
  const c = Ag.vitrine.conversa(Ag.vitrine.estado(st, cfg, AGORA))
  assert.strictEqual(c[0].txt, 'tem horário amanhã?')
  const conf = c.find((m) => m.auto && !m.programado)
  assert.ok(/Studio Bela/.test(conf.txt) && new RegExp(est.agendamento.hora).test(conf.txt) && /sinal/i.test(conf.txt))
  const lem = c[c.length - 1]
  assert.ok(lem.programado && /lembr/i.test(lem.quando + lem.txt))
})

t('funil: avançar leva de Agendado a Pós-atendimento e para ali; fica gravado', () => {
  const st = memoria(); marcado(cfg, st)
  const e = Ag.vitrine.estado(st, cfg, AGORA), id = e.funil.find((c) => c.real).id
  Ag.vitrine.avanca(e, id, st); Ag.vitrine.avanca(e, id, st)
  assert.strictEqual(e.funil.find((c) => c.real).coluna, 'pos')
  assert.strictEqual(Ag.vitrine.estado(st, cfg, AGORA).funil.find((c) => c.real).coluna, 'pos')
})

console.log(ok + ' testes ok')

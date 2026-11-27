/* AbertoCore · Link de experiência: gera o link a partir do contato (usado no index.html).
   nichoDoRamo(ramo) escolhe o modelo e o nicho; monta(base, dados) monta a URL;
   texto(nome, url, l) é a mensagem que vai para a caixa de mensagem;
   corDaImagem(url) tira a cor principal da logo (no navegador). */
(function (raiz) {
  // ramo do lead -> modelo e nicho (exato: o nicho tem modelo próprio; senão é o mais parecido)
  var REGRAS = [
    { re: /pizz/i, m: 'pedido', n: 'pizzaria' },
    { re: /doce|docinho|salgad|brigadeir|confeit|coxinha|bolo|brownie/i, m: 'pedido', n: 'doceria' },
    { re: /hamb[uú]rg|burger|smash|lanche/i, m: 'pedido', n: 'hamburgueria' },
    { re: /barbear|barber/i, m: 'agendamento', n: 'barbearia' },
    { re: /pilates|fisio|quiropra|massoter/i, m: 'agendamento', n: 'pilates' },
    { re: /est[ée]tic|beleza|sobrancelh|c[íi]lio|lash|unha|manicure|sal[ãa]o|cabel|maqui|harmoniza|depila|podolog|micropig|nail|spa\b|hydrafacial/i, m: 'agendamento', n: 'estetica' },
    { re: /vidra|serralh|esquadri/i, m: 'orcamento', n: 'vidracaria' },
    { re: /mec[âa]nic|automotiv|lava.?r[áa]pido|funilar|insulfilm|envelopa/i, m: 'orcamento', n: 'mecanica' },
    { re: /reform|constru|eletric|el[ée]tric|hidr[áa]ul|pintur|chaveiro|manuten|marcenar|climatiza|hvac|higieniza|acabamento/i, m: 'orcamento', n: 'reformas' },
  ];
  // sem modelo próprio: o mais parecido (exato: false)
  var PARECIDOS = [
    { re: /sa[úu]de|nutri|psic|cl[íi]nica|dent|terapi|academia|fitness|pole|muay|yoga/i, m: 'agendamento', n: 'pilates' },
    { re: /tatu|tattoo|piercing|banho e tosa|pet|veterin|adestra/i, m: 'agendamento', n: 'estetica' },
    { re: /servi[çc]|evento|fotograf|v[íi]deo|drone|instala|conserto|assist[êe]ncia/i, m: 'orcamento', n: 'reformas' },
  ];
  // lista do seletor no AbertoCore (igual a experiencia/nichos.js; o teste confere)
  var NICHOS = [
    { n: 'pizzaria', m: 'pedido', rotulo: 'Pedido · Pizzaria', cor: '#C0392B' },
    { n: 'hamburgueria', m: 'pedido', rotulo: 'Pedido · Hamburgueria', cor: '#E67E22' },
    { n: 'doceria', m: 'pedido', rotulo: 'Pedido · Docinhos e salgados', cor: '#6F4E37' },
    { n: 'estetica', m: 'agendamento', rotulo: 'Agendamento · Estética e beleza', cor: '#B5487A' },
    { n: 'barbearia', m: 'agendamento', rotulo: 'Agendamento · Barbearia', cor: '#1F2A36' },
    { n: 'pilates', m: 'agendamento', rotulo: 'Agendamento · Pilates e fisioterapia', cor: '#2E8B7A' },
    { n: 'mecanica', m: 'orcamento', rotulo: 'Orçamento · Mecânica e automotivo', cor: '#1565C0' },
    { n: 'vidracaria', m: 'orcamento', rotulo: 'Orçamento · Vidraçaria e serralheria', cor: '#00838F' },
    { n: 'reformas', m: 'orcamento', rotulo: 'Orçamento · Reformas e elétrica', cor: '#8D5B3A' },
  ];

  function nichoDoRamo(ramo) {
    var r = String(ramo || ''), i;
    for (i = 0; i < REGRAS.length; i++) if (REGRAS[i].re.test(r)) return { m: REGRAS[i].m, n: REGRAS[i].n, exato: true };
    for (i = 0; i < PARECIDOS.length; i++) if (PARECIDOS[i].re.test(r)) return { m: PARECIDOS[i].m, n: PARECIDOS[i].n, exato: false };
    return { m: 'pedido', n: 'pizzaria', exato: false };
  }

  function monta(base, d) {
    var q = [];
    [['m', d.m], ['n', d.n], ['nome', d.nome], ['logo', d.logo], ['cor', d.cor], ['cidade', d.cidade], ['l', d.l]].forEach(function (p) {
      if (p[1]) q.push(p[0] + '=' + encodeURIComponent(p[1]));
    });
    return base + '?' + q.join('&');
  }

  function texto(nome, url, l, m) {
    var pn = String(nome || '').trim().split(/\s+/)[0];
    var oi = l === 'en' ? 'Hi' + (pn ? ' ' + pn : '') + '! ' : 'Oi' + (pn ? ', ' + pn : '') + '! ';
    if (l === 'en') {
      if (m === 'agendamento') return oi + 'I set up a quick demo of how your business would look with online booking, automatic reminders and customer service in one place. Book a time as if you were a customer, then see it land in the business schedule: ' + url;
      if (m === 'orcamento') return oi + 'I set up a quick demo of how your business would look with online quote requests and customer service in one place. Ask for a quote as if you were a customer, then see it arrive on the business side: ' + url;
      return oi + 'I set up a quick demo of how your business would look with online orders and customer service in one place. Try placing an order as if you were a customer, then see it arrive on the business side: ' + url;
    }
    if (m === 'agendamento') return oi + 'Montei uma demonstração rápida de como ficaria o seu negócio com agendamento online, lembrete automático e atendimento num lugar só. Agende um horário como se fosse um cliente e depois veja ele chegando na agenda da empresa: ' + url;
    if (m === 'orcamento') return oi + 'Montei uma demonstração rápida de como ficaria o seu negócio com pedido de orçamento online e atendimento num lugar só. Peça um orçamento como se fosse um cliente e depois veja ele chegando do lado da empresa: ' + url;
    return oi + 'Montei uma demonstração rápida de como ficaria o seu negócio com pedido online e atendimento num lugar só. Faça um pedido como se fosse um cliente e depois veja ele chegando do lado da empresa: ' + url;
  }

  // cor principal da imagem (média dos pixels mais saturados). Se a imagem não deixar ler, devolve ''.
  function corDaImagem(url) {
    return new Promise(function (ok) {
      if (!url || typeof Image === 'undefined') return ok('');
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = c.height = 32;
          var g = c.getContext('2d'); g.drawImage(img, 0, 0, 32, 32);
          var d = g.getImageData(0, 0, 32, 32).data, soma = [0, 0, 0], n = 0;
          for (var i = 0; i < d.length; i += 4) {
            var r = d[i], gr = d[i + 1], b = d[i + 2], mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
            if (d[i + 3] < 200 || mx - mn < 40 || mx > 245 || mx < 30) continue;
            soma[0] += r; soma[1] += gr; soma[2] += b; n++;
          }
          if (!n) return ok('');
          ok('#' + soma.map(function (v) { return ('0' + Math.round(v / n).toString(16)).slice(-2); }).join('').toUpperCase());
        } catch (e) { ok(''); }
      };
      img.onerror = function () { ok(''); };
      img.src = url;
    });
  }

  var Link = { nichoDoRamo: nichoDoRamo, monta: monta, texto: texto, corDaImagem: corDaImagem, NICHOS: NICHOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Link;
  else raiz.LinkExperiencia = Link;
})(typeof window !== 'undefined' ? window : this);

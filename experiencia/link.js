/* AbertoCore · Link de experiência: gera o link a partir do contato (usado no index.html).
   nichoDoRamo(ramo) escolhe o modelo e o nicho; monta(base, dados) monta a URL;
   texto(nome, url, l) é a mensagem que vai para a caixa de mensagem;
   corDaImagem(url) tira a cor principal da logo (no navegador). */
(function (raiz) {
  var REGRAS = [
    { re: /pizz/i, m: 'pedido', n: 'pizzaria' },
    { re: /hamb[uú]rg|burger|smash|lanche/i, m: 'pedido', n: 'hamburgueria' },
  ];

  function nichoDoRamo(ramo) {
    var r = String(ramo || '');
    for (var i = 0; i < REGRAS.length; i++) if (REGRAS[i].re.test(r)) return { m: REGRAS[i].m, n: REGRAS[i].n, exato: true };
    return { m: 'pedido', n: 'pizzaria', exato: false };
  }

  function monta(base, d) {
    var q = [];
    [['m', d.m], ['n', d.n], ['nome', d.nome], ['logo', d.logo], ['cor', d.cor], ['cidade', d.cidade], ['l', d.l]].forEach(function (p) {
      if (p[1]) q.push(p[0] + '=' + encodeURIComponent(p[1]));
    });
    return base + '?' + q.join('&');
  }

  function texto(nome, url, l) {
    var pn = String(nome || '').trim().split(/\s+/)[0];
    if (l === 'en') return 'Hi' + (pn ? ' ' + pn : '') + '! I set up a quick demo of how your business would look with online orders and customer service in one place. Try placing an order as if you were a customer, then see it arrive on the business side: ' + url;
    return 'Oi' + (pn ? ', ' + pn : '') + '! Montei uma demonstração rápida de como ficaria o seu negócio com pedido online e atendimento num lugar só. Faça um pedido como se fosse um cliente e depois veja ele chegando do lado da empresa: ' + url;
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

  var Link = { nichoDoRamo: nichoDoRamo, monta: monta, texto: texto, corDaImagem: corDaImagem };
  if (typeof module !== 'undefined' && module.exports) module.exports = Link;
  else raiz.LinkExperiencia = Link;
})(typeof window !== 'undefined' ? window : this);

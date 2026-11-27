/* AbertoCore · Link de experiência: lê o link e aplica a marca do lead (nome, logo, cor).
   Formato: ?m=pedido&n=pizzaria&nome=&logo=<https>&cor=%23RRGGBB&cidade=&l=pt|en
   Parâmetro ausente ou inválido usa o padrão do nicho. */
(function (raiz) {
  var NICHOS = typeof module !== 'undefined' && module.exports ? require('./nichos.js') : raiz.NICHOS;
  var MODELOS = ['pedido', 'agendamento', 'orcamento'];
  var PADRAO = { pedido: 'pizzaria' };

  function limpo(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }

  function ler(search) {
    var q = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    var m = MODELOS.indexOf(q.get('m')) >= 0 ? q.get('m') : 'pedido';
    var n = q.get('n');
    if (!NICHOS[n] || NICHOS[n].modelo !== m) n = PADRAO[m] || 'pizzaria';
    var l = q.get('l') === 'en' ? 'en' : 'pt';
    var cor = /^#[0-9a-f]{6}$/i.test(q.get('cor') || '') ? q.get('cor').toUpperCase() : NICHOS[n].cor;
    var logo = q.get('logo') || '';
    if (!/^https:\/\/[^\s"'<>]+$/i.test(logo)) logo = '';
    return {
      m: m, n: n,
      nome: limpo(q.get('nome'), 40) || (l === 'en' ? 'Your business' : 'Seu negócio'),
      logo: logo, cor: cor,
      cidade: limpo(q.get('cidade'), 40), l: l,
    };
  }

  // escolhe o texto (escuro ou branco) com maior contraste sobre a cor da marca (WCAG)
  function lum(hex) {
    var h = String(hex || '').replace('#', '');
    var c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function corTexto(hex) {
    var L = lum(hex), escuro = (L + 0.05) / (lum('#101A2C') + 0.05), branco = 1.05 / (L + 0.05);
    return escuro > branco ? '#101A2C' : '#FFFFFF';
  }

  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(function (w) { return w.length > 2 || /^[A-Z]/.test(w); });
    if (!p.length) p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  function preco(v, l) {
    v = Number(v) || 0;
    if (l === 'en') return '$' + v.toFixed(2);
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  // aplica cor, nome e logo na página (só no navegador)
  function aplica(cfg, doc) {
    doc = doc || document;
    var r = doc.documentElement;
    r.style.setProperty('--cor', cfg.cor);
    r.style.setProperty('--cor-texto', corTexto(cfg.cor));
    r.lang = cfg.l === 'en' ? 'en' : 'pt-BR';
    doc.querySelectorAll('[data-nome]').forEach(function (el) { el.textContent = cfg.nome; });
    doc.querySelectorAll('[data-logo]').forEach(function (el) {
      el.innerHTML = '';
      var ini = doc.createElement('span'); ini.className = 'ini'; ini.textContent = iniciais(cfg.nome);
      el.appendChild(ini);
      if (cfg.logo) {
        var img = doc.createElement('img'); img.alt = ''; img.src = cfg.logo; img.referrerPolicy = 'no-referrer';
        img.onload = function () { ini.remove(); };
        img.onerror = function () { img.remove(); };
        el.appendChild(img);
      }
    });
  }

  var Marca = { ler: ler, corTexto: corTexto, iniciais: iniciais, preco: preco, aplica: aplica };
  if (typeof module !== 'undefined' && module.exports) module.exports = Marca;
  else raiz.Marca = Marca;
})(typeof window !== 'undefined' ? window : this);

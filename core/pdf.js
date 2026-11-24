/* AbertoCore: gera o PDF da auditoria ou da proposta sem a janela de impressão.
   A central abre a página escondida com ?c=<contato>&pdf=1; aqui a página se arruma como na impressão,
   vira PDF (html2pdf) e devolve o arquivo para a central por postMessage. */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  if (q.get('pdf') !== '1') return;
  document.documentElement.removeAttribute('data-tema'); // sempre claro no PDF
  var css = 'body.modo-pdf{background:#fff!important;width:auto!important;margin:0;font-size:12.5px}' +
    /* largura útil do A4 com margem de 12 mm (186 mm ≈ 700 px): o html2canvas corta o que passar disso */
    '.modo-pdf .rel,.modo-pdf .folha,.modo-pdf #doc{width:700px!important;max-width:700px!important;margin:0!important}' +
    /* o html2canvas mede com a fonte condensada e desenha normal: palavras se sobrepõem. Sem condensar no PDF */
    '.modo-pdf *{font-stretch:100%!important;letter-spacing:normal!important;font-variation-settings:normal!important}' +
    '.modo-pdf .gauge{width:200px!important}' +
    '.modo-pdf .barra,.modo-pdf .abas-mob,.modo-pdf .form,.modo-pdf .aviso,.modo-pdf .so-tela,.modo-pdf .nv-chip{display:none!important}' +
    '.modo-pdf .grade{display:block!important;padding:0!important;max-width:none!important;margin:0!important}' +
    '.modo-pdf .rel,.modo-pdf .folha{display:block!important;position:static!important;border:0!important;padding:0!important;border-radius:0!important;box-shadow:none!important}' +
    '.modo-pdf .topo-rel{grid-template-columns:200px 1fr!important;gap:26px!important}' +
    '.modo-pdf .gauge{max-width:none!important;margin:0!important}' +
    '.modo-pdf .perdas li.cab{display:grid!important}' +
    '.modo-pdf .perdas li:not(.cab){grid-template-columns:8px 1fr 1fr!important}' +
    '.modo-pdf .perdas li .sol{grid-column:auto!important;border-top:0!important;padding-top:0!important;border-left:1px dashed rgba(16,26,44,.18)!important;padding-left:12px!important}' +
    '.modo-pdf .perdas li,.modo-pdf .plano,.modo-pdf .plano-pag,.modo-pdf table tr,.modo-pdf .destaque,.modo-pdf .assin{break-inside:avoid}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function devolve(msg) { try { parent.postMessage(Object.assign({ abertocorePdf: true }, msg), location.origin); } catch (e) {} }
  function carrega(src) {
    return new Promise(function (ok, falha) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { falha(new Error('Não consegui carregar o gerador de PDF.')); }; document.head.appendChild(s); });
  }
  function gera() {
    document.body.classList.add('modo-pdf');
    var el = document.querySelector('.rel') || document.querySelector('#doc');
    if (!el || !el.textContent.trim()) return devolve({ erro: 'O documento está vazio.' });
    // SVG sem largura/altura e com cor em var(--x) some no html2canvas: fixa tamanho e cores calculadas
    el.querySelectorAll('svg').forEach(function (sv) {
      var b = sv.getBoundingClientRect();
      if (b.width) { sv.setAttribute('width', Math.round(b.width)); sv.setAttribute('height', Math.round(b.height)); }
      sv.querySelectorAll('*').forEach(function (n) {
        var cs = getComputedStyle(n), estilo = n.getAttribute('style') || '';
        if (/fill/.test(estilo) || (n.getAttribute('fill') || '').indexOf('var(') >= 0) n.setAttribute('fill', cs.fill);
        if (/stroke/.test(estilo) || (n.getAttribute('stroke') || '').indexOf('var(') >= 0) n.setAttribute('stroke', cs.stroke);
        if (estilo) n.removeAttribute('style');
      });
    });
    var nome = (document.title || 'documento').replace(/[\\/:*?"<>|]+/g, '-');
    carrega('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js').then(function () {
      return document.fonts && document.fonts.ready;
    }).then(function () {
      return window.html2pdf().set({
        margin: [12, 12, 12, 12], filename: nome + '.pdf',
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 700, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.perdas li', '.plano', '.plano-pag', 'tr', '.destaque', '.assin'] }
      }).from(el).outputPdf('blob');
    }).then(function (blob) { devolve({ blob: blob, nome: nome }); })
      .catch(function (e) { devolve({ erro: e.message || String(e) }); });
  }
  if (document.readyState === 'complete') setTimeout(gera, 700); else window.addEventListener('load', function () { setTimeout(gera, 700); });
})();

/* Tema claro/escuro do AbertoCore: aplica antes de desenhar a página (sem piscar).
   A escolha fica em Configurações → Aparência e conta (localStorage 'abertocore-tema'). */
(function () {
  try {
    var t = localStorage.getItem('abertocore-tema');
    var escuro = t === 'escuro' || (!t && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (escuro) document.documentElement.setAttribute('data-tema', 'escuro');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', escuro ? '#161E2B' : '#FFFFFF');
  } catch (e) {}
})();

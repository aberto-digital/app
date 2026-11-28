/* Alterna português e inglês. Todo elemento com data-pt e data-en troca de texto. Lembra a escolha no navegador. */
(function () {
  var btn = document.getElementById('lang'), lang = 'pt';
  try { lang = localStorage.getItem('demo-lang') || ((navigator.language || '').indexOf('en') === 0 ? 'en' : 'pt'); } catch (e) {}
  function aplica() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.querySelectorAll('[data-pt]').forEach(function (el) { el.innerHTML = el.getAttribute('data-' + lang); });
    if (btn) btn.textContent = lang === 'en' ? 'PT' : 'EN';
    document.dispatchEvent(new CustomEvent('idioma', { detail: lang }));
  }
  if (btn) btn.addEventListener('click', function () {
    lang = lang === 'en' ? 'pt' : 'en';
    try { localStorage.setItem('demo-lang', lang); } catch (e) {}
    aplica();
  });
  window.DemoLang = function () { return lang; };
  aplica();
})();

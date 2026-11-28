/* Preços por região e seletor Brasil / EUA das demonstrações.
   A região (tabela de preços) vem do link (?r=br ou ?r=us) e o idioma de ?l=pt ou ?l=en, independentes entre si; ficam na sessão para as páginas seguintes. Sem nada: EUA e português.
   Valores do Brasil são os do sistema (core/dados.js). Valores dos EUA: do plano de negócios (EUA, em dólar). Pacote extra de IA dos EUA: +2.000 ações US$ 29 e +5.000 US$ 69 (definido em 28/11/2026). */
(function(){
  var PRECOS={
    br:{rot:'Brasil',moeda:'R$',loc:'pt-BR',iaExtra:39,
      pacotes:{Start:{i:650,m:49},'Presença':{i:1650,m:150},Completo:{i:3500,m:450}}},
    us:{rot:'EUA',moeda:'US$',loc:'en-US',iaExtra:29,
      pacotes:{Start:{i:590,m:59},'Presença':{i:1290,m:129},Completo:{i:2900,m:349}}}
  };
  var KEY='demo-regiao';
  /* região (tabela de preços) e idioma vêm do link; ficam na sessão do navegador para as páginas seguintes (site, painel, proposta) */
  function ss(k,v){try{if(v==null)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){return null}}
  function ler(){var r=null;try{r=new URLSearchParams(location.search).get('r')}catch(e){}if(r==='br'||r==='us')ss('demo-r',r);else{r=ss('demo-r');if(r!=='br'&&r!=='us'){try{if(localStorage.getItem('demo-admin')==='1')r=localStorage.getItem(KEY)}catch(e){}}}return r==='br'||r==='us'?r:'us'}
  function lang(){var l=null;try{l=new URLSearchParams(location.search).get('l')}catch(e){}if(l==='en'||l==='pt')ss('demo-l',l);else l=ss('demo-l');return l==='en'?'en':'pt'}
  function grava(r){ss('demo-r',r);try{if(localStorage.getItem('demo-admin')==='1')localStorage.setItem(KEY,r)}catch(e){}}
  function fmt(v,r){var P=PRECOS[r];return P.moeda+' '+v.toLocaleString(P.loc,{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2})}
  /* O seletor de região é só do Julio: fica escondido para quem recebe o link. ?admin=1 liga (e lembra), ?admin=0 desliga. */
  (function(){var a=null;try{a=new URLSearchParams(location.search).get('admin')}catch(e){}
    try{if(a==='1')localStorage.setItem('demo-admin','1');else if(a==='0')localStorage.removeItem('demo-admin');if(localStorage.getItem('demo-admin')==='1')document.documentElement.classList.add('adm')}catch(e){if(a==='1')document.documentElement.classList.add('adm')}
    var s=document.createElement('style');s.textContent='.reg,.rg{display:none!important}html.adm .reg{display:inline-flex!important}html.adm .rg{display:flex!important}';document.head.appendChild(s)})();
  window.Regiao={PRECOS:PRECOS,ler:ler,lang:lang,grava:grava,fmt:fmt};
})();

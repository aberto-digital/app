/* Preços por região e seletor Brasil / EUA das demonstrações.
   A região vem do link (?r=br ou ?r=us), depois da última escolha guardada no navegador; sem nada, as demos usam EUA.
   Valores do Brasil são os do sistema (core/dados.js). Valores dos EUA: do plano de negócios (EUA, em dólar). Sem pacote extra de IA definido para os EUA. */
(function(){
  var PRECOS={
    br:{rot:'Brasil',moeda:'R$',loc:'pt-BR',iaExtra:39,
      pacotes:{Start:{i:650,m:49},'Presença':{i:1650,m:150},Completo:{i:3500,m:450}}},
    us:{rot:'EUA',moeda:'US$',loc:'en-US',iaExtra:null,
      pacotes:{Start:{i:590,m:59},'Presença':{i:1290,m:129},Completo:{i:2900,m:349}}}
  };
  var KEY='demo-regiao';
  function ler(){var r=null;try{r=new URLSearchParams(location.search).get('r')}catch(e){}if(r!=='br'&&r!=='us'){try{r=localStorage.getItem(KEY)}catch(e){}}return r==='br'||r==='us'?r:'us'}
  function grava(r){try{localStorage.setItem(KEY,r)}catch(e){}}
  function fmt(v,r){var P=PRECOS[r];return P.moeda+' '+v.toLocaleString(P.loc,{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2})}
  window.Regiao={PRECOS:PRECOS,ler:ler,grava:grava,fmt:fmt};
})();

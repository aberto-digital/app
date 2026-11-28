/* Chat de demonstração: a cliente fala com o "assistente da Amanda/Ibraim", que responde na hora em nome deles.
   Respostas por regras simples (palavras-chave), em português e inglês. Abre em qualquer elemento com [data-chat]. */
(function(){
  var sc=document.currentScript,site=(sc&&sc.getAttribute('data-site'))||'amanda',IBR=site==='ibraim';
  var P=IBR?{nome:'Ibraim',neg:'Superman Tattoo',art:'o',fluxo:'orcamento/',fl:{pt:'Pedir orçamento',en:'Get a quote'},ini:'I'}:{nome:'Amanda',neg:'Amanda Belas Unhas',art:'a',fluxo:'agendamento/',fl:{pt:'Agendar online',en:'Book online'},ini:'A'};
  function lang(){return window.DemoLang?window.DemoLang():'pt'}
  function T(pt,en){return lang()==='en'?en:pt}
  var KB=IBR?[
    [/pre[çc]o|quanto|valor|custa|price|cost|how much|quote|or[çc]amento/i,{pt:'Depende da região, do tamanho e do estilo. Como referência: fineline de $100 a $350, preto e cinza de $150 a $600, colorida de $200 a $750 e fechamento de braço ou perna de $1.000 a $3.500. Faça o pedido de orçamento e você recebe uma estimativa na hora; o valor final o Ibraim confirma depois de ver a sua ideia.',en:'It depends on the area, size and style. For reference: fine line $100 to $350, black and grey $150 to $600, color $200 to $750 and a full sleeve or leg $1,000 to $3,500. Send a quote request and you get an estimate right away; Ibraim confirms the final price after seeing your idea.'}],
    [/hor[áa]rio|agenda|dispon|data|quando|when|available|schedule|book/i,{pt:'O Ibraim trabalha com hora marcada. Primeiro ele vê a sua ideia e as referências, ajusta o desenho com você e só então a sessão é marcada.',en:'Ibraim works by appointment. He first reviews your idea and references, adjusts the design with you and only then books the session.'}],
    [/sinal|pagamento|zelle|cart[ãa]o|pagar|deposit|pay|card/i,{pt:'Para reservar a data é pedido um sinal de $100, por cartão ou Zelle. Ele é abatido do valor final da tattoo.',en:'To reserve the date a $100 deposit is requested, by card or Zelle. It is deducted from the final price of the tattoo.'}],
    [/estilo|realismo|chicano|anime|fineline|preto|color|style|black|grey|gray/i,{pt:'O Ibraim faz preto e cinza, colorida, chicano, anime, fineline e fechamentos de braço e perna. Se não souber o estilo, descreva a ideia e ele indica.',en:'Ibraim does black and grey, color, chicano, anime, fine line and full arm or leg sleeves. If you are not sure of the style, describe your idea and he will recommend one.'}],
    [/onde|endere[çc]o|local|where|address|location|carolina/i,{pt:'O estúdio fica na Carolina do Sul. O endereço exato vai na confirmação da sessão.',en:'The studio is in South Carolina. The exact address comes with your session confirmation.'}],
    [/refer[êe]ncia|foto|desenho|reference|photo|design/i,{pt:'Pode mandar fotos de referência no pedido de orçamento. Quanto mais detalhes, mais certeira fica a estimativa.',en:'You can send reference photos with the quote request. The more details, the more accurate the estimate.'}],
    [/portugu|ingl[êe]s|english|idioma|language/i,{pt:'O atendimento é em português e em inglês.',en:'Service is in Portuguese and English.'}]
  ]:[
    [/pre[çc]o|quanto|valor|custa|price|cost|how much/i,{pt:'Alongamento em gel a partir de $120, manutenção $85, esmaltação em gel $55, cuidado para unhas roídas $95 e nail art a partir de +$20 por unha decorada.',en:'Gel extensions from $120, refill $85, gel polish $55, care for bitten nails $95 and nail art from +$20 per decorated nail.'}],
    [/hor[áa]rio|agenda|dispon|data|quando|when|available|schedule|book|open/i,{pt:'A Amanda atende com hora marcada, uma cliente por vez. Veja os próximos horários livres em "Agendar online"; leva 1 minuto.',en:'Amanda works by appointment, one client at a time. See the next open times under "Book online"; it takes 1 minute.'}],
    [/sinal|pagamento|zelle|cart[ãa]o|pagar|deposit|pay|card/i,{pt:'Para garantir o horário é pedido um sinal de $30, por cartão, Zelle ou você escolhe pagar no local.',en:'To secure your spot a $30 deposit is requested, by card or Zelle, or you can choose to pay on site.'}],
    [/ro[ií]da|roer|crescer|bitten|nail biting|grow/i,{pt:'A Amanda cuida de unhas roídas com proteção e acompanhamento a cada visita, para a unha crescer forte. O cuidado custa $95 e leva cerca de 2h.',en:'Amanda cares for bitten nails with protection and a follow-up at every visit so they grow strong. The care costs $95 and takes about 2h.'}],
    [/manuten|refil|dura|tempo|quanto tempo|how long|last/i,{pt:'O alongamento leva cerca de 2h30 e a manutenção é feita a cada 3 semanas, em média, em cerca de 2h.',en:'Extensions take about 2h30 and the refill is done about every 3 weeks, taking around 2h.'}],
    [/onde|endere[çc]o|local|where|address|location|goose|summerville/i,{pt:'O studio atende em Goose Creek e Summerville, SC. O endereço exato vai na confirmação do horário.',en:'The studio serves Goose Creek and Summerville, SC. The exact address comes with your booking confirmation.'}],
    [/portugu|ingl[êe]s|english|idioma|language/i,{pt:'O atendimento é em português e em inglês.',en:'Service is in Portuguese and English.'}]
  ];
  var CH=function(){return lang()==='en'?(IBR?['Prices','How it works','Deposit','Get a quote']:['Prices','Availability','Deposit','Book online']):(IBR?['Preços','Como funciona','Sinal','Pedir orçamento']:['Preços','Horários','Sinal','Agendar online'])};
  var st=document.createElement('style');st.textContent=
   '.dc-p{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));width:min(380px,calc(100vw - 24px));height:min(560px,calc(100dvh - 32px));background:var(--c-card,#fff);color:var(--c-fg,#222);border:1px solid var(--c-line,#ddd);border-radius:18px;box-shadow:0 24px 60px -18px rgba(0,0,0,.45);display:none;flex-direction:column;z-index:2147483000;overflow:hidden;font:15px/1.45 Inter,system-ui,sans-serif}'+
   '.dc-p.on{display:flex}'+
   '.dc-h{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--c-band,#2b2020);color:var(--c-band-fg,#fff)}'+
   '.dc-av{width:38px;height:38px;border-radius:50%;background:var(--c-btn,#444);color:var(--c-btn-fg,#fff);display:grid;place-items:center;font-weight:700}'+
   '.dc-h b{display:block;font-size:15px}.dc-h small{opacity:.8;font-size:12px}'+
   '.dc-x{margin-left:auto;font-size:22px;line-height:1;color:inherit;background:none;border:0;cursor:pointer;padding:6px 8px}'+
   '.dc-m{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:var(--c-bg,#faf6f3)}'+
   '.dc-b{max-width:84%;padding:9px 13px;border-radius:14px;font-size:14.5px;white-space:pre-line}'+
   '.dc-b.a{background:var(--c-card,#fff);border:1px solid var(--c-line,#ddd);align-self:flex-start;border-bottom-left-radius:4px}'+
   '.dc-b.u{background:var(--c-btn,#333);color:var(--c-btn-fg,#fff);align-self:flex-end;border-bottom-right-radius:4px}'+
   '.dc-b a{color:inherit;font-weight:700}'+
   '.dc-c{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;background:var(--c-bg,#faf6f3)}'+
   '.dc-c button{border:1px solid var(--c-line,#ccc);background:var(--c-card,#fff);color:var(--c-fg,#222);border-radius:99px;padding:6px 12px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}'+
   '.dc-f{display:flex;gap:8px;padding:10px 12px;background:var(--c-bg,#faf6f3)}'+
   '.dc-f input{flex:1;min-width:0;border:1px solid var(--c-line,#ccc);border-radius:99px;padding:10px 14px;font:inherit;background:var(--c-card,#fff);color:var(--c-fg,#222)}'+
   '.dc-f button{border:0;border-radius:99px;padding:0 16px;font-weight:700;background:var(--c-btn,#333);color:var(--c-btn-fg,#fff);cursor:pointer}'+
   '.dc-n{font-size:11px;color:var(--c-mut,#777);text-align:center;padding:0 12px 8px;background:var(--c-bg,#faf6f3)}'+
   '.dc-d{display:flex;gap:4px;align-self:flex-start;padding:12px 14px;background:var(--c-card,#fff);border:1px solid var(--c-line,#ddd);border-radius:14px}.dc-d i{width:6px;height:6px;border-radius:50%;background:var(--c-mut,#888);animation:dcb 1s infinite}.dc-d i:nth-child(2){animation-delay:.15s}.dc-d i:nth-child(3){animation-delay:.3s}@keyframes dcb{50%{opacity:.25}}'+
   '@media(max-width:560px){.dc-p{right:0;left:0;bottom:0;width:auto;height:82dvh;border-radius:18px 18px 0 0}}@media(prefers-reduced-motion:reduce){.dc-d i{animation:none}}';
  document.head.appendChild(st);
  var p=document.createElement('div');p.className='dc-p';p.setAttribute('role','dialog');p.setAttribute('aria-label','Chat');
  p.innerHTML='<div class="dc-h"><span class="dc-av">'+P.ini+'</span><div><b>'+P.nome+'</b><small class="dc-s"></small></div><button class="dc-x" type="button" aria-label="Fechar">×</button></div><div class="dc-m" aria-live="polite"></div><div class="dc-c"></div><div class="dc-f"><input type="text" autocomplete="off"><button type="button"></button></div><div class="dc-n"></div>';
  document.body.appendChild(p);
  var M=p.querySelector('.dc-m'),C=p.querySelector('.dc-c'),I=p.querySelector('input'),B=p.querySelector('.dc-f button'),started=false;
  function rot(){p.querySelector('.dc-s').textContent=T('Assistente '+(IBR?'do ':'da ')+P.nome+' · responde na hora','Assistant for '+P.nome+' · replies instantly');I.placeholder=T('Escreva sua pergunta','Type your question');B.textContent=T('Enviar','Send');p.querySelector('.dc-n').textContent=T('Demonstração: respostas automáticas de exemplo.','Demo: sample automatic replies.');p.querySelector('.dc-x').setAttribute('aria-label',T('Fechar','Close'));
    C.innerHTML='';CH().forEach(function(x){var b=document.createElement('button');b.type='button';b.textContent=x;b.onclick=function(){say(x)};C.appendChild(b)})}
  function add(txt,k,html){var d=document.createElement('div');d.className='dc-b '+k;if(html)d.innerHTML=txt;else d.textContent=txt;M.appendChild(d);M.scrollTop=M.scrollHeight}
  var DENTRO=/\/(agendamento|orcamento)\/?$/.test(location.pathname.replace(/index\.html$/,''));
  function link(){return DENTRO?'<a href="#" data-fechar>'+P.fl[lang()]+'</a>':'<a href="'+P.fluxo+'" data-fluxo>'+P.fl[lang()]+'</a>'}
  function resposta(q){
    if(/agendar online|book online|pedir or[çc]amento|get a quote/i.test(q))return {h:T('Claro! ','Sure! ')+link()+T(' leva cerca de 1 minuto.',' takes about 1 minute.')};
    if(/como funciona|how it works/i.test(q))return {t:IBR?T('Você conta a ideia, escolhe região, tamanho e estilo e recebe uma estimativa na hora. O Ibraim vê as referências, ajusta o desenho com você e só então marca a sessão.','You share the idea, pick area, size and style and get an estimate right away. Ibraim reviews references, adjusts the design with you and only then books the session.'):T('Você escolhe serviço, dia e horário, recebe a confirmação pelo canal que preferir e um lembrete antes da data.','You pick service, day and time, get a confirmation on your preferred channel and a reminder before the date.')};
    for(var i=0;i<KB.length;i++)if(KB[i][0].test(q))return {t:KB[i][1][lang()],c:true};
    if(/^(oi|ol[áa]|hi|hello|hey|bom dia|boa tarde|boa noite)\b/i.test(q))return {t:T('Oi! Como posso ajudar?','Hi! How can I help?')};
    return {t:T('Boa pergunta! Anotei aqui para '+(IBR?'o Ibraim':'a Amanda')+' e '+(IBR?'ele':'ela')+' confirma assim que puder. Enquanto isso, posso ajudar com preços, horários e sinal.','Good question! I noted it for '+P.nome+' and '+(IBR?'he':'she')+' will confirm as soon as possible. Meanwhile I can help with prices, availability and deposit.')};
  }
  function say(q){q=q.trim();if(!q)return;add(q,'u');I.value='';var d=document.createElement('div');d.className='dc-d';d.innerHTML='<i></i><i></i><i></i>';M.appendChild(d);M.scrollTop=M.scrollHeight;
    setTimeout(function(){d.remove();var r=resposta(q);if(r.h)add(r.h,'a',true);else{add(r.t,'a');if(r.c)add(T('Quer ','Want to ')+link()+'?','a',true)}},650)}
  function open(){p.classList.add('on');if(!started){started=true;rot();add(T('Oi! Eu sou o assistente '+(IBR?'do Ibraim':'da Amanda')+' e respondo na hora. O que você gostaria de saber?','Hi! I am '+P.nome+'\'s assistant and I reply instantly. What would you like to know?'),'a')}I.focus()}
  function close(){p.classList.remove('on')}
  p.querySelector('.dc-x').onclick=close;
  p.querySelector('.dc-f').addEventListener('submit',function(e){e.preventDefault()});
  B.onclick=function(){say(I.value)};I.onkeydown=function(e){if(e.key==='Enter')say(I.value)};
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  document.addEventListener('idioma',function(){if(started)rot()});
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-fechar]')){e.preventDefault();close();return}var a=e.target.closest&&e.target.closest('[data-chat]');if(a){e.preventDefault();open()}});
  window.DemoChat={open:open,close:close};
})();

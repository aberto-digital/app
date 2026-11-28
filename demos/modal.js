/* No computador, "Agendar online" / "Pedir orçamento" abre o fluxo num modal enxuto (a mesma página /agendamento em um iframe).
   No celular, ou com JS desligado, o link abre a página normal. */
(function(){
  if(window.self!==window.top)return;
  var mq=window.matchMedia('(min-width:900px)'),box=null,fr=null,last=null;
  function css(){var s=document.createElement('style');s.textContent='.dm{position:fixed;inset:0;z-index:2147483100;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(10,8,8,.62)}.dm.on{display:flex}.dm-c{position:relative;width:min(540px,100%);height:min(780px,100%);border-radius:22px;overflow:hidden;background:var(--c-bg,#fff);box-shadow:0 30px 80px -20px rgba(0,0,0,.6)}.dm iframe{width:100%;height:100%;border:0;display:block}.dm-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:1px solid var(--c-line,#ddd);background:var(--c-card,#fff);color:var(--c-fg,#222);font-size:20px;line-height:1;cursor:pointer;z-index:2}';document.head.appendChild(s)}
  function abre(url){if(!box){css();box=document.createElement('div');box.className='dm';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.innerHTML='<div class="dm-c"><button class="dm-x" type="button" aria-label="Fechar">×</button><iframe title="Agendamento"></iframe></div>';document.body.appendChild(box);fr=box.querySelector('iframe');box.addEventListener('click',function(e){if(e.target===box)fecha()});box.querySelector('.dm-x').onclick=fecha;document.addEventListener('keydown',function(e){if(e.key==='Escape')fecha()})}
    last=document.activeElement;fr.src=url+(url.indexOf('?')>-1?'&':'?')+'modal=1';box.classList.add('on');document.body.style.overflow='hidden';box.querySelector('.dm-x').focus()}
  function fecha(){if(!box)return;box.classList.remove('on');fr.src='about:blank';document.body.style.overflow='';if(last&&last.focus)last.focus()}
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href$="agendamento/"],a[href$="orcamento/"],a[data-fluxo]');
    if(!a||!mq.matches||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey)return;
    e.preventDefault();abre(a.getAttribute('href'))});
  window.DemoModal={abre:abre,fecha:fecha};
})();

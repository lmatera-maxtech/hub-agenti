(function(){
  const body=document.body;
  const project=body.dataset.project || '';
  /* Fallback only: the production HTML already contains the shared shell bar. */
  if(!document.querySelector('.maxtech-globalbar')){
    const meta={'nano-marta':'NANO Marta','angela':'Angela'}[project]||'AI Project';
    const bar=document.createElement('div');bar.className='maxtech-globalbar';bar.innerHTML=`<a class="maxtech-home" href="../../index.html"><span class="maxtech-wordmark"><span class="max">MAX</span><span class="tech">TECH</span></span><span class="maxtech-hubname">AI Operations Hub</span></a><div class="maxtech-crumb"><span>Progetti</span><i>/</i><b>${meta}</b></div><a class="maxtech-back" href="../../index.html"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/><path d="M9 12h10"/></svg><span>Tutti gli agenti</span></a>`;body.insertBefore(bar,body.firstChild);
  }
  if(project==='angela'){
    function syncAngelaHash(){const h=(location.hash||'#monitoraggio').replace('#','');const target=h==='analisi'?'analisi':'monitoraggio';const btn=document.querySelector(`.tab-btn[data-tab="${target}"]`);if(btn&&!btn.classList.contains('active'))btn.click();}
    window.addEventListener('DOMContentLoaded',()=>setTimeout(syncAngelaHash,0));
    window.addEventListener('hashchange',syncAngelaHash);
    document.addEventListener('click',e=>{const btn=e.target.closest('.tab-btn[data-tab]');if(!btn)return;const next='#'+btn.dataset.tab;if(location.hash!==next)history.replaceState(null,'',next);});
  }
})();

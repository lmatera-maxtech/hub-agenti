document.addEventListener('DOMContentLoaded',()=>{
  AngelaAnalysis.init();

  function openTab(name,updateHash=true){
    if(!['monitoraggio','analisi'].includes(name)) name='monitoraggio';
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));
    if(name==='analisi'&&AngelaAnalysis.isUnlocked()) AngelaAnalysis.load();
    if(updateHash&&location.hash!==`#${name}`) history.replaceState(null,'',`#${name}`);
  }

  const initial=(location.hash||'#monitoraggio').slice(1);
  openTab(initial,false);
  if(initial==='monitoraggio'||!['monitoraggio','analisi'].includes(initial)) AngelaMonitor.load();

  document.querySelector('.tabs').addEventListener('click',e=>{
    const b=e.target.closest('.tab-btn');
    if(!b)return;
    openTab(b.dataset.tab,true);
    if(b.dataset.tab==='monitoraggio') AngelaMonitor.load();
  });

  window.addEventListener('hashchange',()=>openTab((location.hash||'#monitoraggio').slice(1),false));
  document.getElementById('refreshBtn').addEventListener('click',()=>{
    AngelaMonitor.load();
    if(AngelaAnalysis.isUnlocked())AngelaAnalysis.load();
  });
  setInterval(()=>AngelaMonitor.load(),ANGELA_CONFIG.refreshMs);
});

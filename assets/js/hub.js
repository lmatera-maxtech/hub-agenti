const PROJECTS=[
  {
    id:'nano-marta', idno:'AI-01', name:'NANO Marta', alias:'Energy · Vendita assistita', status:'online', type:'Multi-agent',
    ac:'#A95CFF', c2:'#5F2CC0', soft:'rgba(169,92,255,.16)',
    role:'Accoglie e qualifica il cliente energia, verifica i dati essenziali e prepara il passaggio a un operatore umano.',
    chips:['Inbound + Recall','Energy','Human handoff'],
    objective:'Ridurre il lavoro ripetitivo dell’operatore portando la chiamata fino a un handoff già qualificato e con i dati raccolti.',
    steps:['Accoglienza e comprensione del bisogno','Raccolta e verifica dei dati energia','Predisposizione della pratica','Handoff a operatore umano'],
    monitor:'projects/nano-marta/index.html#live', analysis:'projects/nano-marta/index.html#dettaglio'
  },
  {
    id:'angela', idno:'AI-02', name:'Angela', alias:'Screening · Massima Tranquillità', status:'online', type:'Single-agent',
    ac:'#FF5EA8', c2:'#C0247A', soft:'rgba(255,94,168,.16)',
    role:'Chiama una lista di numeri e classifica in modo strutturato la natura del soggetto o dell’attività che risponde.',
    chips:['Outbound','Classification','DB logging'],
    objective:'Automatizzare lo screening telefonico e trasformare ogni tentativo in un esito strutturato e consultabile dal team.',
    steps:['Avvio chiamata outbound','Conversazione di verifica','Raccolta degli indizi rilevanti','Classificazione e salvataggio dell’esito'],
    monitor:'projects/angela/index.html#monitoraggio', analysis:'projects/angela/index.html#analisi'
  },
  {
    id:'marta-legacy', idno:'AI-00', name:'Marta', alias:'Energy sales · Legacy', status:'offline', type:'Multi-agent',
    ac:'#8B6D85', c2:'#573C5C', soft:'rgba(139,109,133,.12)',
    role:'Versione precedente del progetto energy orientata alla vendita autonoma end-to-end. Attualmente non attiva.',
    chips:['Energy','Legacy','Offline'],
    objective:'Progetto precedente del percorso energy. Rimane visibile nell’hub come riferimento storico, ma non è operativo.',
    steps:['Accoglienza','Verifica dati','Ricerca offerta','Contratto e firma'], monitor:null, analysis:null
  }
];

let SEED=0;
function avatar(c1,c2,extraClass='avatar'){
  const s=SEED++;
  return `<svg class="${extraClass}" viewBox="0 0 220 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="bod${s}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}" stop-opacity=".62"/><stop offset="1" stop-color="${c2}" stop-opacity=".05"/></linearGradient>
    <radialGradient id="aur${s}" cx="50%" cy="42%" r="55%"><stop offset="0" stop-color="${c1}" stop-opacity=".55"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>
    <radialGradient id="ped${s}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${c1}" stop-opacity=".7"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>
    <clipPath id="cb${s}"><path d="M110 168c40 0 74 26 80 66 3 20-44 30-80 30s-83-10-80-30c6-40 40-66 80-66Z"/></clipPath>
  </defs>
  <circle class="av-aura" cx="110" cy="118" r="86" fill="url(#aur${s})"/>
  <ellipse cx="110" cy="272" rx="70" ry="16" fill="url(#ped${s})" opacity=".6"/>
  <ellipse class="ped-spin" cx="110" cy="272" rx="70" ry="16" fill="none" stroke="${c1}" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="5 9"/>
  <g class="av-float"><g class="av-sway"><path d="M110 168c40 0 74 26 80 66 3 20-44 30-80 30s-83-10-80-30c6-40 40-66 80-66Z" fill="url(#bod${s})" stroke="${c1}" stroke-width="1.5"/><g clip-path="url(#cb${s})" stroke="${c1}" stroke-opacity=".3" stroke-width=".8"><path d="M46 196h128M40 220h140M52 244h116M78 172v90M110 168v96M142 172v90"/></g><path d="M94 146h32v26c0 7-32 7-32 0Z" fill="${c1}" fill-opacity=".18" stroke="${c1}" stroke-width="1.3"/><ellipse cx="110" cy="100" rx="44" ry="50" fill="${c1}" fill-opacity=".1" stroke="${c1}" stroke-width="1.7"/><path class="av-scan" d="M72 100h76" stroke="${c1}" stroke-width="1.6" stroke-opacity=".8"/><g stroke="${c1}" stroke-opacity=".5" stroke-width=".9" fill="${c1}"><path d="M84 84l26-16 26 16M84 84v30l26 18 26-18V84"/><circle cx="96" cy="98" r="3.6"/><circle cx="124" cy="98" r="3.6"/><circle cx="110" cy="116" r="2.4"/></g><path d="M110 50v-12" stroke="${c1}" stroke-width="1.5" stroke-linecap="round"/><circle cx="110" cy="34" r="3.4" fill="${c1}"/><path d="M101 30a12 12 0 0 1 18 0" stroke="${c1}" stroke-width="1" stroke-opacity=".5"/></g></g>
  <g fill="${c1}"><circle class="av-p" cx="40" cy="150" r="2.4"/><circle class="av-p av-p2" cx="182" cy="120" r="2"/><circle class="av-p av-p3" cx="170" cy="200" r="2.6"/><circle class="av-p av-p2" cx="46" cy="210" r="1.8"/></g></svg>`;
}

const roster=document.getElementById('roster');
PROJECTS.forEach(p=>{
  const el=document.createElement('article');
  el.className='agent'+(p.status==='offline'?' offline':'');
  el.style.setProperty('--ac',p.ac);el.style.setProperty('--ac2',p.c2);el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',`Apri scheda ${p.name}`);
  el.innerHTML=`<div class="card-top"><span class="tag"><i></i>${p.status==='online'?'Online':'Offline'}</span><span class="idno">${p.idno}</span></div>${avatar(p.ac,p.c2)}<div class="aname">${p.name}</div><div class="aalias">${p.alias}</div><p class="arole">${p.role}</p><div class="chips">${p.chips.map(c=>`<span class="chip">${c}</span>`).join('')}</div><div class="open">${p.status==='online'?'Apri scheda':'Vedi progetto'} <span class="circle"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div>`;
  const open=()=>openPreview(p);el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  roster.appendChild(el);
});

const overlay=document.getElementById('overlay');
const preview=document.getElementById('preview');
function openPreview(p){
  preview.style.setProperty('--ac',p.ac);preview.style.setProperty('--acsoft',p.soft);
  preview.innerHTML=`<div class="preview-stage" id="previewStage"><div class="bigav" id="bigav">${avatar(p.ac,p.c2,'avatar')}</div><div class="pname">${p.name}</div><div class="pclub">${p.alias}</div><div class="pchips">${p.chips.map(c=>`<span class="chip">${c}</span>`).join('')}</div></div><div class="preview-details"><button class="close" aria-label="Chiudi">×</button><div class="preview-kicker">Scheda progetto · ${p.type}</div><h2>${p.status==='online'?'Operativo':'Progetto non attivo'}</h2><p class="objective">${p.objective}</p><div class="preview-divider"></div><div class="preview-label">Percorso principale</div><div class="steps">${p.steps.map((s,i)=>`<div class="step"><span class="n">${i+1}</span><span>${s}</span></div>`).join('')}</div><div class="preview-actions"><a class="action primary ${p.monitor?'':'disabled'}" ${p.monitor?`href="${p.monitor}"`:''}>Apri monitoraggio</a><a class="action ${p.analysis?'':'disabled'}" ${p.analysis?`href="${p.analysis}"`:''}>Apri analisi</a></div></div>`;
  preview.querySelector('.close').addEventListener('click',closePreview);
  const stage=preview.querySelector('#previewStage'),big=preview.querySelector('#bigav');
  if(matchMedia('(pointer:fine)').matches){stage.addEventListener('mousemove',e=>{const r=stage.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;big.style.transform=`rotateY(${px*18}deg) rotateX(${-py*11}deg)`;});stage.addEventListener('mouseleave',()=>big.style.transform='');}
  overlay.classList.add('show');document.body.style.overflow='hidden';preview.querySelector('.close').focus();
}
function closePreview(){overlay.classList.remove('show');document.body.style.overflow=''}
overlay.addEventListener('click',e=>{if(e.target===overlay)closePreview()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closePreview()});

/* subtle interactive sound-wave background */
(function(){const cv=document.getElementById('waves'),x=cv.getContext('2d');let mx=.5;function size(){const dpr=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';x.setTransform(dpr,0,0,dpr,0,0)}size();addEventListener('resize',size);addEventListener('pointermove',e=>mx=e.clientX/innerWidth,{passive:true});if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;(function loop(ms){const t=ms/1000,W=innerWidth,H=innerHeight;x.clearRect(0,0,W,H);for(let i=0;i<9;i++){const p=i/8,spread=p-.5,base=H*.54+spread*H*.34,amp=(20+48*(1-Math.abs(spread)*1.55))*(.68+.32*Math.sin(t*.55+i));x.beginPath();for(let px=0;px<=W;px+=18){const nx=px/W,local=1+.55*Math.exp(-Math.pow((nx-mx)*4,2)),y=base+Math.sin(nx*7+t*.72+i*.52)*amp*.48*local+Math.sin(nx*2.6-t*.4+i)*amp*.32*local;px?x.lineTo(px,y):x.moveTo(px,y)}const g=x.createLinearGradient(0,0,W,0),a=Math.max(.018+.075*(1-Math.abs(spread)*1.5),0);g.addColorStop(0,'rgba(186,51,200,0)');g.addColorStop(.5,`rgba(230,6,225,${a})`);g.addColorStop(1,'rgba(186,51,200,0)');x.strokeStyle=g;x.lineWidth=1.2;x.stroke()}requestAnimationFrame(loop)})(0)})();

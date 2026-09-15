/* ============================================================
   tab-dettaglio.js - tab Analisi NANO
   Endpoint: CONFIG.dettaglio.endpoint
   La tab resta protetta dalla password client-side gia' usata
   in produzione. Finche' e' bloccata il webhook NON viene chiamato.
   ============================================================ */

window.TabDettaglio = (function(){

  const C = window.CONFIG.dettaglio;
  const { $, fetchJson, unwrap } = window.U;
  const nf = new Intl.NumberFormat('it-IT');

  const state = { mode:'connecting', lastUpdate:null };
  const rangeState = { mode:'quick', days:7, from:null, to:null };
  const AUTH = C.auth || { attiva:false };
  const CHIAVE_SESSIONE = 'marta.analisi.sbloccata';

  let pollTimer = null;
  let active = false;
  let initialized = false;
  let lastData = null;

  /* -------------------- auth -------------------- */
  function sbloccata(){
    if (!AUTH.attiva) return true;
    try { return sessionStorage.getItem(CHIAVE_SESSIONE) === '1'; }
    catch(e){ return false; }
  }

  function mostraContenuto(on){
    $('gate').hidden = on;
    $('dettaglioContent').hidden = !on;
  }

  function tenta(){
    const campo = $('gatePwd');
    const err = $('gateErr');
    const ok = window.U.sha256(campo.value || '') === AUTH.hash;
    if (!ok){
      err.hidden = false;
      campo.value = '';
      campo.focus();
      return;
    }
    err.hidden = true;
    campo.value = '';
    try { sessionStorage.setItem(CHIAVE_SESSIONE, '1'); } catch(e){}
    mostraContenuto(true);
    if (active) avviaPolling();
  }

  function blocca(){
    try { sessionStorage.removeItem(CHIAVE_SESSIONE); } catch(e){}
    fermaPolling();
    mostraContenuto(false);
    state.mode = 'connecting';
    state.lastUpdate = null;
    window.App && window.App.syncHeader();
  }

  /* -------------------- dates + formatting -------------------- */
  function romeToday(){
    const p = {};
    new Intl.DateTimeFormat('en-CA', {
      timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(new Date()).forEach(x => { if (x.type !== 'literal') p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}`;
  }

  function addDays(s,n){
    const [y,m,d] = String(s).split('-').map(Number);
    const x = new Date(Date.UTC(y,m-1,d+n));
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}-${String(x.getUTCDate()).padStart(2,'0')}`;
  }

  function validDate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }

  function daysInclusive(from,to){
    if (!validDate(from) || !validDate(to)) return null;
    const a = new Date(from + 'T00:00:00Z').getTime();
    const b = new Date(to + 'T00:00:00Z').getTime();
    return Math.floor((b-a)/86400000) + 1;
  }

  function fmtDate(s,year=true){
    if (!s) return '—';
    const [y,m,d] = s.split('-').map(Number);
    return new Intl.DateTimeFormat('it-IT', {
      day:'2-digit', month:'short', ...(year ? {year:'numeric'} : {})
    }).format(new Date(Date.UTC(y,m-1,d)));
  }

  function fmtPct(v){
    return v == null ? 'N/D' : Number(v).toLocaleString('it-IT', { minimumFractionDigits:1, maximumFractionDigits:1 }) + '%';
  }
  function fmtNum(v){ return v == null ? 'N/D' : nf.format(Number(v)); }
  function fmtDuration(v){
    if (v == null) return 'N/D';
    const s = Math.round(Number(v));
    return s < 60 ? s + 's' : Math.floor(s/60) + 'm ' + String(s%60).padStart(2,'0') + 's';
  }
  function setValue(id,v,formatter=fmtNum){
    const e = $(id); if (!e) return;
    e.textContent = v == null ? 'N/D' : formatter(v);
    e.classList.toggle('nd', v == null);
  }

  /* -------------------- render -------------------- */
  function reliabilityBadge(el,status){
    if (!el) return;
    const cls = status === 'certified' ? 'cert' : status === 'conversation_analysis' ? 'conv' : 'nd';
    el.className = 'analysis-badge ' + cls;
    el.textContent = status === 'certified' ? 'Certificato' : status === 'conversation_analysis' ? 'Evaluation' : 'N/D';
  }

  function renderTransfers(t){
    t = t || {};
    setValue('trRequested', t.requested?.value);
    setValue('trCompleted', t.completed?.value);
    setValue('trLead', t.lead_no_operator?.value);
    setValue('trErrors', t.errors?.value);
    reliabilityBadge($('trCompletedBadge'), t.completed?.status);
    reliabilityBadge($('trLeadBadge'), t.lead_no_operator?.status);
    reliabilityBadge($('trErrorsBadge'), t.errors?.status);

    const b = t.errors?.breakdown;
    $('trErrorsSub').textContent = b
      ? `${fmtNum(b.failure_non_occupati)} failure non lead · ${fmtNum(b.esito_non_disponibile)} senza esito`
      : 'Failure non classificati come lead';

    const c = t.outcome_coverage;
    $('transferNote').textContent = c?.status === 'conversation_analysis'
      ? `Copertura esiti handoff: ${fmtNum(c.classified)} richieste classificate su ${fmtNum((c.classified||0)+(c.unclassified||0))} (${fmtPct(c.coverage_pct)}). Lead = failure con Result Explanation contenente “occupat…”.`
      : 'Esito handoff non disponibile.';
  }

  function renderFunnel(rows){
    const root = $('funnel');
    if (!Array.isArray(rows) || !rows.length){
      root.innerHTML = '<div class="analysis-frow"><span class="analysis-muted">Dati non disponibili</span></div>';
      return;
    }
    const total = rows[0].count || 0;
    root.innerHTML = rows.map((r,i) => {
      const width = (r.count != null && total > 0) ? Math.max(0,Math.min(100,r.count/total*100)) : 0;
      const badge = r.reliability === 'conversation_analysis'
        ? '<span class="analysis-badge conv">Conversazionale</span>'
        : '<span class="analysis-badge cert">Certificato</span>';
      return `<div class="analysis-frow">
        <div class="analysis-fname"><span class="analysis-stepno">${i+1}</span><div><strong>${r.label}</strong><div>${badge}</div></div></div>
        <div class="analysis-fnum">${r.count==null?'N/D':nf.format(r.count)}</div>
        <div class="analysis-fpc">${fmtPct(r.pct_total)}<br><span class="analysis-muted">su totale</span></div>
        <div class="analysis-fpc">${fmtPct(r.pct_previous)}<br><span class="analysis-muted">vs step prec.</span></div>
        <div class="analysis-barcell"><div class="analysis-bar"><i style="width:${width}%"></i></div><div class="analysis-drop">${i===0?'base funnel':`−${r.drop_count==null?'N/D':nf.format(r.drop_count)} · ${fmtPct(r.drop_pct)}`}</div></div>
      </div>`;
    }).join('');
  }

  function renderDrops(rows){
    const root = $('dropList'), hero = $('blockHero');
    if (!Array.isArray(rows) || !rows.length){
      root.innerHTML = '<div class="analysis-flowrow"><div class="name analysis-muted">Dati non disponibili</div></div>';
      hero.innerHTML = '<div><div class="analysis-block-eyebrow">Blocco principale del giorno</div><div class="analysis-hero-title">N/D</div></div>';
      return;
    }
    const ranked = [...rows].sort((a,b) => (b.not_progressed||0) - (a.not_progressed||0));
    const top = ranked[0];
    hero.innerHTML = `<div><div class="analysis-block-eyebrow">Blocco principale del giorno</div><div class="analysis-hero-title">${top.label}</div></div>
      <div class="analysis-hero-stat"><b>${fmtNum(top.not_progressed)}</b><span>chiamate perse</span></div>
      <div class="analysis-hero-stat"><b>${fmtPct(top.drop_pct)}</b><span>drop sullo step</span></div>
      <div class="analysis-hero-stat"><b>${fmtPct(top.share_non_handoff)}</b><span>quota dei no handoff</span></div>`;

    const max = Math.max(1,...rows.map(r => Number(r.share_non_handoff ?? r.drop_pct ?? 0)));
    root.innerHTML = rows.map(r => {
      const share = r.share_non_handoff;
      const metric = share ?? r.drop_pct ?? 0;
      const width = Math.max(3,(metric/max)*100);
      return `<div class="analysis-flowrow ${r===top?'hot':''}">
        <div class="name">${r.label}</div>
        <div class="num">${fmtNum(r.not_progressed)}</div>
        <div class="pct">${fmtPct(r.drop_pct)}</div>
        <div class="pct">${fmtPct(share)}</div>
        <div class="analysis-mini-track"><i style="width:${width}%"></i></div>
      </div>`;
    }).join('');
  }

  function renderErrorList(id,rows){
    const e = $(id);
    if (rows == null){ e.innerHTML = '<div class="analysis-errrow"><span>N/D</span><b>—</b></div>'; return; }
    if (!rows.length){ e.innerHTML = '<div class="analysis-errrow"><span>Nessun errore</span><b>0</b></div>'; return; }
    e.innerHTML = rows.slice(0,6).map(r => `<div class="analysis-errrow"><span>${String(r.code)}</span><b>${nf.format(r.count)}</b></div>`).join('');
  }

  function renderErrors(e){
    const c = e?.call_errors || {};
    setValue('callErrCount',c.count);
    $('callErrPct').textContent = c.pct == null ? 'N/D' : fmtPct(c.pct) + ' delle chiamate';
    renderErrorList('callErrList',c.by_code);
    const p = e?.practice_current_errors || {};
    setValue('practiceErrCount',p.count);
    renderErrorList('practiceErrList',p.by_code);
  }

  function renderRangeControls(meta){
    if (!meta) return;
    $('rangeLabel').textContent = `${fmtDate(meta.start)} → ${fmtDate(meta.end)}`;
    $('rangeInfo').textContent = `${meta.days} giorni · max ${meta.max_days || C.maxRangeDays || 90}`;
    if (rangeState.mode === 'quick'){
      $('rangeFrom').value = meta.start || '';
      $('rangeTo').value = meta.end || '';
    }
  }

  function renderRangeKpis(r){
    const defs = [
      ['Chiamate',r?.calls,null,'nel periodo'],
      ['Richieste operatore',r?.handoff_requested,r?.handoff_requested_pct,'su chiamate'],
      ['Trasferiti',r?.transferred,r?.transferred_pct_of_requested,'su richieste'],
      ['Lead · occupati',r?.lead_no_operator,r?.lead_pct_of_requested,'su richieste'],
      ['Senza richiesta operatore',r?.non_handoff,r?.calls?((r.non_handoff/r.calls)*100):null,'su chiamate']
    ];
    $('rangeKpis').innerHTML = defs.map(([l,v,p,s]) => `<div class="analysis-mini"><div class="label">${l}</div><div class="value">${fmtNum(v)}</div><div class="sub">${p==null?s:`${fmtPct(p)} · ${s}`}</div></div>`).join('');
  }

  function chart(data){
    const svg = $('trend'), tip = $('chartTip');
    tip.style.display = 'none';
    if (!Array.isArray(data) || !data.length){ svg.innerHTML = ''; return; }

    const W=1200,H=270,padL=48,padR=26,padT=20,padB=38,plotW=W-padL-padR,plotH=H-padT-padB;
    const vals = data.flatMap(d => [Number(d.calls)||0,Number(d.handoff_requested)||0,d.transferred==null?0:Number(d.transferred)||0]);
    const max = Math.max(1,...vals);
    const x = i => padL + (data.length===1 ? plotW/2 : i*plotW/(data.length-1));
    const y = v => padT + plotH - (Number(v)||0)/max*plotH;
    function path(key){ let out='',started=false; data.forEach((d,i)=>{ if(d[key]==null)return; out+=(started?' L ':'M ')+x(i).toFixed(1)+' '+y(d[key]).toFixed(1); started=true; }); return out; }

    let s='';
    for(let j=0;j<=4;j++){
      const yy=padT+j*plotH/4;
      s += `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="rgba(199,171,193,.08)"/><text x="${padL-9}" y="${yy+4}" text-anchor="end" fill="#987E93" font-size="10">${Math.round(max*(1-j/4))}</text>`;
    }
    s += `<path d="${path('calls')}" fill="none" stroke="#7B68FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${path('handoff_requested')}" fill="none" stroke="#FF4FD8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${path('transferred')}" fill="none" stroke="#62D68A" stroke-width="2.5" stroke-dasharray="8 7" stroke-linecap="round" stroke-linejoin="round"/>`;

    const labelEvery = Math.max(1,Math.ceil(data.length/10));
    data.forEach((d,i)=>{
      const cx=x(i);
      s += `<circle cx="${cx}" cy="${y(d.calls)}" r="3.1" fill="#7B68FF"/><circle cx="${cx}" cy="${y(d.handoff_requested)}" r="3.1" fill="#FF4FD8"/>${d.transferred==null?'':`<circle cx="${cx}" cy="${y(d.transferred)}" r="2.8" fill="#62D68A"/>`}`;
      if(i%labelEvery===0 || i===data.length-1) s += `<text x="${cx}" y="${H-10}" text-anchor="middle" fill="#987E93" font-size="10">${fmtDate(d.date,false)}</text>`;
      const half = data.length===1 ? plotW/2 : plotW/(data.length-1)/2;
      const left = i===0 ? padL : cx-half, right = i===data.length-1 ? W-padR : cx+half;
      s += `<rect class="analysis-hit" data-i="${i}" x="${left}" y="${padT}" width="${Math.max(1,right-left)}" height="${plotH}" fill="transparent"/>`;
    });
    svg.innerHTML = s;

    const mobile = window.matchMedia('(max-width:760px)').matches;
    svg.style.minWidth = mobile ? Math.max(520,data.length*68)+'px' : '100%';

    const showTip = (ev,el) => {
      const d = data[Number(el.dataset.i)];
      const box = $('chartPanel').getBoundingClientRect();
      tip.innerHTML = `<strong>${fmtDate(d.date)}</strong>
        <div class="analysis-tiprow"><span><i class="analysis-tipdot" style="background:#7B68FF"></i>Chiamate</span><b>${fmtNum(d.calls)}</b></div>
        <div class="analysis-tiprow"><span><i class="analysis-tipdot" style="background:#FF4FD8"></i>Richieste op.</span><b>${fmtNum(d.handoff_requested)} · ${fmtPct(d.handoff_requested_pct)}</b></div>
        <div class="analysis-tiprow"><span><i class="analysis-tipdot" style="background:#62D68A"></i>Trasferiti</span><b>${fmtNum(d.transferred)} · ${fmtPct(d.transferred_pct_of_requested)}</b></div>
        <div class="analysis-tiprow"><span>Lead</span><b>${fmtNum(d.lead_no_operator)} · ${fmtPct(d.lead_pct_of_requested)}</b></div>`;
      tip.style.display='block';
      if (!mobile){
        const px=Math.min(box.width-190,Math.max(8,ev.clientX-box.left+12));
        const py=Math.max(8,ev.clientY-box.top-90);
        tip.style.left=px+'px'; tip.style.top=py+'px';
      }
    };

    svg.querySelectorAll('.analysis-hit').forEach(el => {
      el.addEventListener('pointermove',ev => { if(ev.pointerType!=='touch') showTip(ev,el); });
      el.addEventListener('pointerdown',ev => showTip(ev,el));
      el.addEventListener('pointerleave',ev => { if(ev.pointerType!=='touch') tip.style.display='none'; });
    });
  }

  function renderDays(rows){
    const list = rows || [], last = list?.[list.length-1]?.date;
    $('daysBody').innerHTML = list.map(r => `<tr class="${r.date===last?'latest':''}">
      <td>${fmtDate(r.date)}</td><td>${fmtNum(r.calls)}</td><td>${fmtNum(r.handoff_requested)}</td>
      <td class="analysis-pctcell">${fmtPct(r.handoff_requested_pct)}</td>
      <td class="${r.transferred==null?'analysis-ndtext':''}">${fmtNum(r.transferred)}</td>
      <td class="analysis-pctcell">${fmtPct(r.transferred_pct_of_requested)}</td>
      <td class="${r.lead_no_operator==null?'analysis-ndtext':''}">${fmtNum(r.lead_no_operator)}</td>
      <td class="analysis-pctcell">${fmtPct(r.lead_pct_of_requested)}</td>
      <td>${fmtNum(r.valentina)}</td><td>${fmtNum(r.pod_pdr)}</td><td>${fmtNum(r.marco)}</td>
    </tr>`).join('');

    $('daysMobile').innerHTML = list.slice().reverse().map(r => `<article class="analysis-daycard">
      <div class="analysis-daytop"><strong>${fmtDate(r.date)}${r.date===last?'<span class="analysis-latestflag">ultimo</span>':''}</strong><span class="analysis-daycalls">${fmtNum(r.calls)} chiamate</span></div>
      <div class="analysis-daymetrics">
        <div class="analysis-daymetric"><span>Richieste op.</span><b>${fmtNum(r.handoff_requested)}</b><small>${fmtPct(r.handoff_requested_pct)} chiamate</small></div>
        <div class="analysis-daymetric"><span>Trasferiti</span><b>${fmtNum(r.transferred)}</b><small>${fmtPct(r.transferred_pct_of_requested)} richieste</small></div>
        <div class="analysis-daymetric"><span>Lead</span><b>${fmtNum(r.lead_no_operator)}</b><small>${fmtPct(r.lead_pct_of_requested)} richieste</small></div>
      </div>
      <details><summary>Dettaglio funnel del giorno</summary><div class="analysis-daydetail"><div><span>Valentina</span><b>${fmtNum(r.valentina)}</b></div><div><span>POD/PDR</span><b>${fmtNum(r.pod_pdr)}</b></div><div><span>Marco</span><b>${fmtNum(r.marco)}</b></div></div></details>
    </article>`).join('');
  }

  function renderRangeBlocks(rows){
    const root=$('rangeBlocks');
    if(!Array.isArray(rows)||!rows.length){root.innerHTML='<div class="analysis-muted">Dati non disponibili</div>';return;}
    const ranked=[...rows].sort((a,b)=>(b.share_non_handoff??-1)-(a.share_non_handoff??-1));
    const max=Math.max(1,...ranked.map(r=>Number(r.share_non_handoff||0)));
    root.innerHTML=ranked.map(r=>`<div class="analysis-rankrow"><div class="analysis-rankname">${r.label}</div><div class="analysis-rankval">${fmtNum(r.count)}</div><div class="analysis-rankpct">${fmtPct(r.share_non_handoff)}</div><div class="analysis-rankbar"><i style="width:${r.share_non_handoff==null?0:Math.max(3,(r.share_non_handoff/max)*100)}%"></i></div></div>`).join('');
  }

  function renderQuality(q){
    q=q||{};
    const ws=Array.isArray(q.warnings)?q.warnings:[];
    $('qualitySummary').textContent=ws.length?`${ws.length} avvisi`:'nessun avviso';
    $('qualityList').innerHTML=ws.length?ws.map(w=>`<li>${w.message}</li>`).join(''):'<li>Nessuna anomalia segnalata.</li>';
  }

  function render(d){
    lastData=d;
    $('analysisDate').value=d.date||$('analysisDate').value;
    $('analysisDayLabel').textContent=d.date?fmtDate(d.date):'—';
    setValue('calls',d.macro?.calls);
    setValue('avgDuration',d.macro?.avg_duration_sec,fmtDuration);
    setValue('valentina',d.macro?.reached_valentina);
    $('valentinaPct').textContent=d.macro?.reached_valentina_pct==null?'N/D':fmtPct(d.macro.reached_valentina_pct)+' delle chiamate';
    setValue('marco',d.macro?.reached_marco);
    $('marcoPct').textContent=d.macro?.reached_marco_pct==null?'N/D':fmtPct(d.macro.reached_marco_pct)+' delle chiamate';
    setValue('handoff',d.macro?.handoff_requested);
    $('handoffPct').textContent=d.macro?.handoff_requested_pct==null?'N/D':fmtPct(d.macro.handoff_requested_pct)+' delle chiamate';
    renderTransfers(d.transfers);
    renderFunnel(d.funnel);
    renderDrops(d.dropoff);
    renderErrors(d.errors);
    renderRangeControls(d.analysis_range);
    renderRangeKpis(d.range_recap);
    chart(d.trend_days_data);
    renderDays(d.trend_days_data);
    renderRangeBlocks(d.range_dropoff);
    renderQuality(d.data_quality);
  }

  /* -------------------- request / polling -------------------- */
  function buildUrl(){
    const p = new URLSearchParams({ date:$('analysisDate').value || romeToday() });
    if (rangeState.mode === 'custom' && validDate(rangeState.from) && validDate(rangeState.to)){
      p.set('range_from',rangeState.from);
      p.set('range_to',rangeState.to);
    } else {
      p.set('trend_days',String(rangeState.days));
    }
    return C.endpoint + '?' + p.toString();
  }

  async function poll(){
    if (!active || !sbloccata()) return;
    const res = await fetchJson(buildUrl(), C.timeoutMs);
    const d = unwrap(res.data);
    if (d){
      render(d);
      state.lastUpdate = Date.now();
      state.mode = 'live';
    } else {
      state.mode = 'offline';
      // I dati gia' visibili restano intenzionalmente a schermo.
    }
    window.App && window.App.syncHeader();
  }

  function avviaPolling(){
    if (!active || !sbloccata()) return;
    if (!pollTimer){
      poll();
      pollTimer = setInterval(poll, C.pollMs);
    }
  }

  function fermaPolling(){
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function start(){
    active = true;
    if (sbloccata()){
      mostraContenuto(true);
      avviaPolling();
    } else {
      mostraContenuto(false);
      state.mode='connecting';
      window.App && window.App.syncHeader();
    }
  }

  function stop(){
    active = false;
    fermaPolling();
    const tip=$('chartTip'); if(tip) tip.style.display='none';
  }

  function refresh(){
    return poll();
  }

  /* -------------------- controls -------------------- */
  function setQuick(days){
    rangeState.mode='quick';
    rangeState.days=days;
    document.querySelectorAll('#quickRange .analysis-range-pill[data-days]').forEach(b => b.classList.toggle('active',b.dataset.days===String(days)));
    $('customToggle').classList.remove('active');
    $('customPanel').classList.remove('open');
    if (active && sbloccata()) poll();
  }

  function initControls(){
    const today=romeToday();
    $('analysisDate').value=today;
    $('rangeTo').value=today;
    $('rangeFrom').value=addDays(today,-6);

    document.querySelectorAll('#panelDettaglio .analysis-mobile-nav [data-scroll]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = $(btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });

    $('analysisDate').addEventListener('change',()=>{
      if(rangeState.mode==='quick'){
        $('rangeTo').value=$('analysisDate').value;
        $('rangeFrom').value=addDays($('analysisDate').value,-(rangeState.days-1));
      }
      if (active && sbloccata()) poll();
    });

    document.querySelectorAll('#quickRange [data-days]').forEach(b => b.addEventListener('click',()=>setQuick(Number(b.dataset.days))));

    $('customToggle').addEventListener('click',()=>{
      $('customPanel').classList.toggle('open');
      $('customToggle').classList.toggle('active',$('customPanel').classList.contains('open'));
    });

    $('applyRange').addEventListener('click',()=>{
      const f=$('rangeFrom').value,t=$('rangeTo').value;
      const n=daysInclusive(f,t);
      if(!validDate(f)||!validDate(t)||f>t){ alert('Inserisci un intervallo date valido.'); return; }
      if(n > (C.maxRangeDays || 90)){ alert(`Il range massimo e' ${C.maxRangeDays || 90} giorni.`); return; }
      rangeState.mode='custom'; rangeState.from=f; rangeState.to=t;
      document.querySelectorAll('#quickRange [data-days]').forEach(b=>b.classList.remove('active'));
      $('customToggle').classList.add('active');
      if (active && sbloccata()) poll();
    });

    $('qualityBtn').addEventListener('click',()=>$('quality').classList.toggle('open'));
    $('chartPanel').addEventListener('pointerleave',()=>{ if(!window.matchMedia('(max-width:760px)').matches) $('chartTip').style.display='none'; });
    document.addEventListener('pointerdown',ev=>{ if(window.matchMedia('(max-width:760px)').matches && !$('chartPanel').contains(ev.target)) $('chartTip').style.display='none'; });
  }

  function initGate(){
    if (initialized) return;
    initialized = true;
    initControls();

    $('gateBtn').addEventListener('click',tenta);
    $('gatePwd').addEventListener('keydown',e=>{ if(e.key==='Enter') tenta(); });
    $('gateLock').addEventListener('click',blocca);

    mostraContenuto(sbloccata());
  }

  return {
    state,
    start,
    stop,
    refresh,
    pollMs:C.pollMs,
    label:'analisi',
    initGate
  };

})();

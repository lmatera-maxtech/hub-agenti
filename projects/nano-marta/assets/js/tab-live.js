/* ============================================================
   tab-live.js - tab "Live Ops"
   Alimentata dal workflow n8n/dashboard-live-v3.json
   ============================================================ */

window.TabLive = (function(){

  const C = window.CONFIG.live;
  const { $, fInt, fMin, fmtDur, fetchJson, unwrap } = window.U;

  const state = { mode:'connecting', lastUpdate:null };

  let prevLive = null;
  let pollTimer = null, tickTimer = null;
  let liveBase = [], liveAnchor = Date.now(), threshSec = null;

  /* ---------- render dei valori ricevuti ---------- */
  function render(d){
    const live = d.live_calls;
    const el = $('live');
    el.textContent = fInt(live);
    if (prevLive !== null && live !== prevLive){
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    }
    prevLive = live;

    $('avgAll').textContent     = fMin(d.avg_min_all);
    $('avgTransf').textContent  = fMin(d.avg_min_transferred);
    $('transfers').textContent  = fInt(d.transfers_today);
    $('totalCalls').textContent = fInt(d.total_calls_today);
    $('shortCalls').textContent = fInt(d.short_calls_today);

    renderLead(d);

    initLiveCalls(d);
  }

  /* ---------- lead di oggi per motivo ----------
     Tutti e cinque i box contano le righe call_leads del giorno
     corrente, raggruppate per reason: una sola fonte, un solo totale.
     d.leads_today (esito del tool letto da ElevenLabs) resta nella
     risposta ma non e' piu' mostrato. */
  function renderLead(d){
    const r = d.leads_by_reason || {};
    $('leadNoOperator').textContent      = fInt(r.operatore_non_trovato);
    $('leadDatiCliente').textContent     = fInt(r.dati_cliente_mancanti);
    $('leadDatiFornitura').textContent   = fInt(r.dati_fornitura_mancanti);
    $('leadErrorePratica').textContent   = fInt(r.errore_pratica);
    $('leadLineaInterrotta').textContent = fInt(r.linea_interrotta);

    const tot = $('leadTotal');
    if (tot) tot.textContent = d.leads_by_reason
      ? fInt(r.totale) + ' in totale' + (r.altro ? ' · ' + fInt(r.altro) + ' altro motivo' : '')
      : 'dato non disponibile';
  }

  /* ---------- chiamate in corso: il cronometro avanza in locale ---------- */
  function initLiveCalls(d){
    liveBase = Array.isArray(d.live_durations) ? d.live_durations.slice() : [];
    // rete di sicurezza: la sezione non può contraddire il numero grande
    const n = Number(d.live_calls);
    if (isFinite(n) && n > liveBase.length){ while (liveBase.length < n) liveBase.push(0); }
    // soglia = SOLO media delle chiamate trasferite
    const t = d.avg_min_transferred;
    threshSec = (t != null && !isNaN(t)) ? t * 60 : null;
    liveAnchor = Date.now();
    tick();
  }

  const BANDS = [
    { key:'fresh', label:'Appena iniziate', color:'rgba(230,6,225,.20)' },
    { key:'under', label:'Sotto media',     color:'rgba(230,6,225,.42)' },
    { key:'mid',   label:'In media',        color:'rgba(230,6,225,.68)' },
    { key:'over',  label:'Sopra media',     color:'#E606E1' }
  ];

  function tick(){
    const bar = $('lcBar'), dist = $('lcDist'), summaryEl = $('lcSummary'), legendEl = $('lcLegend');
    if (!bar) return;

    if (legendEl) legendEl.innerHTML = threshSec != null
      ? 'Distribuzione rispetto alla durata media di trasferimento (~<span class="lc-th">' + fmtDur(threshSec)
        + '</span>): più una chiamata è verso destra, più è vicina al passaggio all\'operatore.'
      : 'La distribuzione (rispetto alla media di trasferimento) sarà disponibile dopo il primo trasferimento di oggi.';

    const delta = (Date.now() - liveAnchor) / 1000;
    const durs  = liveBase.map(b => b + delta);
    const total = durs.length;

    if (!total){
      bar.innerHTML = '';
      dist.innerHTML = '<span class="lc-empty">nessuna chiamata in corso</span>';
      summaryEl.textContent = '—';
      return;
    }
    if (threshSec == null){
      bar.innerHTML = '<div class="lc-seg" style="width:100%;background:rgba(237,233,225,.28)"></div>';
      dist.innerHTML = '<span class="lc-li"><span class="d" style="background:rgba(237,233,225,.28)"></span>In corso <b>' + total + '</b></span>';
      summaryEl.textContent = total + ' in corso';
      return;
    }

    const counts = { fresh:0, under:0, mid:0, over:0 };
    for (const v of durs){
      if (v > threshSec * 1.15)       counts.over++;
      else if (v >= threshSec * 0.85) counts.mid++;
      else if (v >= threshSec * 0.4)  counts.under++;
      else                            counts.fresh++;
    }

    bar.innerHTML = BANDS.map(b => {
      const n = counts[b.key];
      return n ? '<div class="lc-seg" style="width:' + (n/total*100).toFixed(1) + '%;background:' + b.color + '"></div>' : '';
    }).join('');

    dist.innerHTML = BANDS.map(b =>
      '<span class="lc-li"><span class="d" style="background:' + b.color + '"></span>' + b.label + ' <b>' + counts[b.key] + '</b></span>'
    ).join('');

    summaryEl.textContent = counts.over + ' sopra la media';
  }

  /* ---------- tooltip dei box lead ----------
     Il tooltip vive sul body, non dentro la card: le .kpi hanno
     overflow:hidden e lo taglierebbero. Hover, focus da tastiera e
     tap sono tutti gestiti. */
  function initTips(){
    const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

    let tip = document.getElementById('kpiTip');
    if (!tip){
      tip = document.createElement('div');
      tip.id = 'kpiTip'; tip.className = 'ktip'; tip.setAttribute('role','tooltip');
      tip.hidden = true;
      document.body.appendChild(tip);
    }
    let attivo = null;

    function posiziona(btn){
      const r = btn.getBoundingClientRect();
      tip.style.left = '0px'; tip.style.top = '0px';
      const t = tip.getBoundingClientRect();
      let left = r.left + r.width / 2 - t.width / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - t.width - 10));
      let top = r.top - t.height - 10;
      if (top < 10) top = r.bottom + 10;
      tip.style.left = Math.round(left) + 'px';
      tip.style.top  = Math.round(top) + 'px';
    }
    function mostra(btn){
      attivo = btn;
      tip.innerHTML = '<b>' + esc(btn.dataset.tipName) + '</b><p>' + esc(btn.dataset.tip) + '</p>'
        + (btn.dataset.reason ? '<code>reason: ' + esc(btn.dataset.reason) + '</code>' : '');
      tip.hidden = false;
      posiziona(btn);
    }
    function nascondi(){ tip.hidden = true; attivo = null; }

    document.querySelectorAll('.kinfo').forEach(btn => {
      btn.addEventListener('pointerenter', () => { if (btn.matches(':hover')) mostra(btn); });
      btn.addEventListener('pointerleave', () => { if (attivo === btn) nascondi(); });
      btn.addEventListener('focus', () => mostra(btn));
      btn.addEventListener('blur',  () => { if (attivo === btn) nascondi(); });
      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        attivo === btn ? nascondi() : mostra(btn);
      });
    });

    document.addEventListener('click', e => { if (attivo && !e.target.closest('.kinfo')) nascondi(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && attivo) nascondi(); });
    window.addEventListener('scroll', () => { if (attivo) posiziona(attivo); }, true);
    window.addEventListener('resize', nascondi);
  }

  /* ---------- ciclo di aggiornamento ---------- */
  async function poll(){
    const res = await fetchJson(C.endpoint, C.timeoutMs);
    const d = unwrap(res.data);
    if (d){ render(d); state.lastUpdate = Date.now(); }
    state.mode = res.mode;
    window.App && window.App.syncHeader();
  }

  let tipsPronti = false;
  function start(){
    if (!tipsPronti){ initTips(); tipsPronti = true; }
    if (!pollTimer){ poll(); pollTimer = setInterval(poll, C.pollMs); }
    if (!tickTimer){ tickTimer = setInterval(tick, 1000); }   // cronometro locale
  }
  function stop(){
    clearInterval(pollTimer); clearInterval(tickTimer);
    pollTimer = null; tickTimer = null;
  }

  return { state, start, stop, refresh: poll, pollMs: C.pollMs, label: 'live' };

})();

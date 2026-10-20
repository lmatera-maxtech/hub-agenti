/* ============================================================
   data-collection.js - sezione "Raccolta dati" della tab Analisi
   Fonte: chiave "data_collection" prodotta dal nodo n8n
   "Data Collection Aggrega" (tabella Directus data_collection_log).

   Uso:
     MartaDataCollection.render(elemento, data.data_collection);

   Layout a scheda unica:
   - in alto un selettore con tutti i data_collection_id senza
     prefisso agente (quante chiamate li contengono);
   - sotto il dettaglio dell'id selezionato: descrizione, numeri
     chiave, distribuzione dei valori, andamento giornaliero e
     ultime chiamate.
   L'id selezionato sopravvive ai refresh automatici della tab.
   ============================================================ */

window.MartaDataCollection = (function(){

  const nfInt = new Intl.NumberFormat('it-IT');
  const nfPct = new Intl.NumberFormat('it-IT', { minimumFractionDigits:1, maximumFractionDigits:1 });
  const nf1   = new Intl.NumberFormat('it-IT', { maximumFractionDigits:1 });

  /* colori validati sul fondo #1E1127 */
  const RAMP  = ['#663e9e','#835cbe','#a17adf','#c099ff','#e0b9ff'];
  const CATEG = ['#3987e5','#d95926','#199e70','#c98500','#d55181','#9085e9'];
  const OTHER = '#6f6175';
  const LINE  = '#9085e9';
  const COLORS = {
    boolean:  { true:'#9085e9', false:'#d55181' },
    count:    { '0':RAMP[0], '1':RAMP[1], '2':RAMP[2], '3':RAMP[3], '4+':RAMP[4] },
    duration: { d0:RAMP[0], d1:RAMP[1], d2:RAMP[2], d3:RAMP[3], d4:RAMP[4] },
    text:     { filled:'#9085e9' }
  };
  const KIND = { boolean:'Sì / No', count:'Numero', duration:'Tempo (s)', categorical:'Valori', text:'Testo libero' };

  const stati = new WeakMap();

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  const fInt = v => v == null ? 'N/D' : nfInt.format(Number(v));
  const fPct = v => v == null ? 'N/D' : nfPct.format(Number(v)) + '%';
  function fSec(v){
    if (v == null) return 'N/D';
    const s = Math.round(Number(v));
    return s < 60 ? s + 's' : Math.floor(s/60) + 'm ' + String(s % 60).padStart(2,'0') + 's';
  }
  const fStat = (f,v) => f.kind === 'duration' ? fSec(v) : (v == null ? 'N/D' : nf1.format(v));
  function fDay(s, year){
    if (!s) return '—';
    const [y,m,d] = s.split('-').map(Number);
    return new Intl.DateTimeFormat('it-IT', { day:'2-digit', month:'short', ...(year ? { year:'numeric' } : {}) }).format(new Date(Date.UTC(y,m-1,d)));
  }
  function fDateTime(s){
    if (!s) return '—';
    // date_created di Directus mostrato cosi' com'e' (stesso orario della tabella)
    const raw = String(s).slice(0,16).replace('T',' ');
    const [ymd, hm] = raw.split(' ');
    return fDay(ymd, false) + ' ' + (hm || '');
  }
  const shortId = id => !id ? '—' : (id.length > 20 ? id.slice(0,12) + '…' + id.slice(-5) : id);

  function colorFor(f, b, i){
    if (b.key === 'other') return OTHER;
    if (f.kind === 'categorical') return CATEG[i % CATEG.length];
    return (COLORS[f.kind] || {})[b.key] || OTHER;
  }

  /* metrica giornaliera mostrata nel grafico, in base al tipo di campo */
  function dailyMetric(f){
    const top = (f.buckets || [])[0];
    if (f.kind === 'boolean') return { title:'% di Sì sulle chiamate valorizzate', unit:'%', get:x => x.f ? (x.b.true || 0) / x.f * 100 : null };
    if (f.kind === 'count')   return { title:'Media giornaliera', unit:'', get:x => x.m };
    if (f.kind === 'duration')return { title:'Tempo medio giornaliero', unit:'s', get:x => x.m };
    if (f.kind === 'categorical' && top) return { title:`% “${top.label}” sulle chiamate valorizzate`, unit:'%', get:x => x.f ? (x.b[top.key] || 0) / x.f * 100 : null };
    return { title:'% chiamate con il campo', unit:'%', get:x => x.n ? x.p / x.n * 100 : null };
  }
  const fMetric = (f, unit, v) => v == null ? 'N/D' : unit === '%' ? fPct(v) : unit === 's' ? fSec(v) : nf1.format(v);

  /* -------------------- blocchi del dettaglio -------------------- */
  function kpisHtml(f){
    const top = (f.buckets || [])[0];
    let last;
    if (f.kind === 'count' || f.kind === 'duration') last = ['Mediana', fStat(f, f.stats?.median), `media ${fStat(f, f.stats?.mean)} · p90 ${fStat(f, f.stats?.p90)}`];
    else if (f.kind === 'boolean'){ const y = (f.buckets||[]).find(b => b.key === 'true'); last = ['Sì', fPct(y ? y.pct_filled : 0), `${fInt(y ? y.count : 0)} chiamate`]; }
    else if (top) last = ['Valore più frequente', esc(top.label), `${fPct(top.pct_filled)} delle valorizzate`];
    else last = ['Valore più frequente', '—', ''];
    const k = [
      ['Presente in', fInt(f.calls_with_row), `${fPct(f.calls_with_row_pct)} delle chiamate`],
      ['Valorizzato', fInt(f.calls_with_value), f.calls_with_row ? `${fPct(f.calls_with_value / f.calls_with_row * 100)} di quelle con il campo` : '—'],
      ['Vuoto (null)', fInt(f.empty_count), 'riga salvata senza valore'],
      last
    ];
    return `<div class="dc-kpis">${k.map(([l,v,s]) => `<div class="dc-kpi"><span>${l}</span><b title="${typeof v === 'string' ? v.replace(/<[^>]+>/g,'') : ''}">${v}</b><small>${s}</small></div>`).join('')}</div>`;
  }

  const MANY = 6;   // oltre questa soglia: lista completa, colore unico, scroll e ricerca

  function valRows(f, q){
    const all = f.buckets || [];
    const many = all.length > MANY;
    const max = Math.max(...all.map(x => x.count), 1);
    const list = q ? all.filter(x => x.label.toLowerCase().includes(q)) : all;
    if (!list.length) return '<p class="dc-muted">Nessun valore contiene il testo cercato.</p>';
    return list.map(x => {
      const i = all.indexOf(x);
      const color = many ? (x.key === 'other' ? OTHER : LINE) : colorFor(f, x, i);
      return `<div class="dc-val">
        <span class="dc-vlabel" title="${esc(x.label)}">${esc(x.label)}</span>
        <span class="dc-vtrack"><i style="width:${Math.max(1, x.count / max * 100)}%;background:${color}"></i></span>
        <span class="dc-vnum">${fInt(x.count)}</span>
        <span class="dc-vpct">${fPct(x.pct_filled)}</span>
      </div>`;
    }).join('');
  }

  function valuesHtml(f, st){
    const b = f.buckets || [];
    if (!b.length) return '<p class="dc-muted">Nessun valore registrato nel periodo.</p>';
    const many = b.length > MANY;
    const search = many ? `<input class="dc-vsearch" type="search" placeholder="Cerca tra i ${fInt(b.length)} valori…" aria-label="Cerca valore" value="${esc(st.vq || '')}"/>` : '';
    return `${search}<div class="dc-vals${many ? ' dc-vals-many' : ''}">${valRows(f, st.vq)}</div>
      <div class="dc-note">% sulle ${fInt(f.calls_with_value)} chiamate valorizzate${many ? ` · ${fInt(f.distinct_values ?? b.length)} valori distinti, dal più frequente` : ''}</div>`;
  }

  function trendSvg(f, width){
    const days = f.daily || [];
    const M = dailyMetric(f);
    const pts = days.map(x => ({ d:x.d, v:M.get(x), x }));
    const vals = pts.map(p => p.v).filter(v => v != null);
    if (!vals.length) return { title:M.title, svg:'<p class="dc-muted">Nessun dato giornaliero nel periodo.</p>' };
    const W = Math.max(260, Math.round(width || 520)), H = 170, L = 40, R = 12, T = 12, B = 26, pw = W-L-R, ph = H-T-B;
    const maxV = M.unit === '%' ? 100 : Math.max(...vals) * 1.15 || 1;
    const x = i => L + (pts.length === 1 ? pw/2 : i * pw / (pts.length - 1));
    const y = v => T + ph - (v / maxV) * ph;
    let g = '';
    for (let j = 0; j <= 4; j++){
      const yy = T + j * ph / 4, val = maxV * (1 - j/4);
      g += `<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="rgba(199,171,193,.08)"/><text x="${L-6}" y="${yy+3.5}" text-anchor="end" fill="#987E93" font-size="9.5">${M.unit === '%' ? Math.round(val) + '%' : M.unit === 's' ? fSec(val) : nf1.format(val)}</text>`;
    }
    let path = '', on = false;
    pts.forEach((p,i) => { if (p.v == null){ on = false; return; } path += (on ? ' L ' : ' M ') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); on = true; });
    const every = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(pw / 64))));
    let dots = '', labels = '', hits = '';
    pts.forEach((p,i) => {
      if (p.v != null) dots += `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.2" fill="${LINE}" stroke="#1E1127" stroke-width="2"/>`;
      if (i % every === 0 || i === pts.length - 1) labels += `<text x="${x(i)}" y="${H-8}" text-anchor="${pts.length > 1 && i === 0 ? 'start' : pts.length > 1 && i === pts.length - 1 ? 'end' : 'middle'}" fill="#987E93" font-size="9.5">${fDay(p.d,false)}</text>`;
      const half = pts.length === 1 ? pw/2 : pw/(pts.length-1)/2;
      const left = Math.max(L, x(i) - half), right = Math.min(W-R, x(i) + half);
      hits += `<rect class="dc-hit" data-i="${i}" x="${left}" y="${T}" width="${Math.max(1,right-left)}" height="${ph}" fill="transparent"/>`;
    });
    return { title:M.title, pts, M, svg:`<svg class="dc-trend" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(M.title)}">${g}<path d="${path}" fill="none" stroke="${LINE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}${hits}</svg>` };
  }

  function recentHtml(f){
    const r = f.recent || [];
    if (!r.length) return '';
    return `<details class="dc-recent"><summary>Ultime ${r.length} chiamate con questo campo</summary>
      <table><thead><tr><th>Data</th><th>conversation_id</th><th>value</th></tr></thead><tbody>
      ${r.map(x => `<tr><td>${fDateTime(x.date_created)}</td><td><code title="${esc(x.conversation_id)}">${esc(shortId(x.conversation_id))}</code></td><td>${x.value == null ? '<span class="dc-muted">null</span>' : esc(x.value.length > 80 ? x.value.slice(0,77) + '…' : x.value)}</td></tr>`).join('')}
      </tbody></table></details>`;
  }

  function panelHtml(f, st){
    const t = { title: dailyMetric(f).title };
    return {
      t,
      html: `<div class="dc-panel">
        <div class="dc-phead">
          <div><code class="dc-pid">${esc(f.id)}</code><span class="dc-kind">${KIND[f.kind] || f.kind}</span></div>
          <p>${f.description ? esc(f.description) : '<span class="dc-muted">Nessuna descrizione salvata in data_collection_explanation.</span>'}</p>
        </div>
        ${kpisHtml(f)}
        <div class="dc-cols${(f.buckets || []).length > MANY ? ' dc-cols-wide' : ''}">
          <div class="dc-box"><h4>${(f.buckets || []).length > MANY ? 'Tutti i valori registrati' : 'Valori registrati'}</h4>${valuesHtml(f, st)}</div>
          <div class="dc-box dc-trendbox"><h4>${esc(t.title)} · per giorno</h4><div class="dc-trendwrap"></div><div class="dc-tip" role="status"></div></div>
        </div>
        ${recentHtml(f)}
      </div>`
    };
  }

  /* -------------------- disegno -------------------- */
  function fieldsOf(st){
    return (st.payload.fields || []).filter(x => x.agent === 'altro')
      .sort((a,b) => (b.calls_with_row - a.calls_with_row) || a.id.localeCompare(b.id,'it'));
  }

  function draw(el){
    const st = stati.get(el);
    const all = fieldsOf(st);
    st.refs.sum.innerHTML = `<b>${fInt(st.payload.calls_total)}</b> chiamate nel periodo · <b>${fInt(all.length)}</b> data_collection_id · seleziona un campo per il dettaglio`;
    if (!all.length){
      st.refs.chips.innerHTML = '';
      st.refs.panel.innerHTML = '<p class="dc-muted dc-empty">Nessun data_collection_id senza prefisso agente nel periodo.</p>';
      return;
    }
    if (!all.some(f => f.id === st.sel)) st.sel = all[0].id;
    st.refs.chips.innerHTML = all.map(f => `<button type="button" role="tab" class="dc-chip${f.id===st.sel?' on':''}" aria-selected="${f.id===st.sel}" data-id="${esc(f.id)}">
        <code>${esc(f.id)}</code><span><b>${fInt(f.calls_with_row)}</b> · ${fPct(f.calls_with_row_pct)}</span></button>`).join('');
    const f = all.find(x => x.id === st.sel);
    if (st.lastSel !== f.id) st.vq = '';
    const p = panelHtml(f, st);
    const wasOpen = st.refs.panel.querySelector('.dc-recent')?.open;
    st.refs.panel.innerHTML = p.html;
    if (wasOpen && st.lastSel === f.id){ const d = st.refs.panel.querySelector('.dc-recent'); if (d) d.open = true; }
    st.lastSel = f.id;
    drawTrend(st, f);
  }

  /* il grafico usa la larghezza reale del box: testo mai deformato */
  function drawTrend(st, f){
    const wrap = st.refs.panel.querySelector('.dc-trendwrap'); if (!wrap) return;
    const t = trendSvg(f, wrap.clientWidth);
    wrap.innerHTML = t.svg;
    bindTrend(st, f, t);
  }

  function bindTrend(st, f, t){
    const svg = st.refs.panel.querySelector('.dc-trend'); if (!svg || !t.pts) return;
    const tip = st.refs.panel.querySelector('.dc-tip'), box = st.refs.panel.querySelector('.dc-trendbox');
    const show = (ev, el) => {
      const p = t.pts[Number(el.dataset.i)];
      tip.innerHTML = `<strong>${fDay(p.d,true)}</strong>
        <div><span>${esc(t.M.unit === '%' ? 'Valore' : 'Media')}</span><b>${fMetric(f, t.M.unit, p.v)}</b></div>
        <div><span>Valorizzate</span><b>${fInt(p.x.f)}</b></div>
        <div><span>Chiamate del giorno</span><b>${fInt(p.x.n)}</b></div>`;
      tip.style.display = 'block';
      const r = box.getBoundingClientRect();
      tip.style.left = Math.min(r.width - tip.offsetWidth - 6, Math.max(6, ev.clientX - r.left + 12)) + 'px';
      tip.style.top = Math.max(6, ev.clientY - r.top - tip.offsetHeight - 8) + 'px';
    };
    svg.querySelectorAll('.dc-hit').forEach(h => {
      h.addEventListener('pointermove', ev => show(ev, h));
      h.addEventListener('pointerdown', ev => show(ev, h));
    });
    svg.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
  }

  function skeleton(el, st){
    el.innerHTML = `
      <div class="dc">
        <div class="dc-msg" data-r="msg" hidden></div>
        <div class="dc-body" data-r="body">
          <div class="dc-sum" data-r="sum"></div>
          <div class="dc-chips" data-r="chips" role="tablist" aria-label="data_collection_id"></div>
          <div data-r="panel"></div>
        </div>
      </div>`;
    const q = r => el.querySelector(`[data-r="${r}"]`);
    st.refs = { msg:q('msg'), body:q('body'), sum:q('sum'), chips:q('chips'), panel:q('panel') };
    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (!st.payload || st.refs.body.hidden) return;
        const f = fieldsOf(st).find(x => x.id === st.sel);
        if (f) drawTrend(st, f);
      }, 150);
    });
    st.refs.panel.addEventListener('input', ev => {
      if (!ev.target.classList.contains('dc-vsearch')) return;
      st.vq = ev.target.value.trim().toLowerCase();
      const f = fieldsOf(st).find(x => x.id === st.sel);
      const box = st.refs.panel.querySelector('.dc-vals');
      if (f && box) box.innerHTML = valRows(f, st.vq);
    });
    st.refs.chips.addEventListener('click', ev => {
      const b = ev.target.closest('[data-id]'); if (!b) return;
      st.sel = b.dataset.id; draw(el);
    });
  }

  /* -------------------- API -------------------- */
  function render(el, payload){
    if (!el) return;
    let st = stati.get(el);
    if (!st){
      st = { sel:null, lastSel:null, vq:'', payload:null };
      stati.set(el, st);
      skeleton(el, st);
    }
    if (!payload || payload.available === false){
      st.refs.body.hidden = true;
      st.refs.msg.hidden = false;
      st.refs.msg.textContent = !payload
        ? 'Dati raccolta non presenti nella risposta: importa in n8n il workflow Analisi v1.9.'
        : 'Raccolta dati non disponibile' + (payload.error ? ': ' + payload.error : '.');
      return;
    }
    st.refs.msg.hidden = true;
    st.refs.body.hidden = false;
    st.payload = payload;
    draw(el);
  }

  return { render };
})();

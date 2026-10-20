/* ============================================================
   data-collection.js - sezione "Raccolta dati" della tab Analisi
   Fonte: chiave "data_collection" prodotta dal nodo n8n
   "Data Collection Aggrega" (tabella Directus data_collection_log).

   Uso:
     MartaDataCollection.render(elemento, data.data_collection);

   Vista minima: scegli un data_collection_id e vedi, per ogni valore,
   quante chiamate lo hanno e la % sul totale delle chiamate del periodo.
   Filtro opzionale "Solo chiamate con esito = ...": usa gli incroci
   (data_collection.cross[campo].esito) calcolati dal workflow.
   ============================================================ */

window.MartaDataCollection = (function(){

  const nfInt = new Intl.NumberFormat('it-IT');
  const nfPct = new Intl.NumberFormat('it-IT', { minimumFractionDigits:1, maximumFractionDigits:1 });
  const BAR = '#9085e9';
  const FILTER_FIELD = 'esito';   // campo usato dal filtro

  const stati = new WeakMap();

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  const fInt = v => v == null ? '—' : nfInt.format(Number(v));
  const fPct = v => v == null ? '—' : nfPct.format(Number(v)) + '%';

  // prima frase della descrizione salvata in data_collection_explanation
  function firstSentence(t){
    if (!t) return '';
    const s = String(t).replace(/\s+/g, ' ').trim();
    const m = s.match(/^.*?[.?!](\s|$)/);
    return (m ? m[0] : s).trim();
  }

  function fieldsOf(st){
    return (st.payload.fields || []).filter(x => x.agent === 'altro')
      .sort((a,b) => a.id.localeCompare(b.id,'it'));
  }

  function draw(el){
    const st = stati.get(el);
    const all = fieldsOf(st);
    if (!all.length){
      st.refs.chips.innerHTML = '';
      st.refs.panel.innerHTML = '<p class="dc-empty">Nessun dato nel periodo.</p>';
      return;
    }
    if (!all.some(f => f.id === st.sel)) st.sel = all[0].id;
    st.refs.chips.innerHTML = all.map(f =>
      `<button type="button" role="tab" class="dc-chip${f.id===st.sel?' on':''}" aria-selected="${f.id===st.sel}" data-id="${esc(f.id)}">${esc(f.id)}</button>`).join('');

    const f = all.find(x => x.id === st.sel);
    const ff = all.find(x => x.id === FILTER_FIELD);
    const filterVals = ff ? (ff.buckets || []).filter(b => b.key.startsWith('v:')).map(b => ({ v:b.key.slice(2), n:b.count })) : [];
    if (st.filter && !filterVals.some(x => x.v === st.filter)) st.filter = '';
    const canFilter = !!ff && f.id !== FILTER_FIELD;
    const table = canFilter && st.filter ? ((st.payload.cross || {})[f.id] || {})[FILTER_FIELD] : null;

    let N, rows, foot, note = '';
    if (canFilter && st.filter && table){
      // conteggi del campo solo sulle chiamate con esito = filtro
      N = (filterVals.find(x => x.v === st.filter) || {}).n || 0;
      rows = Object.entries(table)
        .map(([val, per]) => ({ label:val, count:per[st.filter] || 0 }))
        .filter(r => r.count > 0)
        .sort((a,b) => b.count - a.count);
      const counted = rows.reduce((a,r) => a + r.count, 0);
      if (N - counted > 0) rows.push({ label:'(vuoto / non registrato)', count:N - counted, muted:true });
      foot = `% sulle ${fInt(N)} chiamate con ${esc(FILTER_FIELD)} = ${esc(st.filter)}`;
    } else {
      if (canFilter && st.filter && !table) note = '<p class="dc-note">Filtro non disponibile per questo campo (troppi valori diversi): mostro tutte le chiamate.</p>';
      N = f.calls_total || 0;
      rows = (f.buckets || []).slice().sort((a,b) => b.count - a.count);
      if (f.empty_count > 0) rows.push({ label:'(vuoto)', count:f.empty_count, muted:true });
      if (f.missing_count > 0) rows.push({ label:'(non registrato)', count:f.missing_count, muted:true });
      foot = `% sulle ${fInt(N)} chiamate del periodo`;
    }

    // menu filtro
    st.refs.filter.hidden = !canFilter;
    if (canFilter){
      st.refs.filter.innerHTML = `<label>Solo chiamate con ${esc(FILTER_FIELD)}
        <select class="dc-filter-sel">
          <option value="">tutte le chiamate</option>
          ${filterVals.map(x => `<option value="${esc(x.v)}"${x.v === st.filter ? ' selected' : ''}>${esc(x.v)} (${fInt(x.n)})</option>`).join('')}
        </select></label>`;
    }
    const max = Math.max(1, ...rows.map(r => r.count));
    const desc = firstSentence(f.description);

    st.refs.panel.innerHTML = `
      ${desc ? `<p class="dc-desc">${esc(desc)}</p>` : ''}
      ${note}
      <div class="dc-table">
        <div class="dc-row dc-head"><span>Valore</span><span></span><span>Chiamate</span><span>%</span></div>
        ${rows.map(r => `<div class="dc-row${r.muted ? ' muted' : ''}">
          <span class="dc-name" title="${esc(r.label)}">${esc(r.label)}</span>
          <span class="dc-track"><i style="width:${Math.max(1, r.count / max * 100)}%;background:${r.muted ? '#4a3c51' : BAR}"></i></span>
          <span class="dc-num">${fInt(r.count)}</span>
          <span class="dc-pct">${fPct(N ? r.count / N * 100 : null)}</span>
        </div>`).join('')}
      </div>
      <p class="dc-foot">${foot}</p>`;
  }

  function skeleton(el, st){
    el.innerHTML = `
      <div class="dc">
        <div class="dc-msg" data-r="msg" hidden></div>
        <div class="dc-body" data-r="body">
          <div class="dc-chips" data-r="chips" role="tablist" aria-label="data_collection_id"></div>
          <div class="dc-filter" data-r="filter" hidden></div>
          <div class="dc-panel" data-r="panel"></div>
        </div>
      </div>`;
    const q = r => el.querySelector(`[data-r="${r}"]`);
    st.refs = { msg:q('msg'), body:q('body'), chips:q('chips'), filter:q('filter'), panel:q('panel') };
    st.refs.filter.addEventListener('change', ev => {
      if (!ev.target.classList.contains('dc-filter-sel')) return;
      st.filter = ev.target.value; draw(el);
    });
    st.refs.chips.addEventListener('click', ev => {
      const b = ev.target.closest('[data-id]'); if (!b) return;
      st.sel = b.dataset.id; draw(el);
    });
  }

  function render(el, payload){
    if (!el) return;
    let st = stati.get(el);
    if (!st){
      st = { sel:null, filter:'', payload:null };
      stati.set(el, st);
      skeleton(el, st);
    }
    if (!payload || payload.available === false){
      st.refs.body.hidden = true;
      st.refs.msg.hidden = false;
      st.refs.msg.textContent = !payload
        ? 'Dati non presenti nella risposta: importa in n8n il workflow Analisi v1.9.'
        : 'Dati non disponibili' + (payload.error ? ': ' + payload.error : '.');
      return;
    }
    st.refs.msg.hidden = true;
    st.refs.body.hidden = false;
    st.payload = payload;
    draw(el);
  }

  return { render };
})();

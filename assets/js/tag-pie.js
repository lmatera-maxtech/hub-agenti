/* ============================================================
   tag-pie.js - grafico a torta dei TAG conversazione (ElevenLabs)
   Componente condiviso dalle tab Analisi di NANO Marta e Angela.

   Uso:
     MaxTechTagPie.render(elemento, data.tags);

   Il payload arriva dal blocco "tags" prodotto dai workflow n8n
   di Analisi (nodo "Tag Aggrega"):

     {
       available: true,
       items: [{ tag:"...", count: 12 }, ...],
       untagged: 4,
       conversations_total: 40,
       conversations_with_tags: 36,
       assignments_total: 51,
       range: { from:"2026-09-01", to:"2026-09-21" },
       note: "...", diag: {...}
     }

   Deselezionando un tag la fetta esce dal grafico e le percentuali
   vengono ricalcolate sulla sola base dei tag ancora selezionati.
   La selezione sopravvive ai refresh automatici della tab.
   ============================================================ */

window.MaxTechTagPie = (function(){

  const PALETTE = [
    '#E606E1','#47C7E8','#62D68A','#F0B44E','#A68CFF',
    '#FF8FA3','#4FD1C5','#C084FC','#F06A6A','#7B68FF',
    '#F5D76E','#8FD3F4','#B5E48C','#FFA07A','#9F86FF'
  ];
  const NEUTRO    = '#7E6C86';
  const SENZA_TAG = '__senza_tag__';

  const nfInt = new Intl.NumberFormat('it-IT');
  const nfPct = new Intl.NumberFormat('it-IT', { minimumFractionDigits:1, maximumFractionDigits:1 });

  /* stato per contenitore: sopravvive ai re-render del polling */
  const stato = new WeakMap();

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function fmtInt(v){ return v == null ? 'N/D' : nfInt.format(Number(v)); }
  function fmtPct(v){ return v == null ? 'N/D' : nfPct.format(Number(v) * 100) + '%'; }
  function etichetta(tag){ return tag === SENZA_TAG ? 'Senza tag' : tag; }

  /* -------------------- normalizzazione payload -------------------- */
  function normalizza(payload){
    if (!payload) return { stato:'assente' };
    if (payload.available === false){
      return { stato:'non_disponibile', motivo: payload.error || payload.reason || null };
    }

    const grezzi = Array.isArray(payload.items) ? payload.items : [];
    const items = grezzi
      .filter(x => x && x.tag != null && Number(x.count) > 0)
      .map(x => ({ tag:String(x.tag), count:Number(x.count), neutro:false }));

    items.sort((a,b) => (b.count - a.count) || a.tag.localeCompare(b.tag,'it'));
    items.forEach((x,i) => { x.color = PALETTE[i % PALETTE.length]; });

    const senza = Number(payload.untagged || 0);
    if (senza > 0) items.push({ tag:SENZA_TAG, count:senza, neutro:true, color:NEUTRO });

    if (!items.length) return { stato:'vuoto', payload };
    return { stato:'ok', items, payload };
  }

  /* -------------------- grafico -------------------- */
  function donut(selezionate, totaleSelezionato){
    const R = 54, CX = 70, CY = 70, SPESSORE = 22;
    const C = 2 * Math.PI * R;

    if (!selezionate.length || !totaleSelezionato){
      return `<svg class="tagpie-svg" viewBox="0 0 140 140" role="img" aria-label="Nessun tag selezionato">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(199,171,193,.14)" stroke-width="${SPESSORE}"></circle>
      </svg>`;
    }

    const gap = selezionate.length > 1 ? 1.4 : 0;
    let offset = 0;
    const archi = selezionate.map(s => {
      const quota = s.count / totaleSelezionato;
      const lunghezza = Math.max(0.6, quota * C - gap);
      const arco = `<circle class="tagpie-slice" data-tag="${esc(s.tag)}"
        cx="${CX}" cy="${CY}" r="${R}" fill="none"
        stroke="${s.color}" stroke-width="${SPESSORE}"
        stroke-dasharray="${lunghezza.toFixed(2)} ${(C - lunghezza).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"><title>${esc(etichetta(s.tag))}: ${fmtInt(s.count)} · ${fmtPct(quota)}</title></circle>`;
      offset += quota * C;
      return arco;
    }).join('');

    return `<svg class="tagpie-svg" viewBox="0 0 140 140" role="img" aria-label="Distribuzione dei tag selezionati">
      <g transform="rotate(-90 ${CX} ${CY})">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(199,171,193,.10)" stroke-width="${SPESSORE}"></circle>
        ${archi}
      </g>
    </svg>`;
  }

  /* -------------------- render -------------------- */
  function messaggio(root, testo){
    root.innerHTML = `<div class="tagpie tagpie-empty"><p class="tagpie-msg">${esc(testo)}</p></div>`;
  }

  function render(root, payload){
    if (!root) return;

    const dati = normalizza(payload);

    if (dati.stato === 'assente'){
      messaggio(root, 'Tag non presenti nella risposta del workflow. Aggiorna il flusso n8n di Analisi per abilitare il blocco tag.');
      return;
    }
    if (dati.stato === 'non_disponibile'){
      messaggio(root, 'Tag non disponibili da ElevenLabs' + (dati.motivo ? ': ' + dati.motivo + '.' : '.') + ' Il resto della tab non cambia.');
      return;
    }
    if (dati.stato === 'vuoto'){
      messaggio(root, 'Nessuna conversazione ElevenLabs con tag nel periodo selezionato.');
      return;
    }

    if (!stato.has(root)) stato.set(root, { esclusi:new Set() });
    const s = stato.get(root);

    disegna(root, dati, s);
  }

  function disegna(root, dati, s){
    const items = dati.items;
    const p = dati.payload || {};

    const totaleAll  = items.reduce((a,x) => a + x.count, 0);
    const selezionate = items.filter(x => !s.esclusi.has(x.tag));
    const totaleSel  = selezionate.reduce((a,x) => a + x.count, 0);

    const legenda = items.map(x => {
      const attivo = !s.esclusi.has(x.tag);
      const quota  = attivo && totaleSel ? x.count / totaleSel : null;
      return `<button type="button" class="tagpie-item${attivo ? '' : ' off'}" data-tag="${esc(x.tag)}"
                aria-pressed="${attivo}" title="${attivo ? 'Escludi' : 'Includi'} ${esc(etichetta(x.tag))}">
          <i style="background:${x.color}"></i>
          <span class="tagpie-name">${esc(etichetta(x.tag))}</span>
          <span class="tagpie-pct">${attivo ? fmtPct(quota) : '—'}</span>
          <span class="tagpie-num">${fmtInt(x.count)}</span>
        </button>`;
    }).join('');

    const tuttiAttivi = selezionate.length === items.length;
    const centro = !selezionate.length
      ? `<b>—</b><span>nessun tag attivo</span>`
      : tuttiAttivi
        ? `<b>${fmtInt(totaleSel)}</b><span>assegnazioni nel periodo</span>`
        : `<b>${fmtPct(totaleAll ? totaleSel / totaleAll : 0)}</b><span>${fmtInt(totaleSel)} su ${fmtInt(totaleAll)}</span>`;

    const conv = p.conversations_total;
    const conTag = p.conversations_with_tags;
    const piede = [
      conv != null ? `${fmtInt(conv)} conversazioni nel periodo` : null,
      conTag != null ? `${fmtInt(conTag)} con almeno un tag` : null,
      p.assignments_total != null ? `${fmtInt(p.assignments_total)} assegnazioni tag` : null
    ].filter(Boolean).join(' · ');

    root.innerHTML = `<div class="tagpie">
      <div class="tagpie-chart">
        ${donut(selezionate, totaleSel)}
        <div class="tagpie-center">${centro}</div>
      </div>
      <div class="tagpie-side">
        <div class="tagpie-tools">
          <span class="tagpie-selinfo">${fmtInt(selezionate.length)} di ${fmtInt(items.length)} tag selezionati</span>
          <span class="tagpie-actions">
            <button type="button" data-act="all">Tutti</button>
            <button type="button" data-act="none">Nessuno</button>
          </span>
        </div>
        <div class="tagpie-legend">${legenda}</div>
      </div>
    </div>
    ${piede ? `<p class="tagpie-foot">${esc(piede)}. Le percentuali sono calcolate sui soli tag selezionati.</p>` : ''}`;

    const wrap = root.querySelector('.tagpie');

    root.querySelectorAll('.tagpie-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (s.esclusi.has(tag)) s.esclusi.delete(tag); else s.esclusi.add(tag);
        disegna(root, dati, s);
      });
      btn.addEventListener('pointerenter', () => evidenzia(wrap, btn.dataset.tag));
      btn.addEventListener('pointerleave', () => evidenzia(wrap, null));
    });

    root.querySelectorAll('.tagpie-actions button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.act === 'all') s.esclusi.clear();
        else items.forEach(x => s.esclusi.add(x.tag));
        disegna(root, dati, s);
      });
    });
  }

  function evidenzia(wrap, tag){
    if (!wrap) return;
    wrap.classList.toggle('tagpie-hl', !!tag);
    wrap.querySelectorAll('.tagpie-slice').forEach(sl => {
      sl.classList.toggle('on', !!tag && sl.dataset.tag === tag);
    });
  }

  /* azzera la selezione, es. quando cambia il progetto o il range */
  function reset(root){
    if (root && stato.has(root)) stato.get(root).esclusi.clear();
  }

  return { render, reset };

})();

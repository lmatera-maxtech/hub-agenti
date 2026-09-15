/* ============================================================
   app.js - guscio: cambio tab, stato in header, pulsanti
   Ogni tab ha il suo webhook e il suo ciclo: quella nascosta
   viene fermata, cosi non si chiamano due flussi per niente.
   ============================================================ */

window.App = (function(){

  const { $ } = window.U;

  const TABS = {
    live:      { mod: window.TabLive,      btn:'tabBtnLive',      panel:'panelLive' },
    dettaglio: { mod: window.TabDettaglio, btn:'tabBtnDettaglio', panel:'panelDettaglio' }
  };

  let attiva = 'live';

  /* ---------- header: riflette sempre la tab attiva ---------- */
  function syncHeader(){
    const st = TABS[attiva].mod.state;
    const pill = $('status'), mode = $('mode');

    pill.className = 'pill';
    if (st.mode === 'live'){
      pill.textContent = 'Sistema attivo';
      mode.textContent = 'live · aggiornamento ogni ' + Math.round(TABS[attiva].mod.pollMs / 60000) + ' min';
    } else if (st.mode === 'connecting'){
      pill.classList.add('demo');
      pill.textContent = 'Collegamento…';
      mode.textContent = 'in collegamento';
    } else {
      pill.classList.add('off');
      pill.textContent = 'Offline';
      mode.textContent = 'webhook non raggiungibile';
    }
    updateAgo();
  }

  function updateAgo(){
    const st = TABS[attiva].mod.state;
    const fresh = $('fresh');
    if (st.lastUpdate == null){
      $('updated').textContent = 'in attesa';
      fresh && fresh.classList.add('stale');
      return;
    }
    const s = Math.round((Date.now() - st.lastUpdate) / 1000);
    $('updated').textContent = s < 3 ? 'aggiornato ora'
                             : s < 60 ? 'aggiornato ' + s + 's fa'
                             : 'aggiornato ' + Math.round(s/60) + 'm fa';
    fresh && fresh.classList.toggle('stale', s > (TABS[attiva].mod.pollMs / 1000) + 45);
  }

  /* ---------- cambio tab ---------- */
  function apri(nome){
    if (!TABS[nome]) nome = 'live';
    attiva = nome;

    for (const k in TABS){
      const t = TABS[k], on = (k === nome);
      $(t.btn).setAttribute('aria-selected', on ? 'true' : 'false');
      $(t.panel).hidden = !on;
      if (on) t.mod.start(); else t.mod.stop();
    }

    if (location.hash !== '#' + nome) history.replaceState(null, '', '#' + nome);
    syncHeader();
  }

  /* ---------- avvio ---------- */
  function init(){
    for (const k in TABS){
      $(TABS[k].btn).addEventListener('click', () => apri(k));
    }

    $('refresh').addEventListener('click', () => {
      const ic = document.querySelector('#refresh .ricon');
      if (ic) ic.classList.add('spinning');
      Promise.resolve(TABS[attiva].mod.refresh()).finally(() => {
        if (ic) setTimeout(() => ic.classList.remove('spinning'), 450);
      });
    });

    $('fs').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    });

    window.TabDettaglio.initGate();

    window.addEventListener('hashchange', () => apri(location.hash.replace('#','')));

    apri(location.hash.replace('#','') || 'live');
    setInterval(updateAgo, 1000);
  }

  return { init, syncHeader, apri };

})();

document.addEventListener('DOMContentLoaded', window.App.init);

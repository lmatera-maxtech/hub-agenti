/* ============================================================
   config.js - UNICO punto da modificare per cambiare gli endpoint.
   Le due tab sono alimentate da due workflow n8n separati.
   ============================================================ */

window.CONFIG = {

  live: {
    // workflow: n8n/dashboard-live-v3.json
    endpoint:  "https://n8n-poc.massimaenergia.it/webhook/dashboard-live-v3",
    pollMs:    180000,   // 3 minuti
    timeoutMs: 10000
  },

  dettaglio: {
    // workflow: n8n/dashboard-marta-dettaglio.json
    endpoint:  "https://n8n-poc.massimaenergia.it/webhook/dashboard-marta-nano",
    pollMs:    300000,   // 5 minuti
    timeoutMs: 15000,
    maxRangeDays: 90,

    /* Accesso alla tab Analisi.
       Qui NON c'e' la password ma la sua impronta SHA-256.
       Password attuale invariata rispetto alla versione in produzione.
       Per cambiarla: U.sha256('nuova-password') nella console e sostituire hash.
       Nota: resta una barriera client-side; per protezione reale usare Cloudflare Access. */
    auth: {
      attiva: true,
      hash:   "5336ed18a973644d3eca9d8d417626402655437913f64f5c94af6031ae0502f2"
    }
  }

};

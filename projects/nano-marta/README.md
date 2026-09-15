# Marta · Dashboard operativa

Dashboard di monitoraggio Marta / Multi-Agent NANO.
Il progetto resta **statico**: HTML, CSS e JavaScript senza build step.

La pagina contiene due tab:

| Tab | Cosa mostra | Workflow n8n |
|---|---|---|
| **Live Ops** | chiamate in corso e KPI live | `n8n/dashboard-live-v3.json` |
| **Analisi** *(password)* | chiamate, trasferimenti, funnel NANO, punti di blocco, errori e trend per range | `n8n/dashboard-marta-dettaglio.json` |

## Struttura

```text
marta-dashboard/
├── index.html
├── assets/
│   ├── css/
│   │   ├── base.css
│   │   ├── tab-live.css
│   │   └── tab-dettaglio.css
│   ├── js/
│   │   ├── config.js
│   │   ├── utils.js
│   │   ├── tab-live.js
│   │   ├── tab-dettaglio.js
│   │   └── app.js
│   └── img/
│       └── logo-maxtech.png
├── n8n/
│   ├── dashboard-live-v3.json
│   └── dashboard-marta-dettaglio.json
└── README.md
```

## Deploy GitHub

Non serve compilare nulla. Porta il contenuto della cartella nel repository e pubblicalo come già avviene oggi.

La tab `Analisi` usa il webhook:

```text
https://n8n-poc.massimaenergia.it/webhook/dashboard-marta-nano
```

La tab `Live Ops` non è stata modificata.

## Protezione tab Analisi

La tab **Analisi** mantiene la protezione client-side già presente in produzione.

Il relativo hash SHA-256 si trova in:

```text
assets/js/config.js
```

Lo sblocco vale per la sessione della scheda (`sessionStorage`). Finché la tab è bloccata, il webhook di analisi **non viene interrogato**.

La protezione è una barriera UI, non autenticazione server-side. Per una protezione reale usare Cloudflare Access o equivalente.

## Endpoint e polling

`assets/js/config.js` è il punto unico per gli endpoint:

```js
window.CONFIG = {
  live: {
    endpoint: ".../webhook/dashboard-live-v3",
    pollMs: 180000,
    timeoutMs: 10000
  },
  dettaglio: {
    endpoint: ".../webhook/dashboard-marta-nano",
    pollMs: 300000,
    timeoutMs: 15000,
    maxRangeDays: 90,
    auth: { ... }
  }
};
```

La tab Analisi si aggiorna ogni **5 minuti** quando è visibile e sbloccata.
La tab nascosta viene fermata, così non genera query inutili.

## Analisi NANO

La nuova tab Analisi è basata esclusivamente sui dati persistiti in **Directus**, tramite n8n.

### Vista giorno

Il giorno selezionato mostra:

- chiamate NANO valide;
- durata media;
- chiamate arrivate a Valentina;
- chiamate arrivate a Marco;
- richieste operatore;
- trasferimenti riusciti;
- lead per operatori occupati;
- altri fallimenti handoff;
- funnel multi-agent;
- punti di blocco;
- errori chiamata e stato pratica.

### Andamento nel tempo

Quick range disponibili:

- ultimi 3 giorni;
- ultimi 7 giorni;
- ultimi 14 giorni;
- ultimi 30 giorni;
- intervallo personalizzato fino a 90 giorni.

Grafico, tabella, KPI del periodo e blocchi principali usano sempre lo **stesso range**.

### Mobile

La tab Analisi è ottimizzata anche per smartphone:

- KPI a due colonne;
- navigazione interna sticky;
- quick range scrollabili;
- grafico scrollabile orizzontalmente;
- tooltip compatibile con tap;
- tabella sostituita da card giornaliere su mobile;
- touch target più grandi.

## Definizioni principali

### Richiesta operatore

Una conversazione conta come richiesta operatore quando la relativa pratica in `calls` ha `handoff_id` valorizzato.

### Trasferito

Da `evaluation_conversation_log`:

```text
criteria_id = marco_trasferimento_umano_eseguito
result = success
```

La dashboard richiede anche che sia presente la richiesta handoff della conversazione.

### Lead · operatori occupati

```text
criteria_id = marco_trasferimento_umano_eseguito
result = failure
result_explanation contiene "occupat" (case-insensitive)
```

con richiesta handoff presente.

### Altri fallimenti handoff

Evaluation `failure` con richiesta handoff presente ma senza il pattern `occupat` nella spiegazione.

## Sorgenti Directus

Il workflow di analisi usa principalmente:

- `call_log_details`
- relazione `evaluation_logs` / `evaluation_conversation_log`
- `calls`

Non modifica lo schema Directus e non richiede nuovi campi DB.

Per il filtro temporale viene usato `call_log_details.date_created`, quindi il significato è **giorno di registrazione in Directus**.

## Workflow n8n Analisi

Il workflow `n8n/dashboard-marta-dettaglio.json` espone:

```text
GET /webhook/dashboard-marta-nano
```

Parametri supportati:

```text
date=YYYY-MM-DD
trend_days=3|7|14|30
```

oppure:

```text
date=YYYY-MM-DD
range_from=YYYY-MM-DD
range_to=YYYY-MM-DD
```

Il range massimo è 90 giorni.

Lato performance il workflow esegue, per ogni refresh:

1. una query `call_log_details` per la finestra necessaria;
2. una query `calls` limitata ai `conversation_id` coinvolti;
3. tutte le aggregazioni giorno/range nel Code node n8n.

Non esegue una query separata per ogni giorno.

## Prima del rilascio

1. Importare/aggiornare `n8n/dashboard-marta-dettaglio.json` in n8n.
2. Verificare `DIRECTUS_ENDPOINT` e `DIRECTUS_TOKEN`.
3. Verificare che il workflow con path `dashboard-marta-nano` sia attivo una sola volta.
4. Testare il webhook con `?date=YYYY-MM-DD&trend_days=7`.
5. Pubblicare la cartella sul repository GitHub.
6. Aprire `#dettaglio`, inserire la password e verificare desktop + mobile.

## CORS

Il nodo `Respond to Webhook` del workflow Analisi restituisce:

```text
Access-Control-Allow-Origin: *
Cache-Control: no-store
Content-Type: application/json; charset=utf-8
```

necessari per il frontend statico.

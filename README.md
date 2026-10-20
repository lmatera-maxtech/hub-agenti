# MaxTech AI Operations Hub

Portale statico centrale per i progetti AI MaxTech. La root contiene l'AI Operations Hub; le dashboard operative esistenti di NANO Marta e Angela sono incluse come progetti autonomi e mantengono le loro logiche dati.

## Struttura

```text
/
  index.html
  assets/
    css/hub.css
    css/maxtech-shell.css
    js/hub.js
    js/maxtech-shell.js
  projects/
    nano-marta/
    angela/
  README.md
  .gitignore
```

## Routing

- Home: `/`
- NANO Marta monitoraggio: `/projects/nano-marta/#live`
- NANO Marta analisi: `/projects/nano-marta/#dettaglio`
- Angela monitoraggio: `/projects/angela/#monitoraggio`
- Angela analisi: `/projects/angela/#analisi`

## Backend / n8n

I workflow n8n presenti nei due progetti sono copiati dal pacchetto sorgente senza modifiche. L'Hub modifica esclusivamente il frontend e la navigazione.

## Deploy GitHub / Cloudflare Pages

Pubblicare la root del repository. Il progetto non richiede build: e' HTML/CSS/JavaScript statico.

## Sicurezza

Il file `.env` presente nel pacchetto sorgente NON viene incluso nel repository. Conservare secret e token fuori da GitHub. Le sezioni Analisi usano la password frontend comune `maxtech`; il gate resta client-side e non rappresenta autenticazione server-side.


## Accesso Analisi

Le tab **Analisi** di NANO Marta e Angela utilizzano la stessa password UX client-side: `maxtech`.
La protezione resta un gate frontend e non sostituisce autenticazione server-side.

## UI consistency v1.1

- Gate password identico tra i due progetti (struttura, copy, campi, CTA, error state e mobile).
- Footer NANO Marta alleggerito e separato dai KPI con maggiore spazio verticale.
- Background progetto reso continuo per eliminare stacchi/bande visive vicino al fondo pagina.
- Workflow n8n lasciati invariati rispetto ai progetti live sorgente.

## Patch v1.2 — Analisi Angela
Corretto il gate password della tab Analisi di Angela: dopo lo sblocco il pannello password viene ora rimosso correttamente e resta visibile solo il contenuto Analisi. Nessun workflow n8n o calcolo dati è stato modificato.

## Tag conversazione ElevenLabs (v1.3)

Le tab **Analisi** di NANO Marta e Angela hanno in fondo un box con il **grafico a torta dei tag** delle conversazioni ElevenLabs del range selezionato. Cliccando un tag nella legenda lo si esclude e le percentuali si ricalcolano sui soli tag ancora selezionati; la selezione sopravvive ai refresh automatici.

Componente condiviso dai due progetti:

```text
assets/css/tag-pie.css
assets/js/tag-pie.js      →  MaxTechTagPie.render(elemento, data.tags)
```

Entrambi i workflow n8n di Analisi sono stati estesi con la stessa catena di 7 nodi, che aggiunge alla risposta solo la chiave `tags`:

```text
Tag Catalogo Candidati → Tag Catalogo Aggiornare? → [Tag Catalogo ElevenLabs] → Tag Catalogo Mappa
  → Tag Finestra → Tag Lista ElevenLabs → Tag Aggrega
```

```json
{ "tags": { "available": true, "items": [{"tag":"...","count":12}],
            "untagged": 4, "conversations_total": 40,
            "conversations_with_tags": 36, "assignments_total": 51, "diag": {} } }
```

È l'unico punto in cui le dashboard leggono fuori da Directus. Serve la credenziale n8n **httpHeaderAuth `ElevenLaps EU - API`** su entrambi i workflow.

### Costo e cache

Il blocco tag è in coda al workflow: i KPI Directus sono già calcolati quando parte, e se ElevenLabs è lento o non risponde il resto della risposta non cambia.

Due cache in `$getWorkflowStaticData('global')` tengono basso il costo per refresh:

| | Cache fredda | A regime |
|---|---|---|
| Catalogo tag | fino a 4 richieste (path da scoprire) | **0** — cache 6h, path memorizzato |
| Lista conversazioni | tutto il range | **1 pagina** — solo ieri e oggi |

Un giorno chiuso non cambia più: i suoi conteggi restano in cache e non viene mai riletto. Oggi e ieri sono sempre riletti, così i tag applicati a posteriori entrano comunque. Risultato: un range di 30 giorni costa quanto uno di 7.

La static data si persiste solo nelle **esecuzioni di produzione** (webhook): lanciando il workflow a mano dall'editor la cache non viene salvata e ogni run sembra freddo.

### Limite di lettura

`Tag Lista ElevenLabs` si ferma a 15 pagine (~1500 conversazioni). Se il range richiede più di così a cache fredda, la risposta è `tags.available=false` con `incomplete:true` invece di percentuali calcolate su dati parziali: meglio nessun grafico che un grafico sbagliato. Ranges molto ampi diventano disponibili man mano che l'uso quotidiano riempie la cache giorno per giorno.

### Come vengono risolti i nomi dei tag

La lista conversazioni ElevenLabs espone **`tag_ids`**, non i nomi. La catena quindi:

1. `Tag Catalogo Candidati` + `Tag Catalogo ElevenLabs` + `Tag Catalogo Mappa` leggono il catalogo dei tag e costruiscono la mappa `tag_id → nome`. Il path del catalogo non è identico su tutte le versioni API, quindi vengono provati più endpoint in parallelo (`/v1/convai/conversations/tags`, `/v1/convai/tags`, `/v1/convai/conversation-tags`, `/v1/convai/workspace/tags`): i 404 sono attesi, vince il primo che risponde. Quando sai qual è quello giusto, lascia solo quello nel nodo `Tag Catalogo Candidati`.
2. `Tag Prepara` raccoglie per ogni conversazione sia eventuali nomi (`tags`, `labels`) sia gli id (`tag_ids`).
3. `Tag Aggrega` risolve gli id con il catalogo. Un id non presente in catalogo resta visibile come `id:tag_01ab…`, così la distribuzione si vede comunque.

Diagnostica utile nella risposta del webhook:

```text
tags.diag.campi_tag_id     → campo id trovato, es. ["tag_ids"]
tags.diag.catalogo         → endpoint che ha risposto e numero di voci lette
tags.diag.id_non_risolti   → id presenti sulle conversazioni ma non nel catalogo
tags.diag.chiavi_lista     → chiavi restituite dalla lista conversazioni
```

Se `tags.diag.catalogo.voci_catalogo` è 0, nessuno dei candidati è quello giusto: aggiungi il path corretto in `Tag Catalogo Candidati` e i nomi compaiono senza altre modifiche.

## Raccolta dati · NANO Marta (v1.4)

La tab **Analisi** di NANO Marta ha la sezione **Analisi dei campi di raccolta dati**, tra *Andamento nel tempo* e *Tag*. Usa lo stesso range della tab.

- Fonte: tabella Directus `data_collection_log` (`data_collection_id`, `value`, `data_collection_explanation`), letta tramite `call_log_details.data_collection_logs` (agente `agent_2001ktnse3bre338wc0s7zzg2v6c`).
- Solo id **senza prefisso agente** (es. `esito`, `comportamento_cliente`); `marta_*`, `valentina*`, `marco*` esclusi già nel workflow.
- Vista minima: selettore dei campi; per il campo scelto la prima frase della descrizione e la tabella valore → chiamate → % sulle chiamate del periodo, dal più frequente.
- Filtro **"Solo chiamate con esito"**: ricalcola la tabella del campo scelto solo sulle chiamate con quell'esito (usa gli incroci `data_collection.cross[campo].esito` del workflow; non disponibile per campi con più di 40 valori diversi).

Workflow n8n: `projects/nano-marta/n8n/dashboard-marta-dettaglio.json` → **v1.9**. Rispetto alla v1.8 aggiunge in coda 2 nodi, il resto è invariato:

```text
… → Tag Aggrega → Query Data Collection → Data Collection Aggrega → Respond to Webhook
```

La risposta aggiunge solo la chiave `data_collection`. Se la query fallisce la dashboard continua a funzionare e mostra un avviso nella sezione e in *Qualità dati*.
Timeout frontend della tab Analisi portato da 15 a 30 secondi (`assets/js/config.js`).

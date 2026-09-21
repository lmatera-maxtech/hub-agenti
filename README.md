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

Entrambi i workflow n8n di Analisi sono stati estesi con la stessa catena di 5 nodi (`Tag Lista ElevenLabs`, `Tag Prepara`, `Tag Serve Dettaglio?`, `Tag Dettaglio Conversazione`, `Tag Aggrega`), che aggiunge alla risposta solo la chiave `tags`:

```json
{ "tags": { "available": true, "items": [{"tag":"...","count":12}],
            "untagged": 4, "conversations_total": 40,
            "conversations_with_tags": 36, "assignments_total": 51, "diag": {} } }
```

È l'unico punto in cui le dashboard leggono fuori da Directus. Serve la credenziale n8n **httpHeaderAuth `ElevenLaps EU - API`** su entrambi i workflow.

### Da verificare al primo import

ElevenLabs non espone i tag sempre nello stesso campo. I nodi cercano qualsiasi chiave `tags`/`labels`/`conversation_tags` nella risposta, prima sulla lista conversazioni e — solo se la lista non ne porta nessuno e le conversazioni nel range sono meno di 120 — sul dettaglio della singola conversazione. Dopo il primo run controllare nella risposta del webhook:

```text
tags.diag.campi_tag        → il campo effettivamente trovato (es. ["tags"])
tags.diag.chiavi_lista     → le chiavi che la lista ElevenLabs restituisce
tags.diag.chiavi_dettaglio → le chiavi del dettaglio conversazione
```

Se `campi_tag` è vuoto ma `chiavi_lista`/`chiavi_dettaglio` mostrano un campo con altro nome, basta aggiungerlo alla regex `CHIAVI_TAG` nei nodi `Tag Prepara` e `Tag Aggrega`.

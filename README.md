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

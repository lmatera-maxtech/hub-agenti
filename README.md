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

Il file `.env` presente nel pacchetto sorgente NON viene incluso nel repository. Conservare secret e token fuori da GitHub. Le password frontend delle sezioni Analisi restano quelle gia configurate nei rispettivi progetti e non rappresentano autenticazione server-side.

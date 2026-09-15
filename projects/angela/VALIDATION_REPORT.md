# Validation Report — Reviewed V2

## Controlli eseguiti sul pacchetto
- JSON n8n parsabili;
- sintassi JavaScript frontend valida;
- sintassi di tutti i Code node n8n valida;
- grafo n8n senza riferimenti a nodi mancanti;
- nessun ID HTML duplicato e nessun ID richiesto dal JS mancante;
- endpoint frontend coerenti con i path webhook n8n;
- nessuna API key/JWT copiata nel pacchetto;
- test sintetici su produzione/test/ambiente ignoto, funnel, percentuali e fail-closed superati;
- funnel verificato monotono e drop coerenti.

## Correzioni rispetto alla V1
Vedi `REVIEW_V1.md`. In particolare: filtro produzione, esclusione catalogo contaminabile da test, dataset integrity count, fail-closed su DB, semantica purpose corretta, distribuzioni complete, timezone frontend Europe/Rome e gestione stale range.

## Cosa NON è stato possibile validare dagli allegati
1. valore reale di `mt_call_attempts.start_time` nel Directus live rispetto all'epoch ElevenLabs;
2. contenuto delle Data Table n8n che pesano spam/purpose/service;
3. accuratezza reale del classificatore rispetto a una ground truth umana;
4. permessi effettivi del token Directus che verrà usato in produzione.

Di conseguenza il pacchetto è tecnicamente validato come **PRE-RELEASE**, ma non va presentato come “dati certificati al 100%” finché il check timestamp e una riconciliazione live su un giorno campione non sono completati.

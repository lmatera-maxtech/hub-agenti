# Angela Dashboard · MaxTech · Reviewed V2 PRE-RELEASE

Questa versione deriva dalla revisione completa della V1 ed è progettata per non mostrare numeri parziali o mescolare test e produzione.

## Importante prima del go-live
Leggere `REVIEW_V1.md`. Rimane **un check tecnico bloccante**: verificare che `mt_call_attempts.start_time` sia realmente UTC e non ora locale etichettata con `Z`. Inoltre i KPI con badge ANALISI riportano la decisione del classificatore, non una ground truth: per usarli come misura di accuratezza reale serve un campione umano. Finché il timestamp non è verificato, non definire la dashboard “boss-ready”.

## Runtime
Browser → webhook n8n → Directus → aggregazione n8n → JSON → frontend. Nessuna API ElevenLabs/runtime execution dal browser.

## Perimetro manageriale
Solo `mt_call_attempts.test_mode=false`. Test e record senza ambiente certificabile sono esclusi e mostrati nella qualità dati. `mt_phone_catalog` non è usato per KPI produzione perché dagli export non è segmentabile in modo certificato fra test e produzione.

## Setup
1. Importare `n8n/dashboard-monitoraggio.json` e `n8n/dashboard-analisi.json`.
2. Impostare `DIRECTUS_ENDPOINT` e `DIRECTUS_TOKEN` in n8n.
3. Usare un token read-only sulle collection necessarie.
4. Eseguire il check timezone in `REVIEW_V1.md`.
5. Solo dopo attivare i workflow e pubblicare il frontend.

Endpoint: `/webhook/dashboard-angela-monitoraggio` e `/webhook/dashboard-angela-analisi?from=YYYY-MM-DD&to=YYYY-MM-DD`.

La password Analisi resta client-side (`maxtech`) e non è sicurezza server-side.

## Integrità dataset
Gli endpoint confrontano il numero di righe ricevute con un count Directus sullo stesso range. Se non coincide, rispondono errore 503 e non restituiscono KPI.

## Tag conversazione (ElevenLabs) — aggiunta

La tab Analisi ha in fondo il box **Distribuzione dei tag**: grafico a torta dei tag delle conversazioni ElevenLabs con avvio nel range selezionato. È l'**unica eccezione** alla regola "solo Directus" di questa dashboard.

Nel workflow `n8n/dashboard-analisi.json` la catena tag sta **dopo** `Data Valid?` (ramo true) e prima di `Respond OK`:

```text
Data Valid? → Tag Lista ElevenLabs → Tag Prepara → Tag Serve Dettaglio? → (Tag Dettaglio Conversazione) → Tag Aggrega → Respond OK
```

- Credenziale header richiesta: `ElevenLaps EU - API` (la stessa dei flussi live).
- Agente letto: `agent_9101kx660zetfe6a1b9t9rgqkhfk`.
- La catena è **non bloccante**: se ElevenLabs non risponde, `tags.available=false` e tutti i KPI Directus restano identici.
- `Tag Aggrega` aggiunge solo la chiave `tags` alla risposta: nessun KPI esistente è stato toccato.

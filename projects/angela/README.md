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

La password Analisi resta client-side (`maxtech-angela`) e non è sicurezza server-side.

## Integrità dataset
Gli endpoint confrontano il numero di righe ricevute con un count Directus sullo stesso range. Se non coincide, rispondono errore 503 e non restituiscono KPI.

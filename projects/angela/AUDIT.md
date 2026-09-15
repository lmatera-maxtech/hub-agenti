# Audit — Angela Screening / MaxTech — Reviewed V2

## Perimetro dimostrato
Gli allegati mostrano un agente ElevenLabs single-agent `[SINGLE-AGENT][MASSIMA_TRANQUILLITA][ANGELA]` (`agent_9101kx660zetfe6a1b9t9rgqkhfk`), senza sub-agent e senza custom tool IDs. I system tool presenti sono `end_call` e `voicemail_detection`.

## Pipeline attiva dimostrata
- `Pipeline 1: Lead Intake & Outbound Call Trigger` (`yM5XK6ZCY0CUB4bX`): crea/riaccoda il numero e crea `mt_call_attempts` con `call_status=pending_call` e `test_mode` derivato da `executionMode`.
- `Spam Analysis System - Cron Schedule` (`rolu2TMbfqAv0w3l`): seleziona pending, porta catalogo/tentativo in processing e lancia ElevenLabs.
- `Spam Analysis System - Heuristics Engine` (`lo1oNTKl5SnrNznI`): riceve post-call/failure, aggiorna il tentativo, rilegge i tentativi del numero e aggiorna `mt_phone_catalog`.
- `Dashboard Live - Angela Screening` (`XKOFUklfZ1pIsKbG`): reference esistente DB-only.

## Fonti DB usabili con certezza
`mt_call_attempts` è la fonte storica. Per la dashboard manageriale V2 vengono inclusi solo record con `test_mode=false`. `test_mode=true` è test; null/altro è ambiente non certificabile e viene escluso.

`mt_phone_catalog` è stato corrente mutabile, ma il workflow di ricalcolo legge tutti i tentativi per `phone_catalog_id` senza filtro `test_mode`. Dagli allegati non è dimostrato un campo ambiente sul catalogo. Per questo la V2 **non usa KPI di catalogo come KPI produzione**.

## Semantica temporale
`start_time` è valorizzato nel post-call/failure, non quando il record viene creato pending né quando passa processing. Il volume di periodo significa quindi “record di chiamata con start_time persistito nel range”. Non è certificabile come numero totale di trigger/accodamenti.

## Dati tecnici vs analisi
A: `call_status`, `twilio_call_sid`, `elevenlabs_conversation_id`, `call_duration_seconds`, `start_time`, `test_mode`.
B: `respondent_type`, `purpose`, `service_category`, `verdict`, `spam_probability`, `spam_indicators`, `detected_entity`. Il `spam_probability` persistito è ulteriormente modificato dall’heuristics engine.
C: campi di `mt_phone_catalog` (stato corrente).

## Limiti non risolvibili dal solo export
1. timezone reale dell’istanza/workflow n8n che genera `start_time`;
2. separazione prod/test del catalogo corrente;
3. storico del `final_verdict` catalogo;
4. errori n8n globali se non persistiti nel DB;
5. cause reali dei drop.

## Qualità semantica a monte
Il reporting distingue i campi analitici dai dati tecnici, ma la correttezza **business** delle classificazioni non è dimostrabile dagli export. Il verdict usa pesi letti da Data Table n8n non esportate; inoltre `service_category` ha una descrizione non perfettamente coerente con il relativo enum. Di conseguenza “verdict=spam” significa **classificato spam dal sistema**, non spam verificato da ground truth.

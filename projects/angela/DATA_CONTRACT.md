# Data Contract — Angela Dashboard Reviewed V2

## Regola di perimetro
I KPI manageriali usano **solo** `mt_call_attempts.test_mode === false`. I record `test_mode=true` sono esclusi. I record senza ambiente certificabile sono esclusi e conteggiati nella Qualità dati.

| KPI | Formula | Denominatore | Fonte | Classe | Nota |
|---|---|---|---|---|---|
| Chiamate registrate | record prod con `start_time` nel range | — | `mt_call_attempts` | A | non equivale a tutti i trigger/pending |
| Conversazioni completed | `call_status=completed` | chiamate registrate | `call_status` | A | post-call trascritto/processato |
| Completion rate | completed / registrate | registrate | come sopra | A | include nel denominatore gli esiti tecnici terminali con start_time |
| Durata media | media durata >0 sui completed | completed con durata >0 | `call_duration_seconds` | A | N/D senza valori validi |
| Classificati spam dal sistema | `verdict=spam` / completed | completed | `verdict` | B | decisione della pipeline, **non ground truth** sullo spam reale |
| Respondent determinato | respondent in human/ivr/ai_voice/voicemail | completed | `respondent_type` | B | unknown è fallback/mancante |
| Purpose analysis disponibile | purpose diverso da unknown/unkown/vuoto | completed | `purpose` | B | `none` e `unidentifiable` sono outcome validi dell’analisi |
| Finalità determinata | purpose in commercial/support/private/reception dopo respondent valido | step precedente | `purpose` | B | esclude none/unidentifiable |
| Categoria/settore determinata | service diverso da unknown/unkown/none dopo finalità determinata | step precedente | `service_category` | B | classificazione business derivata; non ground truth |

## Fail-closed
Ogni endpoint esegue anche un count sullo stesso range. Se il numero di righe ricevute non coincide con il count, restituisce errore e **non calcola KPI**. Anche una risposta DB non valida genera errore: non viene trasformata in zero.

## Non usato come KPI produzione
`mt_phone_catalog`: la pipeline lo aggiorna aggregando tutti i tentativi dello stesso numero senza filtro test_mode dimostrato. È quindi una fotografia all-environment e non viene mostrato come KPI manageriale produzione.

## Timestamp
Il range usa `mt_call_attempts.start_time`. Prima del go-live va verificata la corretta semantica UTC del campo come descritto in `REVIEW_V1.md`.

## Accuratezza della classificazione vs accuratezza della dashboard
La dashboard può certificare il conteggio dei **verdict persistiti**, ma non la verità esterna del verdict. Il punteggio viene corretto usando Data Table n8n (`dim_indicator_mt`, `dim_call_purpose_mt`, `dim_service_category_mt`) i cui contenuti non sono inclusi nell’export analizzato. Per validare la qualità reale di spam/purpose/settore serve un campione umano etichettato e una confusion matrix.

La configurazione ElevenLabs di `service_category` presenta inoltre una discrepanza fra descrizione testuale ed enum ammesso (ad esempio nomenclature differenti per debt collection e una categoria descritta ma non presente nell’enum). La dashboard espone il valore persistito senza correggerlo arbitrariamente.

# Review completa della V1 — esito

## Verdetto
La V1 **non va usata come dashboard manageriale** senza correzioni. La struttura generale era corretta, ma sono emersi problemi che possono alterare o rendere ambigua la lettura dei KPI. La V2 inclusa in questo pacchetto corregge ciò che è correggibile dal solo DB/export e adotta una logica fail-closed.

## Problemi trovati nella V1
1. **Test e produzione mescolati**: `mt_call_attempts.test_mode` esiste ma non veniva usato. V2 include nei KPI solo `test_mode=false`, mostra quanti test esclude e scarta i record con ambiente non certificabile.
2. **Catalogo non segmentabile prod/test**: `mt_phone_catalog` viene ricalcolato usando tutti i tentativi dello stesso numero e non ha un `test_mode` dimostrato dagli allegati. I KPI di catalogo sono stati rimossi dalla vista manageriale V2.
3. **`start_time` non è il momento di accodamento/trigger**: viene scritto dal post-call/Twilio. V2 rinomina il primo volume in “chiamate con start_time registrato / chiamate registrate”, non “tentativi avviati”.
4. **Possibile truncation silenziosa**: V1 usava limiti 5.000/20.000. V2 esegue anche un count e, se le righe ricevute non coincidono, fallisce senza calcolare KPI.
5. **DB error trasformabile in zero**: V1 poteva trattare una risposta DB non valida come array vuoto. V2 restituisce `ok:false`/503 e non mostra valori parziali.
6. **Verdetto `unreachable` del catalogo aggregato come “Non deciso”**: il donut V1 accorpava ogni valore diverso da spam/no_spam. La V2 usa il verdict dei soli tentativi completed e non mostra il catalogo.
7. **Qualità dati semanticamente errata**: `purpose=unidentifiable` e `purpose=none` sono outcome validi dell’analisi, non “evaluation mancante”. V2 separa “analysis mancante” da “finalità non determinata”.
8. **`spam_probability` mancante indistinguibile da 0**: la pipeline fa fallback a `0.0`, che è anche un valore valido. La relativa coverage è stata rimossa.
9. **Distribuzioni Purpose/Service parziali**: V1 nascondeva `none`/`unidentifiable` e poi ricalcolava le percentuali solo sul sottoinsieme rimasto. V2 mostra tutti gli outcome sui completed.
10. **Date quick filter frontend**: V1 derivava la data con `toISOString()`, che può slittare di un giorno rispetto a Europe/Rome nelle ore dopo mezzanotte. V2 calcola esplicitamente la data Europe/Rome.
11. **Stale data su range fallito**: V1 poteva lasciare dati del range precedente mentre i filtri mostravano il nuovo range. V2 avvisa esplicitamente quale range appartiene ai dati visibili.

## Blocchi residui prima del go-live
**1. Timestamp / timezone.** Non posso certificare al 100% i confini giornalieri finché non viene verificata la timezone effettiva del runtime che genera `mt_call_attempts.start_time`. Il workflow sorgente usa `DateTime.fromSeconds(...).toFormat(...) + 'Z'` senza una conversione UTC esplicita prima di aggiungere `Z`; la correttezza del suffisso dipende quindi dalla timezone runtime.

Usare il sample pin presente nell’export: `start_time_unix_secs=1789050895` corrisponde a **2026-09-10 14:34:55 UTC / 16:34:55 Europe/Rome**. Verificare in Directus il relativo `mt_call_attempts.start_time`:
- se è `2026-09-10T14:34:55...Z`, la semantica UTC è coerente;
- se è `2026-09-10T16:34:55...Z`, il dato è etichettato UTC ma contiene ora locale e il bucketing giornaliero va corretto alla fonte.

**2. Accuratezza business delle classificazioni.** Le Data Table `dim_indicator_mt`, `dim_call_purpose_mt` e `dim_service_category_mt` influenzano il punteggio/verdict ma i loro contenuti non sono inclusi nell’export. Inoltre `service_category` ha una discrepanza fra descrizione ed enum. La dashboard può certificare il conteggio dei verdict persistiti, non che tali verdict rappresentino al 100% la realtà. Prima di usare lo spam rate come KPI decisionale è consigliato un campione umano etichettato.

Fino al check timestamp la V2 è **PRE-RELEASE**, non “boss-ready”. Per trattare le metriche ANALISI come qualità reale del classificatore, serve anche una validazione su ground truth.

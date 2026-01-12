# CURSOR CODE FIX

**Ziel:** Alle Codes/URLs richtig → Workflow grün

## AUFGABE:

1. Scanne GESAMTEN Workflow (alle Nodes)
2. Finde ALLE Issues:
   - Falsche Node-Referenzen (z.B. Shop Configuration2)
   - Falsche URLs (z.B. workflow_status statt workflow_runs)
   - Fehlerhafte Expressions
3. POST komplette Liste zu cursor-status-live.json
4. Für JEDES Issue:
   - POST Details zu Claude
   - WARTE auf "Lena - Fix approved"
   - Apply Fix
   - Test Node einzeln
   - POST Result (GRÜN/ROT)

## WICHTIG:

- Error-Handler NICHT anfassen (schon da!)
- NUR Codes/URLs korrigieren
- Jeden Node einzeln testen
- Nach jedem Fix Status posten

## START:

Lena - Korrigiere alle Codes!

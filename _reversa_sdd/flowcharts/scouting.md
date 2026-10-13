# Fluxo — `scouting`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  C[contexto] --> CA[carregar do localStorage] --> L[on value scouting após login]
  L --> RE[nuvem substitui lista local]
  ED[edição] --> SL[salvar: localStorage] --> AG[agendar 600 ms]
  AG --> SU[subirTudo: só goleiros cujo JSON mudou] --> UP[update scouting]
  UP -- erro --> RS[zera _enviado: reenvia tudo depois]
```

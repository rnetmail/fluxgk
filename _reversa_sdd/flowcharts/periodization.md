# Fluxo — `periodization`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  C[contexto] --> L[on value periodization] --> B{primeira vez?}
  B -- sim --> UI[bootUI] 
  B -- não --> R[renderAll]
  ED[editar macro/meso/micro/evento/tema] --> S[save: set documento inteiro]
```

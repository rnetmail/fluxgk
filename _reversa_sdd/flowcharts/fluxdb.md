# Fluxo — `fluxdb`

> ⚠️ Este fluxograma é da **fluxdb 1.0** (extração de 13/10). A 1.1 (`e1dc8c7`) lê de uma cópia local e não relê pela
> rede; o fluxo atual está em `../adaptador-fluxdb/design.md`.

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  W["set(P, v)"] --> R1[GET nós ancestrais, exato e descendentes]
  R1 --> D[DELETE cada descendente]
  D --> Q{ancestral e sem nó exato?}
  Q -- sim --> U1[UPDATE JSON inteiro do ancestral]
  Q -- não --> Z{v é null?}
  Z -- sim --> DEL[DELETE nó exato]
  Z -- não --> CU[CREATE ou UPDATE nó exato]
  U1 --> N[notify P local]
  DEL --> N
  CU --> N
  N --> RL[relê cada listener relacionado: GET]
  CU -.SSE do PocketBase.-> N2[notify P de novo] --> RL2[relê de novo: GET]
```

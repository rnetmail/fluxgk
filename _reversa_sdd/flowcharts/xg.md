# Fluxo — `xg`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  CL[clique no mapa nx, ny] --> T{tipo}
  T -- pênalti --> P1[0,76 com goleiro / 0,95 sem]
  T -- tiro 10 m --> P2[0,65 com goleiro / 0,88 sem]
  T -- outro --> RAW[xgRaw: distância × ângulo × corpo × tipo × assistência × pressão × goleiro × defensores]
  RAW --> CLP[limita entre 0,01 e 0,97]
  SV[salvar] --> SG[setGames: set xg/games com TODOS os jogos]
  CFG[salvar configurações] --> LS[localStorage] --> FS[FB.set inexistente: TypeError engolido]
```

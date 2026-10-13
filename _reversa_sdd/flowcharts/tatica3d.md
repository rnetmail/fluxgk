# Fluxo — `tatica3d`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  PL[planner abre tatica3d.html?embed=1 num iframe] --> SC[monta cena three.js: quadra, gols, arquibancada]
  SC --> GL[carrega goleiro/jogador/adversario.glb]
  ED[usuário posiciona e desenha] --> EN[devolve a cena ao planner] --> EX[vira exercício.tatica]
```

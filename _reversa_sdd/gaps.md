# Lacunas — FluxGK

> Reviewer, 13/10/2026. Lacunas que continuaram sem resposta depois das 21 perguntas (todas respondidas).
> Defeitos confirmados no código não estão aqui: estão nas tarefas de cada unit e resumidos em `confidence-report.md`.

| # | Lacuna | Onde | Por que continua aberta | Próximo passo |
|---|---|---|---|---|
| G-01 | Volume real de uma conta (registros, MB por temporada) | `adaptador-fluxdb/`, `video/`, `xg/`, `tatica-3d/` (D-07) | ninguém mediu | medir na base de PRD (contagem de `nodes` e tamanho de `data` por dono) |
| G-02 | Quem consome primeiro a API pública e o MCP | `infraestrutura/` T-21 (D-05, D-31) | depende de plano de produto | o dono indica o primeiro consumidor |
| G-03 | Lista vazia na nuvem da Estatística: "esvaziada" × "nunca configurada" | `estatistica/` | não entrou nas perguntas | decidir junto com a correção de adversários (D-17) |
| G-04 | Pagamento, códigos de ativação e planos | `infraestrutura/` T-22 (D-09) | **desenhada e implementada** na feature 001 (em HML, 14/10); falta só o ponta a ponta com o provedor real | T033 da feature: o dono configura Stripe ou Mercado Pago e o Google na tela do Admin |

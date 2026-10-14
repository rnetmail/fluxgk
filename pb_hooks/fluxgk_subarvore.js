/// FluxGK · apagar a subárvore inteira de um clube ou temporada pelo servidor (feature 001, T035).
///
/// O adaptador fluxdb apaga só os nós que enxerga, e desde os planos as regras escondem os nós de módulo fora do
/// plano. Sem isto, excluir um clube (RN-05) deixaria esses nós órfãos. Só aceita os caminhos do próprio técnico:
/// users/<eu>/data/<clube> ou users/<eu>/data/<clube>/<temporada>.

const PADRAO = /^users\/([A-Za-z0-9_]{1,64})\/data\/[A-Za-z0-9_-]{1,128}(\/[A-Za-z0-9_-]{1,128})?$/;

/** Apaga o nó exato e os descendentes do dono. Devolve quantos nós apagou; lança Error em caminho inválido. */
function apagar(app, donoId, caminho) {
  const p = String(caminho || '').replace(/^\/+|\/+$/g, '');
  const m = PADRAO.exec(p);
  if (!m || m[1] !== donoId) throw new Error('caminho_invalido');
  const nos = app.findRecordsByFilter('nodes', 'owner = {:o} && (path = {:p} || path ~ {:d})', '', 0, 0,
    { o: donoId, p: p, d: p + '/%' });
  let n = 0;
  app.runInTransaction(function (tx) {
    nos.forEach(function (r) {
      const atual = r.getString('path');
      if (atual === p || atual.indexOf(p + '/') === 0) { tx.delete(r); n++; }   /* confere o prefixo de verdade */
    });
  });
  return n;
}

module.exports = { apagar: apagar };

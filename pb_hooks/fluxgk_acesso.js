/// FluxGK · acesso por plano (feature 001, pagamento e planos).
///
/// Fonte ÚNICA de três tabelas que mais ninguém repete:
///   PLANOS    plano → módulos liberados (RN-P02: fixos, o técnico não escolhe)
///   PREFIXOS  módulo → padrões LIKE do caminho dos seus nós na árvore (`nodes.path`)
///   MODULOS   a lista de chaves válidas (as do hub, `MODS` em index.html, + `inteligencia`)
///
/// As regras da coleção `nodes` (migration 1760500000_planos.js) são GERADAS a partir de PREFIXOS por
/// `regraNodes()`, e o teste tools/test-planos-regras.mjs confere cada linha. Caminho de módulo novo que não
/// entrar aqui fica fora do bloqueio por plano (risco R-06 do roadmap).
///
/// Admin (D-21): `role = 'admin'` na conta, OU e-mail em FLUXGK_ADMINS (transição), OU superusuário.

const MODULOS = ['planner', 'period', 'xg', 'stats', 'minutes', 'video', 'data', 'profile', 'scouting', 'inteligencia'];
const NOVE = ['planner', 'period', 'xg', 'stats', 'minutes', 'video', 'data', 'profile', 'scouting'];

const PLANOS = {
  basic: ['data', 'planner'],
  intermediate: ['data', 'planner', 'period', 'profile', 'minutes'],
  advanced: NOVE.slice(),
  pro: NOVE.concat(['inteligencia']),
};

/* Caminhos de `_reversa_sdd/data-dictionary.md`. `%` é o curinga do LIKE do SQLite.
   Por temporada: users/<uid>/data/<clube>/<temporada>/<módulo>…  ·  globais: users/<uid>/<coisa>… */
const PREFIXOS = {
  planner: ['users/%/data/%/%/planner%', 'users/%/library/exercises%'],
  period: ['users/%/data/%/%/periodization%'],
  xg: ['users/%/data/%/%/xg%', 'users/%/xg-misc%'],
  stats: ['users/%/data/%/%/stats%'],
  minutes: ['users/%/data/%/%/minutes%'],
  data: ['users/%/data/%/%/load%'],
  profile: ['users/%/data/%/%/profile%', 'users/%/library/gkCriteria%'],
  scouting: ['users/%/scouting%'],
  video: ['users/%/data/%/%/video%'],
};

/** Data que vale como "sem vencimento" (contas legadas e cortesias sem prazo). */
const SEM_VENCIMENTO = '9999-12-31 00:00:00.000Z';

function modulosDoPlano(plano) {
  const m = PLANOS[String(plano || '')];
  return m ? m.slice() : [];
}

/** Regra de list/view/create/update da coleção `nodes`: dono + cada prefixo de módulo exige o módulo no plano.
 *  `modulos ~ '"xg"'` e não `modulos ?= 'xg'`: no PocketBase 0.40 o `?=` sobre um select múltiplo de
 *  `@request.auth` nunca casa (provado em tools/test-planos-regras.mjs). O `~` compara o JSON do campo
 *  (`["data","xg"]`), e as aspas fazem casar o nome inteiro (`"x"` não casa com `"xg"`). */
function regraNodes() {
  const partes = ['owner = @request.auth.id'];
  Object.keys(PREFIXOS).forEach(function (m) {
    const libera = "(@request.auth.modulos ~ '\"" + m + "\"' && @request.auth.acessoAte > @now)";
    PREFIXOS[m].forEach(function (p) {
      partes.push("(path !~ '" + p + "' || " + libera + ')');
    });
  });
  return partes.join(' && ');
}

/** Campos da conta que só o servidor grava (o cliente não pode enviá-los, D-09). */
const CAMPOS_PROTEGIDOS = ['plano', 'modulos', 'acessoAte', 'origemPlano', 'role', 'testeUsado',
  'assinaturaId', 'clientePagamentoId', 'tentativasCodigo', 'tentativasDesde', 'termosVersao', 'termosAceitosEm'];

function semCamposProtegidos() {
  return CAMPOS_PROTEGIDOS.map(function (c) { return '@request.body.' + c + ':isset = false'; }).join(' && ');
}

/** A conta tem acesso agora a este módulo? (`conta` é um core.Record de `users`) */
function liberado(conta, modulo) {
  if (!conta) return false;
  const mods = conta.get('modulos') || [];
  let tem = false;
  for (let i = 0; i < mods.length; i++) if (String(mods[i]) === modulo) tem = true;
  return tem && acessoValido(conta);
}

function acessoValido(conta) {
  if (!conta) return false;
  const ate = conta.getDateTime('acessoAte');
  if (!ate || ate.isZero()) return false;
  return ate.unix() > Math.floor(Date.now() / 1000);
}

function admins() {
  return String($os.getenv('FLUXGK_ADMINS') || '')
    .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}

/** Admin = superusuário do PocketBase, conta com role 'admin', ou e-mail em FLUXGK_ADMINS. */
function ehAdmin(e) {
  if (e.hasSuperuserAuth && e.hasSuperuserAuth()) return true;
  const a = e.auth;
  if (!a) return false;
  try { if (a.getString('role') === 'admin') return true; } catch (_) { /* coleção sem o campo */ }
  let email = '';
  try { email = String(a.email() || '').toLowerCase(); } catch (_) { email = String(a.get('email') || '').toLowerCase(); }
  return !!email && admins().indexOf(email) >= 0;
}

/** Data no formato que o PocketBase grava ('AAAA-MM-DD HH:MM:SS.sssZ'). */
function dataPb(ms) { return new Date(ms).toISOString().replace('T', ' '); }

/** Grava o plano na conta (só o servidor chama). `ate` em ms, ou SEM_VENCIMENTO. Não salva: quem chama salva. */
function aplicarPlano(conta, plano, ate, origem, extra) {
  conta.set('plano', plano);
  conta.set('modulos', modulosDoPlano(plano));
  conta.set('acessoAte', ate === SEM_VENCIMENTO ? SEM_VENCIMENTO : dataPb(ate));
  conta.set('origemPlano', origem);
  if (extra && extra.assinaturaId) conta.set('assinaturaId', extra.assinaturaId);
  if (extra && extra.clientePagamentoId) conta.set('clientePagamentoId', extra.clientePagamentoId);
}

/** Estende o acesso só para frente (eventos de renovação podem chegar fora de ordem). */
function estenderAte(conta, ateMs) {
  const atual = conta.getDateTime('acessoAte');
  const atualMs = (!atual || atual.isZero()) ? 0 : atual.unix() * 1000;
  if (ateMs > atualMs) conta.set('acessoAte', dataPb(ateMs));
}

module.exports = {
  dataPb: dataPb, aplicarPlano: aplicarPlano, estenderAte: estenderAte,
  MODULOS: MODULOS, PLANOS: PLANOS, PREFIXOS: PREFIXOS, SEM_VENCIMENTO: SEM_VENCIMENTO, CAMPOS_PROTEGIDOS: CAMPOS_PROTEGIDOS,
  modulosDoPlano: modulosDoPlano, regraNodes: regraNodes, semCamposProtegidos: semCamposProtegidos,
  liberado: liberado, acessoValido: acessoValido, admins: admins, ehAdmin: ehAdmin,
};

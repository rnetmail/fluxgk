/// FluxGK · versões: o que está no ar, o que há de novo em HML, o histórico, e o pedido de troca.
///
/// Usado pelas rotas de `versoes.pb.js` (o JSVM do PocketBase isola cada handler, então a lógica
/// mora aqui e é carregada com `require`). O app NUNCA fala com o Portainer: para trocar de versão,
/// pede ao GitHub para rodar o workflow `implantar.yml`, que numera, cria a tag e a release, move
/// `main` e reimplanta PRD pelo webhook. A chave guardada aqui (GH_TOKEN_IMPLANTAR, fine-grained,
/// só este repositório, Actions: write) não alcança nada além disso.
///
/// Variáveis da stack:
///   AMBIENTE            prd | hml — só PRD troca de versão; HML só consulta
///   FLUXGK_ADMINS       e-mails separados por vírgula; superusuário do PocketBase também vale
///   GH_TOKEN_IMPLANTAR  token do GitHub (sem ele: consulta anônima, 60 req/h, e sem botão)
///   FLUXGK_REPO         padrão rnetmail/fluxgk

const REPO_PADRAO = 'rnetmail/fluxgk';
const CACHE_MS = 45 * 1000;

function cfg() {
  const admins = String($os.getenv('FLUXGK_ADMINS') || '')
    .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
  return {
    ambiente: String($os.getenv('AMBIENTE') || 'prd').toLowerCase(),
    admins: admins,
    token: String($os.getenv('GH_TOKEN_IMPLANTAR') || '').trim(),
    repo: String($os.getenv('FLUXGK_REPO') || REPO_PADRAO).trim(),
  };
}

/** Admin = superusuário do PocketBase, ou conta de `users` com e-mail em FLUXGK_ADMINS. */
function ehAdmin(e) {
  if (e.hasSuperuserAuth && e.hasSuperuserAuth()) return true;
  const a = e.auth;
  if (!a) return false;
  let email = '';
  try { email = String(a.email() || '').toLowerCase(); } catch (_) { email = String(a.get('email') || '').toLowerCase(); }
  return !!email && cfg().admins.indexOf(email) >= 0;
}

function quem(e) {
  if (e.auth) {
    try { return String(e.auth.email() || e.auth.id); } catch (_) { return String(e.auth.id); }
  }
  return 'superusuario';
}

function gh(caminho, metodo, corpo) {
  const c = cfg();
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'fluxgk-versoes',
  };
  if (c.token) headers['Authorization'] = 'Bearer ' + c.token;
  if (corpo) headers['Content-Type'] = 'application/json';
  const r = $http.send({
    url: 'https://api.github.com/repos/' + c.repo + caminho,
    method: metodo || 'GET',
    headers: headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
    timeout: 20,
  });
  if (r.statusCode >= 300) {
    const msg = (r.json && r.json.message) ? r.json.message : ('HTTP ' + r.statusCode);
    throw new Error('GitHub ' + caminho + ': ' + msg);
  }
  return r.json;
}

/** Versão no ar: o nginx da mesma stack escreve /versao.json na partida. */
function noAr() {
  try {
    const r = $http.send({ url: 'http://nginx/versao.json', timeout: 5 });
    if (r.statusCode === 200 && r.json) return { versao: r.json.versao || '', build: r.json.build || '' };
  } catch (_) {}
  return { versao: '', build: '' };
}

function ordemVersao(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
  return 0;
}

function proximaVersao(tags, agora) {
  const ano = String(agora.getFullYear());
  let seq = 0;
  tags.forEach(function (t) {
    const p = String(t).split('.');
    if (p.length === 3 && p[0] === '1' && p[1] === ano) seq = Math.max(seq, Number(p[2]) || 0);
  });
  return '1.' + ano + '.' + ('00' + (seq + 1)).slice(-3);
}

function linhaDoCommit(m) { return String(m || '').split('\n')[0]; }

/** Tudo o que a tela precisa, num objeto. Cacheado por 45 s para não gastar a cota do GitHub. */
function painel(forcar) {
  const st = $app.store();
  const cache = st.get('fluxgk_versoes');
  if (!forcar && cache && (Date.now() - cache.em) < CACHE_MS) return cache.dados;

  const c = cfg();
  const releases = gh('/releases?per_page=50') || [];
  const versoes = releases
    .filter(function (r) { return /^1\.\d{4}\.\d{3}$/.test(r.tag_name) && !r.draft; })
    .map(function (r) {
      return { versao: r.tag_name, data: r.published_at || r.created_at, notas: r.body || '', url: r.html_url };
    })
    .sort(function (a, b) { return ordemVersao(b.versao, a.versao); });

  // HML à frente de PRD? (develop × main)
  let nova = null;
  const cmp = gh('/compare/main...develop');
  if (cmp && cmp.ahead_by > 0) {
    const commits = (cmp.commits || []);
    const topo = commits.length ? commits[commits.length - 1] : null;
    const topoMsg = topo ? linhaDoCommit(topo.commit.message) : '';
    const mudancas = commits
      .map(function (x) { return { sha: x.sha.slice(0, 7), msg: linhaDoCommit(x.commit.message), data: x.commit.author && x.commit.author.date }; })
      .filter(function (x) { return x.msg.indexOf('release: ') !== 0; });
    // develop parado numa release (ex.: PRD voltou de versão): oferecer essa versão, não numerar outra
    const existente = /^release: (1\.\d{4}\.\d{3})$/.exec(topoMsg);
    let ci = { verde: false, url: '', estado: 'sem execução' };
    const runs = gh('/actions/workflows/ci.yml/runs?branch=develop&event=push&per_page=5');
    const r0 = runs && runs.workflow_runs && runs.workflow_runs.find(function (r) { return topo && r.head_sha === topo.sha; });
    if (r0) ci = { verde: r0.conclusion === 'success', url: r0.html_url, estado: r0.conclusion || r0.status };
    nova = {
      versao: existente ? existente[1] : proximaVersao(versoes.map(function (v) { return v.versao; }), new Date()),
      existente: !!existente,
      mudancas: mudancas,
      // a release de uma versão que já existe passou pelo CI quando foi criada
      ciVerde: existente ? true : ci.verde,
      ciEstado: existente ? 'versão já publicada' : ci.estado,
      ciUrl: ci.url,
    };
  }

  // histórico de trocas = execuções do workflow `implantar`
  let historico = [];
  let emAndamento = null;
  try {
    const runs = gh('/actions/workflows/implantar.yml/runs?per_page=25');
    historico = ((runs && runs.workflow_runs) || []).map(function (r) {
      return {
        titulo: r.display_title, quando: r.created_at, estado: r.status,
        resultado: r.conclusion || '', url: r.html_url,
      };
    });
    emAndamento = historico.find(function (h) { return h.estado !== 'completed'; }) || null;
  } catch (_) { /* workflow ainda não existe no branch padrão */ }

  const dados = {
    ambiente: c.ambiente,
    repo: c.repo,
    podeTrocar: c.ambiente === 'prd' && !!c.token,
    motivoSemTroca: c.ambiente !== 'prd' ? 'Versões só são trocadas na produção.' : (!c.token ? 'Falta GH_TOKEN_IMPLANTAR na stack de produção.' : ''),
    versoes: versoes, nova: nova, historico: historico, emAndamento: emAndamento,
  };
  st.set('fluxgk_versoes', { em: Date.now(), dados: dados });
  return dados;
}

/** Pede ao GitHub a troca: `nova` (numera o que está em develop) ou `existente` (uma tag já publicada). */
function implantar(e, acao, versao) {
  const c = cfg();
  if (c.ambiente !== 'prd') throw new Error('Versões só são trocadas na produção.');
  if (!c.token) throw new Error('Falta GH_TOKEN_IMPLANTAR na stack de produção.');
  if (acao !== 'nova' && acao !== 'existente') throw new Error('Ação inválida.');
  const p = painel(true);
  if (p.emAndamento) throw new Error('Já há uma troca em andamento: ' + p.emAndamento.titulo);
  if (acao === 'nova') {
    if (!p.nova || p.nova.existente) throw new Error('Não há versão nova em HML.');
    if (!p.nova.ciVerde) throw new Error('O CI de develop não está verde (' + p.nova.ciEstado + ').');
    versao = '';
  } else {
    if (!/^1\.\d{4}\.\d{3}$/.test(String(versao || ''))) throw new Error('Versão inválida.');
    if (!p.versoes.some(function (v) { return v.versao === versao; })) throw new Error('A versão ' + versao + ' não existe.');
    if (noAr().versao === versao) throw new Error('A versão ' + versao + ' já está no ar.');
  }
  gh('/actions/workflows/implantar.yml/dispatches', 'POST', {
    ref: 'main',
    inputs: { acao: acao, versao: versao || '', solicitante: quem(e) },
  });
  $app.store().remove('fluxgk_versoes');
  return { ok: true, acao: acao, versao: acao === 'nova' ? p.nova.versao : versao };
}

module.exports = { cfg: cfg, ehAdmin: ehAdmin, painel: painel, implantar: implantar, noAr: noAr, proximaVersao: proximaVersao };

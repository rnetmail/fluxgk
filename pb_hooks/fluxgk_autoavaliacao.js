/// FluxGK · lógica da autoavaliação do goleiro (usada por autoavaliacao.pb.js).

const ESCALA = ['humor', 'sono', 'alimentacao'];

/** Link ativo pelo código; null se não existe, está revogado ou o código tem formato errado. */
function acharLink(token) {
  const t = String(token || '');
  if (!/^[a-f0-9]{32,64}$/.test(t)) return null;
  try {
    const r = $app.findFirstRecordByFilter('autoavaliacao_links', 'token = {:t} && ativo = true', { t: t });
    return r || null;
  } catch (_) { return null; }
}

/** Data de hoje no fuso da stack (TZ, padrão America/Bahia), AAAA-MM-DD. */
function hoje() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function caminho(link, data) {
  return link.getString('base') + '/load/auto/' + link.getString('playerId') + '/' + data;
}

function validar(b) {
  const r = {};
  for (let i = 0; i < ESCALA.length; i++) {
    const k = ESCALA[i], n = Number(b[k]);
    if (!(n >= 1 && n <= 5 && Math.floor(n) === n)) return { erro: 'Responda ' + k + ' de 1 a 5.' };
    r[k] = n;
  }
  const obs = String(b.obs == null ? '' : b.obs).trim();
  if (obs.length > 500) return { erro: 'A observação passa de 500 caracteres.' };
  if (obs) r.obs = obs;
  return { resposta: r };
}

function acharNo(owner, path) {
  try { return $app.findFirstRecordByFilter('nodes', 'owner = {:o} && path = {:p}', { o: owner, p: path }); }
  catch (_) { return null; }
}

function lerResposta(link, data) {
  const n = acharNo(link.getString('owner'), caminho(link, data));
  if (!n) return null;
  /* campo json chega como bytes brutos (types.JSONRaw): getString devolve o JSON em texto */
  try { const j = JSON.parse(n.getString('data') || 'null'); return j ? j.v : null; }
  catch (_) { return null; }
}

function gravarResposta(link, data, resposta) {
  const owner = link.getString('owner');
  const path = caminho(link, data);
  const valor = Object.assign({ date: data, em: Date.now() }, resposta);
  let rec = acharNo(owner, path);
  if (!rec) {
    rec = new Record($app.findCollectionByNameOrId('nodes'));
    rec.set('owner', owner);
    rec.set('path', path);
  }
  rec.set('data', { v: valor });
  $app.save(rec);
  return valor;
}

module.exports = { acharLink: acharLink, hoje: hoje, validar: validar, lerResposta: lerResposta, gravarResposta: gravarResposta };

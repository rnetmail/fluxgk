/* FluxGK · ajuda comum dos testes contra um PocketBase de verdade.
 *
 * Desde a feature 001 (planos) o cadastro anônimo pela API não existe mais: conta de teste é criada pelo
 * SUPERUSUÁRIO, que também grava os campos de plano (plano, modulos, acessoAte...). Credenciais do superusuário:
 * PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD, com o padrão do CI (ci@ci.local / ci-senha-123456). */
export const MODULOS_PRO = ['planner', 'period', 'xg', 'stats', 'minutes', 'video', 'data', 'profile', 'scouting', 'inteligencia'];
export const SEM_VENCIMENTO = '9999-12-31 00:00:00.000Z';

export function cliente(url) {
  const U = String(url || 'http://127.0.0.1:8090').replace(/\/$/, '');
  async function req(m, p, t, b, extra) {
    const r = await fetch(U + p, {
      method: m,
      headers: { 'content-type': 'application/json', ...(t ? { Authorization: t } : {}), ...(extra || {}) },
      body: b == null ? undefined : (typeof b === 'string' ? b : JSON.stringify(b)),
    });
    let j = null; try { j = await r.json(); } catch {}
    return { s: r.status, j };
  }
  let _su = null;
  async function superusuario() {
    if (_su) return _su;
    const r = await req('POST', '/api/collections/_superusers/auth-with-password', null, {
      identity: process.env.PB_ADMIN_EMAIL || 'ci@ci.local', password: process.env.PB_ADMIN_PASSWORD || 'ci-senha-123456',
    });
    if (r.s !== 200) throw new Error('superusuário não entrou: ' + r.s + ' ' + JSON.stringify(r.j));
    return (_su = r.j.token);
  }
  /** Cria a conta (com os campos de plano dados; padrão = pro sem vencimento) e devolve {t, id, email}. */
  async function conta(email, campos, senhaDada) {
    const senha = senhaDada || 'senha-ci-123456';
    const su = await superusuario();
    const c = await req('POST', '/api/collections/users/records', su, {
      email, password: senha, passwordConfirm: senha,
      plano: 'pro', modulos: MODULOS_PRO, acessoAte: SEM_VENCIMENTO, origemPlano: 'legado', role: 'tecnico',
      ...(campos || {}),
    });
    if (c.s !== 200) throw new Error('conta não criada: ' + c.s + ' ' + JSON.stringify(c.j));
    const r = await req('POST', '/api/collections/users/auth-with-password', null, { identity: email, password: senha });
    if (r.s !== 200) throw new Error('conta não entrou: ' + r.s + ' ' + JSON.stringify(r.j));
    return { t: r.j.token, id: r.j.record.id, email, senha };
  }
  return { U, req, superusuario, conta };
}

export function placar() {
  let n = 0, falhas = 0;
  const ok = (c, nome, det) => {
    n++; if (!c) falhas++;
    console.log(`${c ? 'ok  ' : 'FALHOU'} ${String(n).padStart(3)} · ${nome}${!c && det !== undefined ? ' → ' + (typeof det === 'string' ? det : JSON.stringify(det)) : ''}`);
  };
  const fim = (titulo) => {
    console.log(`\n${titulo}: ${n - falhas}/${n} ok`);
    if (falhas) process.exit(1);
  };
  return { ok, fim };
}

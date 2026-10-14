#!/bin/sh
# FluxGK · migration dos planos (feature 001) sobre um banco com contas ANTIGAS, e a volta de versão.
#
# Repete a esteira num volume descartável:
#   1. a imagem ANTIGA (a que está em PRD) sobe e cria uma conta comum e uma de admin (cadastro aberto);
#   2. a imagem NOVA sobe no mesmo volume e aplica 1760500000_planos.js. Confere: as duas contas viram plano pro,
#      sem vencimento, origem legado; o e-mail de FLUXGK_ADMINS vira role admin; a conta antiga entra com a
#      mesma senha; o login Google liga quando GOOGLE_CLIENT_ID/SECRET existem;
#   3. volta de versão: `migrate down 1` com a imagem nova e a imagem ANTIGA sobe de novo. Confere que o
#      cadastro aberto voltou, as coleções novas sumiram e a conta antiga continua entrando.
# (O entrypoint reaplica as migrations a cada início; por isso cada etapa é um contêiner novo no mesmo volume.)
# Uso: sh tools/test-planos-migracao.sh <imagem nova> <imagem antiga>
set -eu
NOVA="${1:?imagem nova}"
ANTIGA="${2:?imagem antiga}"
P=127.0.0.1:8097
C=pb-migracao
V=pb-migracao-dados
falhas=0
limpa() { docker rm -f "$C" >/dev/null 2>&1 || true; }
trap 'limpa; docker volume rm -f "$V" >/dev/null 2>&1 || true' EXIT
limpa; docker volume rm -f "$V" >/dev/null 2>&1 || true
sobe() {
  limpa
  docker run -d --name "$C" -p "$P:8090" -v "$V:/pb/pb_data" -e FLUXGK_ADMINS=chefe@ci.local \
    -e GOOGLE_CLIENT_ID=id-de-teste.apps.googleusercontent.com -e GOOGLE_CLIENT_SECRET=segredo-de-teste \
    -e PB_ADMIN_EMAIL=ci@ci.local -e PB_ADMIN_PASSWORD=ci-senha-123456 "$1" >/dev/null
  for i in $(seq 40); do curl -sf "http://$P/api/health" >/dev/null && return 0; sleep 1; done
  echo "PocketBase ($1) não subiu"; docker logs "$C" 2>&1 | tail -30; exit 1
}
confere() { if [ "$1" = "$2" ]; then echo "ok   · $3"; else echo "FALHOU · $3 → esperado [$2], veio [$1]"; falhas=$((falhas+1)); fi; }
J() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log($1)}catch(e){console.log('ERRO:'+s.slice(0,200))}})"; }
cadastra() {
  curl -s -o /dev/null -w '%{http_code}' -X POST "http://$P/api/collections/users/records" -H 'content-type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"senha-antiga-123\",\"passwordConfirm\":\"senha-antiga-123\"}"
}
entra() {
  curl -s -X POST "http://$P/api/collections/users/auth-with-password" -H 'content-type: application/json' \
    -d "{\"identity\":\"$1\",\"password\":\"senha-antiga-123\"}" | J 'j.token ? "entrou" : "não: " + JSON.stringify(j)'
}

# 1 · versão antiga
sobe "$ANTIGA"
confere "$(cadastra comum@ci.local)" "200" "versão antiga: cadastro aberto cria conta comum"
confere "$(cadastra chefe@ci.local)" "200" "versão antiga: cadastro aberto cria conta do admin"

# 2 · versão nova sobre o mesmo banco
sobe "$NOVA"
SU=$(curl -s -X POST "http://$P/api/collections/_superusers/auth-with-password" -H 'content-type: application/json' \
  -d '{"identity":"ci@ci.local","password":"ci-senha-123456"}' | J 'j.token')
conta() { curl -s "http://$P/api/collections/users/records?filter=email%3D%22$1%22" -H "Authorization: $SU" | J "$2"; }
confere "$(conta comum@ci.local 'j.items[0].plano')" "pro" "conta antiga vira pro"
confere "$(conta comum@ci.local 'j.items[0].modulos.length')" "10" "conta antiga: 9 módulos + inteligência"
confere "$(conta comum@ci.local 'j.items[0].acessoAte.slice(0,10)')" "9999-12-31" "conta antiga: sem vencimento"
confere "$(conta comum@ci.local 'j.items[0].origemPlano')" "legado" "conta antiga: origem legado"
confere "$(conta comum@ci.local 'j.items[0].role')" "tecnico" "conta comum: role técnico"
confere "$(conta chefe@ci.local 'j.items[0].role')" "admin" "e-mail de FLUXGK_ADMINS: role admin"
confere "$(entra comum@ci.local)" "entrou" "conta antiga entra com a mesma senha"
confere "$(cadastra novo@ci.local)" "400" "versão nova: cadastro anônimo recusado"
confere "$(curl -s "http://$P/api/collections/users/auth-methods" | J 'j.oauth2.enabled && j.oauth2.providers.some(p=>p.name==="google")')" "true" "login Google ligado pelas variáveis"

# 3 · volta de versão
echo y | docker exec -i "$C" pocketbase migrate down 1 --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations --hooksDir=/pb/pb_hooks >/dev/null
sobe "$ANTIGA"
confere "$(cadastra volta@ci.local)" "200" "volta: cadastro aberto de novo"
confere "$(curl -s "http://$P/api/collections/codigos_ativacao/records" | J 'j.status')" "404" "volta: coleções novas removidas"
confere "$(entra comum@ci.local)" "entrou" "volta: conta antiga continua entrando"

echo
if [ "$falhas" -gt 0 ]; then echo "migração dos planos: $falhas falha(s)"; exit 1; fi
echo "migração dos planos: tudo ok"

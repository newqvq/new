#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
ZIP_NAME="hostinger-runtime-build-small.good.zip"
ZIP_PATH="$DIST/$ZIP_NAME"

HOSTINGER_HOST="${HOSTINGER_HOST:-145.79.25.77}"
HOSTINGER_PORT="${HOSTINGER_PORT:-65002}"
HOSTINGER_USER="${HOSTINGER_USER:-u335205377}"
HOSTINGER_APP_DIR="${HOSTINGER_APP_DIR:-domains/vc5444.com/nodejs}"
HOSTINGER_DOMAIN="${HOSTINGER_DOMAIN:-https://vc5444.com/}"
HOSTINGER_NODE_BIN_DIR="${HOSTINGER_NODE_BIN_DIR:-/opt/alt/alt-nodejs24/root/usr/bin}"
HOSTINGER_NPM_CLI="${HOSTINGER_NPM_CLI:-/opt/alt/alt-nodejs24/root/usr/lib/node_modules/npm/bin/npm-cli.js}"
HOSTINGER_RUN_DB_SEED="${HOSTINGER_RUN_DB_SEED:-1}"
HOSTINGER_RUN_DB_SEED_SMM="${HOSTINGER_RUN_DB_SEED_SMM:-1}"
HOSTINGER_UPLOAD_ENV="${HOSTINGER_UPLOAD_ENV:-0}"
HOSTINGER_SSH_PASSWORD="${HOSTINGER_SSH_PASSWORD:-}"

SSH_BASE=(
  ssh
  -o StrictHostKeyChecking=no
  -o PreferredAuthentications=password
  -o PubkeyAuthentication=no
  -p "$HOSTINGER_PORT"
  "${HOSTINGER_USER}@${HOSTINGER_HOST}"
)

SFTP_BASE=(
  sftp
  -o StrictHostKeyChecking=no
  -o PreferredAuthentications=password
  -o PubkeyAuthentication=no
  -P "$HOSTINGER_PORT"
  "${HOSTINGER_USER}@${HOSTINGER_HOST}"
)

if [ -n "$HOSTINGER_SSH_PASSWORD" ]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "设置了 HOSTINGER_SSH_PASSWORD，但本机缺少 sshpass。" >&2
    exit 1
  fi

  SSH_BASE=(sshpass -p "$HOSTINGER_SSH_PASSWORD" "${SSH_BASE[@]}")
  SFTP_BASE=(sshpass -p "$HOSTINGER_SSH_PASSWORD" "${SFTP_BASE[@]}")
fi

run_ssh() {
  "${SSH_BASE[@]}" "$1"
}

echo_step() {
  echo ""
  echo "==> $1"
}

echo_step "检查本地依赖"
command -v zip >/dev/null 2>&1 || { echo "缺少 zip 命令" >&2; exit 1; }
command -v shasum >/dev/null 2>&1 || { echo "缺少 shasum 命令" >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "缺少 unzip 命令" >&2; exit 1; }

cd "$ROOT"

echo_step "本地安装依赖"
npm install

echo_step "本地构建（Webpack）"
npm run build -- --webpack

echo_step "本地打包"
bash "$ROOT/scripts/pack.sh"

echo_step "校验本地运行包"
shasum -a 256 "$ZIP_PATH"
unzip -t "$ZIP_PATH" | tail -5

echo_step "准备远程目录"
run_ssh "mkdir -p ~/$HOSTINGER_APP_DIR ~/domains/vc5444.com/nodejs-backups"

if [ "$HOSTINGER_UPLOAD_ENV" = "1" ]; then
  if [ ! -f "$ROOT/.env" ]; then
    echo "HOSTINGER_UPLOAD_ENV=1，但本地没有 .env 文件。" >&2
    exit 1
  fi

  echo_step "上传 .env"
  ENV_BATCH="$(mktemp)"
  cat > "$ENV_BATCH" <<EOF
cd $HOSTINGER_APP_DIR
put $ROOT/.env .env
bye
EOF
  "${SFTP_BASE[@]}" < "$ENV_BATCH"
  rm -f "$ENV_BATCH"
fi

echo_step "上传运行包"
SFTP_BATCH="$(mktemp)"
cat > "$SFTP_BATCH" <<EOF
cd $HOSTINGER_APP_DIR
put $ZIP_PATH $ZIP_NAME
bye
EOF
"${SFTP_BASE[@]}" < "$SFTP_BATCH"
rm -f "$SFTP_BATCH"

echo_step "远程校验、备份并解压"
run_ssh "
  set -e
  cd ~/$HOSTINGER_APP_DIR
  export PATH=\"$HOSTINGER_NODE_BIN_DIR:\$PATH\"
  ls -lh $ZIP_NAME
  sha256sum $ZIP_NAME
  unzip -t $ZIP_NAME | tail -8
  mkdir -p ../nodejs-backups
  tar -czf ../nodejs-backups/pre-runtime-\$(date +%Y%m%d-%H%M%S).tar.gz \
    package.json prisma src .next server.js 2>/dev/null || true
  unzip -o $ZIP_NAME >/dev/null
  cp -f server.production.js server.js
  chmod 600 .env 2>/dev/null || true
  test -f .next/BUILD_ID
  test -f .next/server/server-reference-manifest.json
"

echo_step "远程安装生产依赖"
run_ssh "
  set -e
  cd ~/$HOSTINGER_APP_DIR
  export PATH=\"$HOSTINGER_NODE_BIN_DIR:\$PATH\"
  node \"$HOSTINGER_NPM_CLI\" install --omit=dev
"

if [ "$HOSTINGER_RUN_DB_SEED" = "1" ]; then
  echo_step "执行远程 db:seed"
  run_ssh "
    set -e
    cd ~/$HOSTINGER_APP_DIR
    export PATH=\"$HOSTINGER_NODE_BIN_DIR:\$PATH\"
    node \"$HOSTINGER_NPM_CLI\" run db:seed
  "
fi

if [ "$HOSTINGER_RUN_DB_SEED_SMM" = "1" ]; then
  echo_step "执行远程 db:seed-smm"
  run_ssh "
    set -e
    cd ~/$HOSTINGER_APP_DIR
    export PATH=\"$HOSTINGER_NODE_BIN_DIR:\$PATH\"
    node \"$HOSTINGER_NPM_CLI\" run db:seed-smm
  "
fi

echo_step "重启远程应用"
run_ssh "
  set +e
  pids=\$(ps -u \$(whoami) -o pid,cmd | grep -E 'next-server|server\\.js|server\\.production\\.js' | grep -v grep | awk '{print \$1}')
  if [ -n \"\$pids\" ]; then
    kill \$pids
  fi
  exit 0
"

echo_step "验证站点"
run_ssh "curl -I \"$HOSTINGER_DOMAIN\" | sed -n '1,5p'"

echo ""
echo "✅ Hostinger 部署流程完成"
echo ""
echo "常用环境变量："
echo "  HOSTINGER_SSH_PASSWORD=***   使用 sshpass 自动上传和执行"
echo "  HOSTINGER_UPLOAD_ENV=1       部署时顺带上传本地 .env"
echo "  HOSTINGER_RUN_DB_SEED=0      跳过 db:seed"
echo "  HOSTINGER_RUN_DB_SEED_SMM=0  跳过 db:seed-smm"

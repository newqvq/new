#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
ZIP_PATH="$DIST/hostinger-runtime-build-small.zip"

mkdir -p "$DIST"
rm -f "$ZIP_PATH"

cd "$ROOT"

if [ ! -d ".next" ]; then
  echo "缺少 .next 目录，请先运行: npm run build -- --webpack" >&2
  exit 1
fi

echo "开始打包 Hostinger 运行包..."

zip -r "$ZIP_PATH" \
  .next \
  src \
  public \
  prisma \
  package.json \
  package-lock.json \
  next.config.ts \
  postcss.config.mjs \
  tsconfig.json \
  next-env.d.ts \
  eslint.config.mjs \
  server.production.js \
  -x ".next/cache/*" ".next/dev/*" "prisma/dev.db" >/dev/null

SIZE="$(du -h "$ZIP_PATH" | awk '{print $1}')"

echo ""
echo "✅ 打包完成: $ZIP_PATH ($SIZE)"
echo ""
echo "包含内容:"
echo "  - .next (构建输出)"
echo "  - src (运行时代码)"
echo "  - public (静态资源)"
echo "  - prisma (schema 和 seed)"
echo "  - package.json / package-lock.json"
echo "  - next / ts / postcss / eslint 配置"
echo "  - server.production.js"

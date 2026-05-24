# Hostinger Deployment Runbook

This document records the deployment path that actually worked on Hostinger for
`vc5444.com`.

The important lesson: do not build this app on Hostinger. The shared Node.js
environment has low process/thread limits, and `next build`, Turbopack, Tailwind,
PostCSS, and Prisma schema engine can fail or hang with `EAGAIN`. Build locally,
upload the runtime package, and only run lightweight commands remotely.

## Server

```text
SSH: ssh -p 65002 u335205377@145.79.25.77
App directory: ~/domains/vc5444.com/nodejs
Node path: /opt/alt/alt-nodejs24/root/usr/bin
Domain: https://vc5444.com/
```

Use this PATH in remote SSH sessions:

```bash
export PATH="/opt/alt/alt-nodejs24/root/usr/bin:$PATH"
```

When npm hangs or behaves oddly, call Hostinger's npm CLI directly:

```bash
node /opt/alt/alt-nodejs24/root/usr/lib/node_modules/npm/bin/npm-cli.js --version
node /opt/alt/alt-nodejs24/root/usr/lib/node_modules/npm/bin/npm-cli.js install
```

## Current Working Strategy

1. Build locally with Webpack, not Turbopack.
2. Create a small runtime zip that includes `.next`, `src`, `public`, `prisma`,
   config files, `package.json`, and `package-lock.json`.
3. Upload with `sftp`, not `scp` and not text/chunk streaming.
4. Verify the zip checksum and `unzip -t` on the server.
5. Extract the zip into `~/domains/vc5444.com/nodejs`.
6. Ensure remote `.env` has `DATABASE_URL` using `127.0.0.1`, not `localhost`.
7. Do not run remote `next build`.
8. If Prisma `db push` hangs, generate SQL locally and apply it with MySQL CLI.
9. Run `npm run db:seed`.
10. Patch or preserve `server.js` so the Node app loads the deployed `.env`
    before `next` starts.
11. Restart the Hostinger Node app and verify the domain returns `HTTP 200`.

## Local Build

From the local project root:

```bash
cd /Users/djyt/wenjian/coding/new
npm install
npm run build -- --webpack
```

Build succeeded locally with Next.js `16.2.2` and Webpack.

Do not use Hostinger for this build step.

## Runtime Zip

Create a small deployable zip:

```bash
cd /Users/djyt/wenjian/coding/new
rm -f hostinger-runtime-build-small.zip
zip -r hostinger-runtime-build-small.zip \
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
  -x ".next/cache/*" ".next/dev/*" "prisma/dev.db"
```

Verify locally:

```bash
shasum -a 256 hostinger-runtime-build-small.zip
unzip -t hostinger-runtime-build-small.zip | tail -5
```

The successful upload on 2026-04-23 had this SHA-256:

```text
d6eb03fdb9959ab1c73e6621cc1087043267a235afdb9ce7c6bc149245fc2d27
```

The exact hash changes whenever code changes.

## Upload

Use `sftp`; it worked reliably where `scp` and chunked SSH uploads did not.

```bash
sftp -o StrictHostKeyChecking=no \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  -P 65002 \
  u335205377@145.79.25.77
```

Inside `sftp`:

```text
cd domains/vc5444.com/nodejs
put /Users/djyt/wenjian/coding/new/hostinger-runtime-build-small.zip hostinger-runtime-build-small.good.zip
bye
```

Remote verification:

```bash
cd ~/domains/vc5444.com/nodejs
ls -lh hostinger-runtime-build-small.good.zip
sha256sum hostinger-runtime-build-small.good.zip
unzip -t hostinger-runtime-build-small.good.zip | tail -8
```

Only extract after `unzip -t` succeeds:

```bash
cd ~/domains/vc5444.com/nodejs
mkdir -p ../nodejs-backups
tar -czf ../nodejs-backups/pre-runtime-$(date +%Y%m%d-%H%M%S).tar.gz \
  package.json prisma src .next 2>/dev/null || true
unzip -o hostinger-runtime-build-small.good.zip
```

Verify build output:

```bash
test -f .next/BUILD_ID && cat .next/BUILD_ID
ls -lh .next/server/app/page.js .next/static/css/*.css
```

## Environment

Remote app directory needs a `.env` file:

```text
~/domains/vc5444.com/nodejs/.env
```

Important database fix:

```env
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/DB_NAME"
```

Do not use `localhost` for this project on Hostinger. In this environment,
Prisma failed with `localhost:3306`, while `127.0.0.1:3306` worked.

If Hostinger's deployment config also has the old value, update it too:

```text
~/domains/vc5444.com/public_html/.builds/config/.env
```

Set permissions:

```bash
chmod 600 ~/domains/vc5444.com/nodejs/.env
```

Test the DB connection without exposing secrets:

```bash
cd ~/domains/vc5444.com/nodejs
export PATH="/opt/alt/alt-nodejs24/root/usr/bin:$PATH"
node -r dotenv/config -e 'console.log(process.env.DATABASE_URL ? "DATABASE_URL present" : "DATABASE_URL missing")'
```

## Database Initialization

First try the normal seed only if schema already exists:

```bash
cd ~/domains/vc5444.com/nodejs
export PATH="/opt/alt/alt-nodejs24/root/usr/bin:$PATH"
node /opt/alt/alt-nodejs24/root/usr/lib/node_modules/npm/bin/npm-cli.js run db:seed
```

The full `npm run hostinger:init` can hang because `prisma db push` starts the
Prisma schema engine, which may hit Hostinger resource limits. If it hangs for
more than a few minutes, stop it:

```bash
ps -u $(whoami) -o pid,etime,stat,cmd | grep -E "prisma|db:push|schema-engine" | grep -v grep
kill <pid> <pid> <pid>
```

### SQL Fallback That Worked

Generate SQL locally:

```bash
cd /Users/djyt/wenjian/coding/new
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/xinglian_schema.sql
```

Upload `/tmp/xinglian_schema.sql` to the remote app directory with `sftp`.

Apply it remotely with MySQL CLI. Use a small Node helper so secrets are read
from `.env` and not printed:

```js
// apply_schema_remote.js
const fs = require("fs");
const { spawnSync } = require("child_process");

const line = fs.readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .find((item) => item.startsWith("DATABASE_URL="));
const raw = line.slice("DATABASE_URL=".length).trim().replace(/^['"]|['"]$/g, "");
const url = new URL(raw);
const sql = fs.readFileSync("xinglian_schema.sql", "utf8");

const result = spawnSync("/usr/bin/mysql", [
  "--connect-timeout=10",
  "-h", url.hostname,
  "-P", url.port || "3306",
  "-u", decodeURIComponent(url.username),
  `-p${decodeURIComponent(url.password)}`,
  url.pathname.slice(1),
], {
  input: sql,
  encoding: "utf8",
  timeout: 120000,
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

console.log("Schema SQL applied");
```

Run remotely:

```bash
cd ~/domains/vc5444.com/nodejs
export PATH="/opt/alt/alt-nodejs24/root/usr/bin:$PATH"
node apply_schema_remote.js
rm -f apply_schema_remote.js xinglian_schema.sql
```

Then run seed:

```bash
node /opt/alt/alt-nodejs24/root/usr/lib/node_modules/npm/bin/npm-cli.js run db:seed
```

Successful seed output:

```text
Seeded 14 products and 2 categories.
Admin account: admin@vc5444.com
```

Verify data:

```sql
SELECT "users" AS name, COUNT(*) AS count FROM `User`
UNION ALL SELECT "products", COUNT(*) FROM `Product`
UNION ALL SELECT "categories", COUNT(*) FROM `ProductCategory`
UNION ALL SELECT "wallets", COUNT(*) FROM `Wallet`;
```

Successful result:

```text
users       1
products   14
categories 2
wallets    1
```

## Required Remote Script Patches

### `prisma/seed.js`

The CommonJS seed script must load `.env` before creating `PrismaClient`.

At the top of `prisma/seed.js`:

```js
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const bcrypt = require("bcryptjs");

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}
```

### `server.js`

Hostinger may inject stale hPanel env values before starting Node. The generated
`server.js` in the remote app directory was patched to load project `.env` after
`process.chdir(__dirname)` and before `require("next")`.

Patch:

```js
// Hostinger may inject stale panel env values; prefer the project .env deployed with the app.
try {
  const fs = require('fs')
  const envPath = path.join(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
    }
  }
} catch (err) {
  console.error('Failed to load .env:', err)
}
```

If a future deploy overwrites `server.js`, reapply this patch or update the
hPanel environment variables so they exactly match the project `.env`.

## Restart And Verify

Restart from Hostinger hPanel if available. If using SSH, killing the current
`next-server` process lets Hostinger restart it:

```bash
ps -u $(whoami) -o pid,etime,cmd | grep "next-server" | grep -v grep
kill <pid>
```

Verify:

```bash
curl -I https://vc5444.com/
curl -L -sS https://vc5444.com/ | sed -n "1,12p"
```

Successful result:

```text
HTTP/2 200
```

The body should contain product data such as:

```text
GPT Plus 共享席位
商品服务目录
```

## Known Failure Modes

- `Couldn't find any pages or app directory`: remote upload/extract missed `src`.
- Turbopack panic with Rayon or `EAGAIN`: Hostinger resource/thread limit.
- Webpack fails around `next/font/google`: remote build worker/process limit.
- Tailwind/PostCSS fails with `EAGAIN`: remote build worker/process limit.
- `P1001 Can't reach database server at localhost:3306`: use `127.0.0.1`.
- Prisma seed says `DATABASE_URL` missing: `prisma/seed.js` did not load `.env`.
- Site returns `HTTP 500` but DB works from SSH: running Node process has stale
  hPanel env; patch `server.js` or update hPanel env, then restart.

## Post-Deployment Database Sync (AFTER EVERY DEPLOYMENT)

**Hostinger removes the `prisma/` directory and `.env` file after each deployment.**
After uploading and extracting your build, you MUST run these steps to sync the
database. The website will NOT work until these complete.

### Quick Steps

From your local machine, run these in order:

```bash
# 1. Upload the missing files (prisma dir + .env)
sshpass -p 'YOUR_PASSWORD' ssh -p 65002 u335205377@145.79.25.77 \
  "mkdir -p /home/u335205377/domains/vc5444.com/nodejs/prisma"

sshpass -p 'YOUR_PASSWORD' scp -P 65002 \
  prisma/schema.prisma \
  u335205377@145.79.25.77:/home/u335205377/domains/vc5444.com/nodejs/prisma/schema.prisma

sshpass -p 'YOUR_PASSWORD' scp -P 65002 \
  prisma/seed-smm.ts \
  u335205377@145.79.25.77:/home/u335205377/domains/vc5444.com/nodejs/prisma/seed-smm.ts

sshpass -p 'YOUR_PASSWORD' scp -P 65002 \
  .env \
  u335205377@145.79.25.77:/home/u335205377/domains/vc5444.com/nodejs/.env

# 2. Run database sync commands on the server
sshpass -p 'YOUR_PASSWORD' ssh -p 65002 u335205377@145.79.25.77 \
  "cd /home/u335205377/domains/vc5444.com/nodejs && \
   export PATH=/home/u335205377/node/bin:\$PATH && \
   echo '=== db push ===' && \
   timeout 300 npx prisma@6.16.3 db push --schema prisma/schema.prisma --accept-data-loss && \
   echo '=== generate ===' && \
   npx prisma@6.16.3 generate --schema prisma/schema.prisma && \
   echo '=== seed (optional) ===' && \
   export CRAZYSMM_API_KEY=c6e892326b81588926df3f06cafc7682 && \
   timeout 300 npx --yes tsx prisma/seed-smm.ts"
```

### Important Notes

- **Must use `prisma@6.16.3`** — Hostinger's default Prisma is v7 which does NOT
  support the `url` property in schema files. Always use `npx prisma@6.16.3`.
- **Use `timeout 300`** — The shared server has high load (11-17+), and commands
  can hang. A 5-minute timeout prevents indefinite blocking.
- **If `db push` hangs or times out** — Try again. The server load fluctuates.
  If it consistently fails, use the SQL fallback method documented below.
- **Seed is optional** — `seed-smm.ts` only needs to run if you want to sync
  product data from CrazySMM. If you only changed schema fields, `db push` +
  `generate` is enough.

### Alternative: deploy.sh Script

Save this as `/tmp/deploy-vc5444.sh` locally and upload it to the server:

```bash
#!/bin/bash
export PATH=/home/u335205377/node/bin:$PATH
cd /home/u335205377/domains/vc5444.com/nodejs

NPX="/home/u335205377/node/bin/npx"

echo "=== START \$(date) ==="
echo "Step 1: prisma db push"
timeout 300 \$NPX prisma@6.16.3 db push --schema prisma/schema.prisma --accept-data-loss 2>&1
echo "DB_PUSH_EXIT: \$?"

echo "Step 2: prisma generate"
\$NPX prisma@6.16.3 generate --schema prisma/schema.prisma 2>&1
echo "GENERATE_EXIT: \$?"

echo "Step 3: seed products (optional)"
export CRAZYSMM_API_KEY=c6e892326b81588926df3f06cafc7682
timeout 300 \$NPX --yes tsx prisma/seed-smm.ts 2>&1
echo "SEED_EXIT: \$?"

echo "=== DONE \$(date) ==="
```

Upload and run:

```bash
sshpass -p 'YOUR_PASSWORD' scp -P 65002 /tmp/deploy-vc5444.sh \
  u335205377@145.79.25.77:/home/u335205377/domains/vc5444.com/nodejs/deploy.sh

sshpass -p 'YOUR_PASSWORD' ssh -p 65002 u335205377@145.79.25.77 \
  "cd /home/u335205377/domains/vc5444.com/nodejs && bash deploy.sh"
```

## Security Reminder

After any support session where credentials were shared:

- Change SSH password.
- Change MySQL password and update `.env`.
- Change admin password.
- Rotate API keys if they were exposed.

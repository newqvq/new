# Hostinger hPanel Deployment

This project is now prepared for Hostinger as a `Node.js / Next.js` app.

## What Changed

- Prisma datasource switched from `sqlite` to `mysql`
- `prisma/push.ts` now uses standard `prisma db push`
- `prisma/seed.ts` now also creates product categories
- Added `hostinger:init` script:

```bash
npm run hostinger:init
```

- Added deployment env templates:
  - `.env.example`
  - `.env.hostinger.test`

## Files You Should Use

- Use `.env.hostinger.test` as the first test deployment template
- Replace values later with real production credentials

## hPanel Setup

### 1. Create Database

In Hostinger hPanel:

- Websites
- Manage
- Databases
- MySQL Databases

Create:

- database name
- database user
- database password

Host is usually:

```text
localhost
```

### 2. Prepare Environment Variables

Start from:

```text
.env.hostinger.test
```

Update at least these fields before deployment:

```env
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@localhost:3306/DB_NAME
SITE_URL=https://your-domain.com
SERVER_ACTION_ALLOWED_ORIGINS=your-domain.com,www.your-domain.com
CRAZYSMM_API_KEY=your_real_key
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_real_admin_password
```

Do not keep the test secrets for real production.

## Suggested Hostinger Commands

If Hostinger asks for build/start commands, use:

### Install

```bash
npm install
```

### Database Init

Run once after environment variables are ready:

```bash
npm run hostinger:init
```

This will:

```bash
npm run db:push
npm run db:seed
```

### Build

```bash
npm run build
```

### Start

```bash
npm run start
```

## Important Notes

- This app needs a MySQL database before first launch
- Do not use SQLite on Hostinger for this project
- The admin account is created by the seed script
- Product categories are also created by the seed script
- After deployment, log in with the admin credentials from your env file

## Recommended First Deployment Order

1. Create MySQL database in Hostinger
2. Import env values from `.env.hostinger.test`
3. Deploy the app
4. Run `npm run hostinger:init`
5. Open the site
6. Log in to admin
7. Replace all test secrets and wallet addresses with real values

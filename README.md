# HoangCaster Member Hub

Multi-tenant membership management SaaS built with Next.js App Router, React, Supabase PostgreSQL, role-scoped APIs, i18n dictionaries, dark mode, QR membership cards, reporting, search/filter/export, and a production-style database schema.

The app runs even before Supabase is configured by falling back to local demo data. When Supabase environment variables are present, API routes read the real Supabase tables and apply role scoping in the server route.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@example.com` | `Admin@123` |

## Stack

- Next.js App Router and React client dashboard
- Supabase JS SDK for PostgreSQL access
- PostgreSQL schema with `shop_id` tenant isolation
- JWT-style local session token for the demo auth route
- Lucide React icons
- CSS responsive UI with light/dark theme
- next-intl-backed i18n dictionaries for English, Vietnamese, many European languages, Japanese, and Korean
- Zod validation on server routes for authentication and contact capture
- Supabase Auth sign-in path with seed-compatible MemberHub auth fallback

## Project Structure

```text
app/                         App Router pages, metadata, API routes, robots, sitemap
components/memberhub/        Main SaaS dashboard UI
lib/memberhub/               Auth helpers and local demo data
lib/supabaseServer.js        Server Supabase client
messages/memberhub.js        UI translation dictionaries
database/supabase_schema.sql Supabase schema, RLS, indexes, seed data
proxy.js                     Security headers and no-store API guard
styles/global.css            Responsive UI and theme styles
public/assets/               Visual assets
```

## Run Locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

If Supabase keys are missing, the app shows a demo-data banner and uses `lib/memberhub/demoData.js`. This is intentional so the UI can be reviewed before cloud setup.

## Environment

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MEMBERHUB_AUTH_SECRET=your-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` and `MEMBERHUB_AUTH_SECRET` must stay server-only.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run the full contents of `database/supabase_schema.sql`.
4. Add the environment variables above locally and in Vercel.
5. Restart the dev server.

The SQL creates and extends:

- `member_users`, `shops`, `customers`, `services`
- `membership_cards`, `membership_levels`, `transactions`, `promotions`
- `roles`, `permissions`, `role_permissions`
- `activity_logs`, `notifications`, `settings`
- `languages`, `translations`
- `products`, `contacts`

It also enables RLS, creates useful indexes, and generates larger seed data with 5 shops, 10 owners, 200 customers, 100 services, and 1,000 transactions.

## Features

- Role entry for Super Admin, Store Owner, and Customer
- Server-side role scoping so owners/customers only receive tenant-allowed data
- Dashboard KPIs, revenue chart, recent transactions, and top customers/services
- CRUD-style local modal for quick demo creation
- Search, status filter, pagination, CSV export, and print-to-PDF
- QR code membership cards and QR lookup screen
- Language switcher and persisted theme
- Security headers via `proxy.js`
- SEO metadata, `robots.txt`, and `sitemap.xml`

## Deploy To Vercel

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Framework preset: Next.js.
4. Build command: `npm run build`.
5. Add the same environment variables from `.env.example`.
6. Deploy.
7. Update `NEXT_PUBLIC_SITE_URL` to the Vercel or custom domain URL.

## Verification

```powershell
npm.cmd run build
```

The build should compile `/`, API routes, `robots.txt`, and `sitemap.xml`.

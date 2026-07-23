# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A multi-tenant membership management SaaS ("HoangCaster Member Hub") built with Next.js App Router, React 19, and Supabase Postgres. Shops (tenants) manage customers, services, membership tiers/points, transactions, and promotions; customers view QR membership cards. There is also a small standalone marketing/contact-capture flow (`products`, `contacts` tables) unrelated to the dashboard.

## Commands

```powershell
npm.cmd install         # install deps
npm.cmd run dev          # start dev server (http://localhost:3000)
npm.cmd run build        # production build — the only real "check" in this repo
npm.cmd run start        # run built app
npm.cmd run db:import    # push database/supabase_schema.sql to Postgres (see below)
```

There is no lint script, no test suite, and no `next.config` type-checking step configured. `npm run build` (Next.js build) is the closest thing to CI validation — it's what `.github/workflows/build.yml` runs on every push/PR, with placeholder Supabase env vars. Treat a successful build as the bar for "done."

`db:import` (`scripts/import-supabase-schema.mjs`) connects directly to Postgres (not through the Supabase SDK) using `SUPABASE_DB_URL`/`DATABASE_URL`, or `SUPABASE_DB_PASSWORD` + `NEXT_PUBLIC_SUPABASE_URL` to derive the direct DB host, and executes a SQL file (default `database/supabase_schema.sql`) as one script. Use `--dry-run` to just count statements, and pass an alternate path to run one of the other `database/*.sql` migration files (e.g. `safe_memberhub_migration.sql`, `backfill_customer_accounts.sql`).

## Architecture

### One React app behind many routes

`components/memberhub/MemberHubApp.jsx` (~2,600 lines, `"use client"`) is the entire dashboard SPA — auth screens, nav, and every role's views (super admin / store owner / customer) live in this one file. It reads/writes its own auth state via `localStorage` (`memberhub_token`, `memberhub_theme`, `memberhub_locale`) and calls the JSON APIs under `app/api/*` directly with `fetch`.

Five route files all render the exact same component with no props — the actual view is decided client-side from the logged-in user's role plus URL:

- `app/page.jsx` → `/`
- `app/admin/page.jsx` and `app/admin/[...rest]/page.jsx` (catch-all redirects to `/admin`) → `/admin`
- `app/HoangCasterMemberHub/page.jsx` → `/HoangCasterMemberHub` (legacy alias; `MemberHubApp` treats this path as equivalent to `/`)
- `app/[storeSlug]/page.jsx` and `app/[storeSlug]/[customerSlug]/page.jsx` → per-tenant "pretty URL" dashboard entry points

After login, `dashboardPathFor()` (`lib/memberhub/access.js`) computes where a user lands: `/admin` for super admin, `/{shopSlug}` for a store owner, `/{shopSlug}/{customerSlug}` for a customer. Slugs are produced by `lib/memberhub/slug.js` (`slugify`/`routeSlug`/`routePathFor`) — pure string transforms, not database lookups, so shop/customer routes are derived from `slug` (falling back to `name`, then `item-{id}`), not stored routes.

`app/products/[slug]/page.jsx` is unrelated to the dashboard: a public product page with a lead-capture `ContactForm` (POSTs to `app/api/contacts`). `components/ProductCard.jsx`, `SiteHeader.jsx`, and `SiteFooter.jsx` exist but are currently unreferenced anywhere in `app/` — dead code from an earlier storefront layout, not wired into any route.

### Auth: not Supabase Auth as the source of truth

`member_users` is the app's own user table (`password_hash`/`password_salt` via `crypto.scryptSync`, checked with `crypto.timingSafeEqual`). `lib/memberhub/auth.js` issues a **hand-rolled HMAC-SHA256 token** (`signToken`/`verifyToken`, JWT-shaped but not a real JWT lib) using `MEMBERHUB_AUTH_SECRET` (falls back to the service role key, then the anon key, then a hardcoded dev string — don't rely on that fallback in anything security-sensitive). `requireMemberUser(request, supabase)` reads `Authorization: Bearer <token>`, verifies it, and re-fetches the user row (so status/role changes take effect immediately, unlike a self-contained JWT claim).

Supabase Auth (`supabase.auth.signInWithPassword`) is checked **in addition to** the local password as an alternate path (`app/api/auth/login/route.js`, `change-password/route.js`) — either one succeeding lets the user in. This dual-path exists so Supabase-native accounts and seed-data/local accounts both work; keep both checks in sync when touching auth.

Roles are normalized through `lib/memberhub/access.js`: canonical values are `super_admin` / `store_owner` / `customer`, but `admin`/`owner` aliases are accepted on input (`normalizeRole`) and can be converted back (`toLegacyRole`) for older schema/UI expectations. Always compare roles via `isSuperAdmin()`/`isStoreOwner()`/`isCustomer()`/`roleMatches()`, never raw string equality.

### Data access: raw Supabase JS client, no ORM at runtime

`prisma/schema.prisma` documents the schema (models mirror `database/supabase_schema.sql`) but **the app does not use the Prisma client anywhere** — there's no `@prisma/client` import outside the schema file, and generated output is gitignored. Prisma here is schema-as-documentation / migration authoring, not a runtime dependency. All real reads/writes go through `@supabase/supabase-js`:

- `lib/supabaseServer.js` → `createSupabaseServerClient({ useServiceRole })`. Server/API-route only. Returns `null` if env vars are missing — every caller must handle that (`"Server chua cau hinh Supabase."` is the standard message). Service-role client bypasses RLS and is used for all authenticated mutations; the non-service-role client is used for the parallel Supabase Auth sign-in check.
- `lib/supabaseClient.js` → browser client, only usable when `NEXT_PUBLIC_SUPABASE_URL`/publishable key are set; `MemberHubApp` doesn't actually use this — it talks to `app/api/*` instead, so this is mostly for the products/marketing side.

Because the client hits real Postgres columns directly, several routes (`app/api/app-data/route.js`, `lib/memberhub/auth.js`, `app/api/me/route.js`) probe for a missing `avatar_url` column and silently retry the query without it — a live migration-compatibility shim for databases that haven't run the newer migration yet. Follow this pattern (detect "column not found" in the Postgres error, retry without that field) rather than assuming schema is fully migrated everywhere.

`app/api/memberhub/[collection]/route.js` is the generic CRUD endpoint for the dashboard: a `resources` map (collection name → table, allowed fields, `needsShop`/`adminOnlyCreate`/`adminOnlyWrite` flags) drives POST/PATCH/DELETE for shops, customers, services, membership levels, cards, transactions, promotions, users, notifications, and settings. `assertCanWrite()` is the single authorization chokepoint for all of it — tenant scoping (a store owner may only touch rows in shops they own or are assigned to via `store_users`), the super-admin restriction (admins manage shops/accounts/reports only, not tenant operational data), customer self-service limits, and the subscription-expired/suspended read-only gate all live there. When adding a new writable collection, add it to `resources` and make sure `assertCanWrite` covers it — don't bypass this function.

`runMutation()` retries insert/update up to 6 times, stripping any column Postgres reports as missing from the payload each time — another schema-drift tolerance measure, not a bug.

`app/api/app-data/route.js` (`GET`) is the dashboard's single bulk-read endpoint: it fetches all relevant tables, joins/shapes them (`shapeData` — adds computed fields like `subscription_status`, `remaining_days`, denormalized names), then narrows by role (`scopedData` — the read-side counterpart to `assertCanWrite`'s write-side scoping). Both scoping functions must stay consistent when tenant-visibility rules change.

### i18n

`next-intl` is wired through `i18n/request.js` (reads the `memberhub_locale` cookie server-side) and `next.config.mjs` (`createNextIntlPlugin`), but translation strings themselves live in one hand-maintained dictionary object, `messages/memberhub.js` (`dictionaries[localeId]`, flat dot-path keys like `"nav.overview"`), not per-locale JSON files. `lib/memberhub/i18n.js` converts the flat dictionary into the nested shape `next-intl` expects. Supported locales are listed in `messages/memberhub.js` (`locales` export) — English, Vietnamese, several European languages, Japanese, Korean. Default locale is `vi`. When adding UI strings, add the key to every locale's block in `messages/memberhub.js`, not a new file.

### Security headers

`proxy.js` exports `proxy(request)` + `config.matcher` — this is the Next.js middleware (unusual filename, but it's what's wired up; there is no `middleware.js`). It sets CSP/`X-Content-Type-Options`/`Referrer-Policy`/`Permissions-Policy` on every non-static request and forces `Cache-Control: no-store` on `/api/app-data`.

## Conventions worth preserving

- Database columns are `snake_case`; the client-side app and API payloads use the same `snake_case` keys straight through (no camelCase transform layer), except the Prisma schema file which maps camelCase model fields to snake_case columns via `@map`.
- User-facing strings in API error responses are Vietnamese (no diacritics in code-level error strings, e.g. `"Khong tim thay ban ghi"`), matching the primary user base; UI copy in `messages/memberhub.js` and JSX uses proper Vietnamese with diacritics. Keep new server error strings consistent with the existing terse, undiacriticized style.
- Money is always formatted with `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })` via a local `money()` helper duplicated in a few files — match that rather than introducing a new formatter.

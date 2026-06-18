# HoangCaster Member Hub

Website fullstack dung Next.js, React va Supabase PostgreSQL. App hien thi danh sach san pham/dich vu/bai viet tu Supabase, co trang chi tiet va form lien he/dat hang luu vao bang `contacts`.

## Stack

- Frontend: Next.js App Router, React, CSS responsive.
- Database: PostgreSQL tren Supabase.
- Data access: Supabase JS SDK trong `lib/`.
- Deploy: Vercel.
- Source control: GitHub.

## Cau truc moi

```text
app/                         Next.js routes, pages va API route
app/products/[slug]/page.jsx Trang chi tiet san pham
app/api/contacts/route.js    Luu form lien he vao Supabase
components/                  UI components
lib/supabaseClient.js        Supabase browser client
lib/supabaseServer.js        Supabase server client
lib/products.js              Truy van products
styles/global.css            Giao dien responsive
public/assets/beauty-hero.png Anh hero dung cho giao dien
public/legacy/              Giao dien HTML cu de tham khao
database/supabase_schema.sql SQL tao bang, seed data va RLS
.env.example                 Mau bien moi truong
```

Project chinh da duoc don ve Next.js + Supabase. Giao dien HTML cu duoc giu trong `public/legacy/` de tham khao; cac API Node/MariaDB cu khong con duoc chay.

## Chay local

1. Cai dependencies:

```powershell
npm.cmd install
```

2. Tao `.env.local` tu `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Dung `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` theo dashboard Supabase moi. Neu project cua ban van hien `anon public`, co the dung `NEXT_PUBLIC_SUPABASE_ANON_KEY` thay the. `SUPABASE_SERVICE_ROLE_KEY` khong bat buoc neu policy RLS cho phep insert vao `contacts`, nhung nen dat tren Vercel cho route server-side. Khong commit `.env.local`.

3. Chay dev server:

```powershell
npm.cmd run dev
```

Mo `http://localhost:3000`.

Neu vua sua `.env.local`, hay stop dev server cu va chay lai lenh tren de Next.js doc bien moi truong moi.

## Tao bang Supabase

1. Vao Supabase Dashboard -> SQL Editor.
2. Paste noi dung file `database/supabase_schema.sql`.
3. Bam Run.

SQL nay tao:

- `member_users`, `shops`, `customers`, `services`, `membership_cards`, `transactions`, `promotions`: du lieu demo tu file MariaDB cu, chuyen sang PostgreSQL.
- `products`: noi dung cong khai cho website Next.js, duoc map tu `services` va `promotions`, chi doc duoc khi `is_published = true`.
- `contacts`: luu form lien he/dat hang, public chi duoc insert, khong duoc select.
- Row Level Security da duoc bat cho cac bang quan trong.
- Seed san shop Lumi Spa, Nova Fitness, khach hang, the thanh vien, giao dich, dich vu va khuyen mai.

## Deploy len Vercel

1. Push source code len GitHub. Repo hien tai dang dung branch `master`:

```powershell
git add .
git commit -m "Clean Next.js Supabase project"
git push origin master
```

2. Vao Vercel -> Add New Project -> Import repository tu GitHub.
3. Framework Preset: Next.js.
4. Root Directory: `./`
5. Build Command: `npm run build`
6. Output Directory: de trong.
7. Them Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
```

8. Deploy. Sau khi deploy xong, cap nhat `NEXT_PUBLIC_SITE_URL` bang domain Vercel neu can.

## Scripts

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run start
```

## Bao mat

- Khong hard-code API key trong source code.
- Public browser chi dung anon key.
- Server route co the dung `SUPABASE_SERVICE_ROLE_KEY`, key nay chi nam trong bien moi truong server.
- RLS bat tren `products` va `contacts`.
- `contacts` khong co policy public select/update/delete.

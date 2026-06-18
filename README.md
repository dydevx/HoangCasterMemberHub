# HoangCaster Member Hub

Website fullstack dung Next.js, React va Supabase PostgreSQL. App chinh la MemberHub dashboard voi dang nhap theo vai tro admin/owner/customer, doc du lieu tu Supabase va giu giao dien gan voi ban HTML cu.

## Stack

- Frontend: Next.js App Router, React, CSS responsive.
- Database: PostgreSQL tren Supabase.
- Data access: Supabase JS SDK trong `lib/`.
- Deploy: Vercel.
- Source control: GitHub.

## Cau truc moi

```text
app/                         Next.js routes, pages va API route
app/api/auth/login/route.js  Dang nhap MemberHub
app/api/me/route.js          Kiem tra token hien tai
app/api/app-data/route.js    Du lieu dashboard theo vai tro
app/products/[slug]/page.jsx Trang chi tiet san pham
app/api/contacts/route.js    Luu form lien he vao Supabase
components/                  UI components
components/memberhub/        Giao dien MemberHub React
lib/supabaseClient.js        Supabase browser client
lib/supabaseServer.js        Supabase server client
lib/memberhub/auth.js        Verify mat khau va token
lib/products.js              Truy van products
styles/global.css            Giao dien responsive
public/assets/beauty-hero.png Anh hero dung cho giao dien
public/legacy/              Giao dien HTML cu de tham khao
database/supabase_schema.sql SQL tao bang, seed data va RLS
.env.example                 Mau bien moi truong
```

Project chinh da duoc don ve Next.js + Supabase. Giao dien HTML cu duoc giu trong `public/legacy/` de tham khao; app dang chay that o `/` la ban React/Next.js moi.

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

Neu ban ket noi Supabase bang integration cua Vercel, Vercel co the tu tao `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Server-side code da fallback sang cac ten nay. Tuy nhien, neu sau nay dung Supabase truc tiep trong client component, van nen them `NEXT_PUBLIC_SUPABASE_URL` va `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

3. Chay dev server:

```powershell
npm.cmd run dev
```

Mo `http://localhost:3000`.

Neu vua sua `.env.local`, hay stop dev server cu va chay lai lenh tren de Next.js doc bien moi truong moi.

Tai khoan mau sau khi chay `database/supabase_schema.sql`:

| Vai tro | Email | Mat khau |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin@123` |
| Chu cua hang | `owner@example.com` | `Owner@123` |
| Khach hang | `customer@example.com` | `Customer@123` |

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

Neu da dung Supabase integration cua Vercel, cac bien `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY` co the da co san. Ban chi can bo sung cac bien `NEXT_PUBLIC_*` neu muon expose Supabase cho client-side code.

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

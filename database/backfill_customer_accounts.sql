-- One-time migration: every customer gets a login account.
-- Default generated password is Customer@123.

begin;

create temp table memberhub_customer_account_backfill on commit drop as
select
  c.id as customer_id,
  c.name,
  c.phone,
  c.status,
  case
    when nullif(lower(trim(c.email)), '') is null then 'customer-' || c.id || '@memberhub.local'
    when exists (
      select 1
      from public.member_users u
      where u.email = lower(trim(c.email))
        and u.role <> 'customer'
    ) then 'customer-' || c.id || '@memberhub.local'
    else lower(trim(c.email))
  end as account_email
from public.customers c
where c.user_id is null;

update public.member_users u
set
  name = c.name,
  email = lower(trim(c.email)),
  phone = c.phone,
  status = c.status
from public.customers c
where c.user_id = u.id
  and u.role = 'customer'
  and nullif(lower(trim(c.email)), '') is not null
  and not exists (
    select 1
    from public.member_users other
    where other.email = lower(trim(c.email))
      and other.id <> u.id
  );

insert into public.member_users
  (name, email, password_hash, password_salt, role, status, phone)
select
  name,
  account_email,
  'da18da5cb55b8a656f550eb9fc69b28672575e3c872d0d26e1ff99d166dd029a1afa5d2f527bb7c203b67a13ca176c8e44e8bd54fbf11b744aa5612131f2d3e1',
  '9d578d363f9a8f5181a2047196c6ddb3',
  'customer',
  status,
  phone
from memberhub_customer_account_backfill
on conflict (email) do nothing;

update public.customers c
set user_id = u.id
from memberhub_customer_account_backfill b
join public.member_users u on u.email = b.account_email
where c.id = b.customer_id
  and c.user_id is null;

alter table public.customers drop constraint if exists customers_user_id_fkey;
alter table public.customers
  add constraint customers_user_id_fkey
  foreign key (user_id) references public.member_users(id) on delete cascade;
alter table public.customers alter column user_id set not null;

select setval(pg_get_serial_sequence('public.member_users', 'id'), greatest((select max(id) from public.member_users), 1), true);

commit;

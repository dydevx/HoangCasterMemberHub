-- Create membership cards for legacy customers whose card creation failed or
-- predates automatic card provisioning. Safe to run repeatedly.
insert into public.membership_cards (
  customer_id,
  shop_id,
  card_number,
  secure_token,
  qr_payload,
  points,
  tier,
  total_spend,
  status,
  created_at,
  updated_at
)
select
  customer.id,
  customer.shop_id,
  'MC' || lpad(customer.shop_id::text, 3, '0') || lpad(customer.id::text, 6, '0'),
  token.value,
  '/member/' || token.value,
  0,
  'Silver',
  0,
  'active',
  coalesce(customer.created_at, now()),
  now()
from public.customers customer
cross join lateral (
  select encode(gen_random_bytes(24), 'hex') as value
) token
where not exists (
  select 1
  from public.membership_cards card
  where card.customer_id = customer.id
    and card.shop_id = customer.shop_id
);

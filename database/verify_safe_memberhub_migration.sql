select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shops'
      and column_name = 'subscription_end_date'
  ) as has_shop_subscription_columns,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'membership_cards'
      and column_name = 'secure_token'
  ) as has_card_secure_token,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'transaction_code'
  ) as has_transaction_code,
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'point_histories'
  ) as has_point_histories,
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'subscription_renewals'
  ) as has_subscription_renewals;

select
  count(*) as total_cards,
  count(secure_token) as cards_with_secure_token,
  count(qr_payload) filter (where qr_payload like '/member/%') as cards_with_public_qr
from public.membership_cards;

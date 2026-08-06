-- Create the transactions that older application versions omitted when a
-- store owner confirmed a service request. The deterministic SR-{id} code
-- makes this migration safe to run more than once.
with inserted_transactions as (
  insert into public.transactions (
    customer_id,
    shop_id,
    service_id,
    transaction_code,
    price,
    discount,
    tax,
    amount,
    points_delta,
    note,
    created_at
  )
  select
    request.customer_id,
    request.shop_id,
    request.service_id,
    'SR-' || request.id,
    greatest(0, coalesce(service.price, 0)),
    0,
    0,
    greatest(0, coalesce(service.price, 0)),
    floor(
      greatest(0, coalesce(service.price, 0))::numeric /
      greatest(
        1,
        coalesce(
          nullif(regexp_replace(setting.value, '[^0-9.]', '', 'g'), '')::numeric,
          10000
        )
      )
    )::integer,
    coalesce(nullif(request.note, ''), 'Service request #' || request.id),
    coalesce(request.updated_at, request.created_at, now())
  from public.service_requests request
  join public.services service
    on service.id = request.service_id
   and service.shop_id = request.shop_id
  left join public.settings setting
    on setting.shop_id = request.shop_id
   and setting.key = 'points_vnd_per_point'
  where request.status in ('confirmed', 'completed')
    and not exists (
      select 1
      from public.transactions existing
      where existing.transaction_code = 'SR-' || request.id
    )
  returning customer_id, shop_id, amount, points_delta
), customer_totals as (
  select
    customer_id,
    shop_id,
    sum(amount)::integer as added_spend,
    sum(points_delta)::integer as added_points
  from inserted_transactions
  group by customer_id, shop_id
)
update public.membership_cards card
set
  total_spend = greatest(0, coalesce(card.total_spend, 0) + totals.added_spend),
  points = greatest(0, coalesce(card.points, 0) + totals.added_points),
  updated_at = now()
from customer_totals totals
where card.customer_id = totals.customer_id
  and card.shop_id = totals.shop_id;

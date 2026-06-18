import { requireMemberUser } from "@/lib/memberhub/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

async function readAll(supabase, table, select = "*") {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data || [];
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function scopedData(user, data) {
  if (user.role === "admin") {
    return data;
  }

  if (user.role === "owner") {
    const ownedShopIds = new Set(data.shops.filter((shop) => shop.owner_id === user.id).map((shop) => shop.id));

    return {
      ...data,
      shops: data.shops.filter((shop) => ownedShopIds.has(shop.id)),
      customers: data.customers.filter((item) => ownedShopIds.has(item.shop_id)),
      services: data.services.filter((item) => ownedShopIds.has(item.shop_id)),
      cards: data.cards.filter((item) => ownedShopIds.has(item.shop_id)),
      transactions: data.transactions.filter((item) => ownedShopIds.has(item.shop_id)),
      promotions: data.promotions.filter((item) => ownedShopIds.has(item.shop_id))
    };
  }

  const customerIds = new Set(data.customers.filter((customer) => customer.user_id === user.id).map((customer) => customer.id));
  const shopIds = new Set(data.customers.filter((customer) => customer.user_id === user.id).map((customer) => customer.shop_id));

  return {
    ...data,
    shops: data.shops.filter((shop) => shopIds.has(shop.id)),
    users: [user],
    customers: data.customers.filter((customer) => customerIds.has(customer.id)),
    services: data.services.filter((service) => shopIds.has(service.shop_id)),
    cards: data.cards.filter((card) => customerIds.has(card.customer_id)),
    transactions: data.transactions.filter((transaction) => customerIds.has(transaction.customer_id)),
    promotions: data.promotions.filter((promotion) => shopIds.has(promotion.shop_id))
  };
}

export async function GET(request) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  if (!supabase) {
    return NextResponse.json({ error: "Server chua cau hinh Supabase." }, { status: 500 });
  }

  const auth = await requireMemberUser(request, supabase);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [shops, users, customers, services, cards, transactions, promotions] = await Promise.all([
      readAll(supabase, "shops"),
      readAll(supabase, "member_users", "id,name,email,role,status,phone,created_at"),
      readAll(supabase, "customers"),
      readAll(supabase, "services"),
      readAll(supabase, "membership_cards"),
      readAll(supabase, "transactions"),
      readAll(supabase, "promotions")
    ]);

    const shopMap = byId(shops);
    const customerMap = byId(customers);
    const serviceMap = byId(services);

    const shaped = {
      shops,
      users,
      customers: customers.map((customer) => ({
        ...customer,
        shop_name: shopMap.get(customer.shop_id)?.name || ""
      })),
      services: services.map((service) => ({
        ...service,
        shop_name: shopMap.get(service.shop_id)?.name || ""
      })),
      cards: cards.map((card) => ({
        ...card,
        shop_name: shopMap.get(card.shop_id)?.name || "",
        customer_name: customerMap.get(card.customer_id)?.name || ""
      })),
      transactions: transactions.map((transaction) => ({
        ...transaction,
        shop_name: shopMap.get(transaction.shop_id)?.name || "",
        customer_name: customerMap.get(transaction.customer_id)?.name || "",
        service_name: serviceMap.get(transaction.service_id)?.name || ""
      })),
      promotions: promotions.map((promotion) => ({
        ...promotion,
        shop_name: shopMap.get(promotion.shop_id)?.name || ""
      }))
    };

    return NextResponse.json(scopedData(auth.user, shaped));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

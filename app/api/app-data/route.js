import { requireMemberUser } from "@/lib/memberhub/auth";
import { getDemoRawData } from "@/lib/memberhub/demoData";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

async function readAll(supabase, table, select = "*") {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data || [];
}

async function readOptional(supabase, table, select = "*") {
  const { data, error } = await supabase.from(table).select(select);
  if (error) return [];
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
      levels: data.levels.filter((item) => ownedShopIds.has(item.shop_id)),
      cards: data.cards.filter((item) => ownedShopIds.has(item.shop_id)),
      transactions: data.transactions.filter((item) => ownedShopIds.has(item.shop_id)),
      promotions: data.promotions.filter((item) => ownedShopIds.has(item.shop_id)),
      activityLogs: data.activityLogs.filter((item) => !item.shop_id || ownedShopIds.has(item.shop_id)),
      notifications: data.notifications.filter((item) => !item.shop_id || ownedShopIds.has(item.shop_id)),
      settings: data.settings.filter((item) => !item.shop_id || ownedShopIds.has(item.shop_id))
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
    levels: data.levels.filter((level) => shopIds.has(level.shop_id)),
    cards: data.cards.filter((card) => customerIds.has(card.customer_id)),
    transactions: data.transactions.filter((transaction) => customerIds.has(transaction.customer_id)),
    promotions: data.promotions.filter((promotion) => shopIds.has(promotion.shop_id)),
    activityLogs: [],
    notifications: data.notifications.filter((notification) => notification.user_id === user.id),
    settings: [],
    languages: data.languages
  };
}

function shapeData(data) {
  const shopMap = byId(data.shops);
  const userMap = byId(data.users);
  const customerMap = byId(data.customers);
  const serviceMap = byId(data.services);

  return {
    shops: data.shops.map((shop) => ({
      ...shop,
      owner_name: userMap.get(shop.owner_id)?.name || ""
    })),
    users: data.users,
    customers: data.customers.map((customer) => ({
      ...customer,
      shop_name: shopMap.get(customer.shop_id)?.name || ""
    })),
    services: data.services.map((service) => ({
      ...service,
      shop_name: shopMap.get(service.shop_id)?.name || ""
    })),
    levels: (data.levels || []).map((level) => ({
      ...level,
      shop_name: shopMap.get(level.shop_id)?.name || ""
    })),
    cards: data.cards.map((card) => ({
      ...card,
      shop_name: shopMap.get(card.shop_id)?.name || "",
      customer_name: customerMap.get(card.customer_id)?.name || ""
    })),
    transactions: data.transactions.map((transaction) => ({
      ...transaction,
      shop_name: shopMap.get(transaction.shop_id)?.name || "",
      customer_name: customerMap.get(transaction.customer_id)?.name || "",
      service_name: serviceMap.get(transaction.service_id)?.name || ""
    })),
    promotions: data.promotions.map((promotion) => ({
      ...promotion,
      shop_name: shopMap.get(promotion.shop_id)?.name || "",
      service_name: serviceMap.get(promotion.service_id)?.name || ""
    })),
    activityLogs: data.activityLogs || [],
    notifications: data.notifications || [],
    settings: data.settings || [],
    languages: data.languages || []
  };
}

export async function GET(request) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  const auth = await requireMemberUser(request, supabase);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    if (!supabase || auth.demo) {
      return NextResponse.json({
        ...scopedData(auth.user, shapeData(getDemoRawData())),
        demo: true
      });
    }

    const [shops, users, customers, services, levels, cards, transactions, promotions, activityLogs, notifications, settings, languages] = await Promise.all([
      readAll(supabase, "shops"),
      readAll(supabase, "member_users", "id,name,email,role,status,phone,created_at"),
      readAll(supabase, "customers"),
      readAll(supabase, "services"),
      readOptional(supabase, "membership_levels"),
      readAll(supabase, "membership_cards"),
      readAll(supabase, "transactions"),
      readAll(supabase, "promotions"),
      readOptional(supabase, "activity_logs"),
      readOptional(supabase, "notifications"),
      readOptional(supabase, "settings"),
      readOptional(supabase, "languages")
    ]);

    const shaped = shapeData({
      shops,
      users,
      customers,
      services,
      levels,
      cards,
      transactions,
      promotions,
      activityLogs,
      notifications,
      settings,
      languages
    });

    return NextResponse.json(scopedData(auth.user, shaped));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

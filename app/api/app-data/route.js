import { requireMemberUser } from "@/lib/memberhub/auth";
import { isCustomer, isStoreOwner, isSuperAdmin, normalizeRole } from "@/lib/memberhub/access";
import { routePathFor, routeSlug } from "@/lib/memberhub/slug";
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
  return new Map((items || []).map((item) => [item.id, item]));
}

function remainingDays(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computedSubscriptionStatus(shop) {
  if (shop?.subscription_status === "suspended" || shop?.status === "locked") return "suspended";
  const days = shop?.remaining_days ?? remainingDays(shop?.subscription_end_date);
  if (days === null || days === undefined) return shop?.subscription_status || "active";
  if (days <= 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

async function readWhereIn(supabase, table, column, values, select = "*") {
  const list = [...new Set((values || []).filter((value) => value !== null && value !== undefined))];
  if (!list.length) return [];

  const { data, error } = await supabase.from(table).select(select).in(column, list);
  if (error) throw error;
  return data || [];
}

async function readOptionalWhereIn(supabase, table, column, values, select = "*") {
  try {
    return await readWhereIn(supabase, table, column, values, select);
  } catch {
    return [];
  }
}

async function readWhereEq(supabase, table, column, value, select = "*") {
  const { data, error } = await supabase.from(table).select(select).eq(column, value);
  if (error) throw error;
  return data || [];
}

async function readOptionalWhereEq(supabase, table, column, value, select = "*") {
  try {
    return await readWhereEq(supabase, table, column, value, select);
  } catch {
    return [];
  }
}

function emptyRawData(overrides = {}) {
  return {
    shops: [],
    storeUsers: [],
    users: [],
    customers: [],
    services: [],
    levels: [],
    cards: [],
    transactions: [],
    promotions: [],
    activityLogs: [],
    notifications: [],
    settings: [],
    languages: [],
    ...overrides
  };
}

async function ownedShopIdsFor(supabase, user) {
  const [ownedShops, assignedStores] = await Promise.all([
    readWhereEq(supabase, "shops", "owner_id", user.id, "id"),
    readOptionalWhereEq(supabase, "store_users", "user_id", user.id, "store_id")
  ]);

  return [...new Set([
    ...ownedShops.map((shop) => shop.id),
    ...assignedStores.map((item) => item.store_id)
  ])];
}

async function readStoreOwnerData(supabase, user) {
  const shopIds = await ownedShopIdsFor(supabase, user);
  if (!shopIds.length) return emptyRawData({ users: [user] });

  const [shops, storeUsers] = await Promise.all([
    readWhereIn(supabase, "shops", "id", shopIds),
    readOptionalWhereIn(supabase, "store_users", "store_id", shopIds)
  ]);
  const userIds = [
    user.id,
    ...shops.map((shop) => shop.owner_id),
    ...storeUsers.map((item) => item.user_id)
  ];

  const [users, customers, services, levels, cards, transactions, promotions, activityLogs, notifications, settings, languages] = await Promise.all([
    readWhereIn(supabase, "member_users", "id", userIds, "id,name,email,role,status,phone,locale,created_at"),
    readWhereIn(supabase, "customers", "shop_id", shopIds),
    readWhereIn(supabase, "services", "shop_id", shopIds),
    readOptionalWhereIn(supabase, "membership_levels", "shop_id", shopIds),
    readWhereIn(supabase, "membership_cards", "shop_id", shopIds),
    readWhereIn(supabase, "transactions", "shop_id", shopIds),
    readWhereIn(supabase, "promotions", "shop_id", shopIds),
    readOptionalWhereIn(supabase, "activity_logs", "shop_id", shopIds),
    readOptionalWhereIn(supabase, "notifications", "shop_id", shopIds),
    readOptionalWhereIn(supabase, "settings", "shop_id", shopIds),
    readOptional(supabase, "languages")
  ]);

  return emptyRawData({
    shops,
    storeUsers,
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
}

async function readCustomerData(supabase, user) {
  const customers = await readWhereEq(supabase, "customers", "user_id", user.id);
  const customerIds = customers.map((customer) => customer.id);
  const shopIds = [...new Set(customers.map((customer) => customer.shop_id))];

  if (!customerIds.length || !shopIds.length) return emptyRawData({ users: [user] });

  const [shops, services, levels, cards, transactions, promotions, notifications, languages] = await Promise.all([
    readWhereIn(supabase, "shops", "id", shopIds),
    readWhereIn(supabase, "services", "shop_id", shopIds),
    readOptionalWhereIn(supabase, "membership_levels", "shop_id", shopIds),
    readWhereIn(supabase, "membership_cards", "customer_id", customerIds),
    readWhereIn(supabase, "transactions", "customer_id", customerIds),
    readWhereIn(supabase, "promotions", "shop_id", shopIds),
    readOptionalWhereEq(supabase, "notifications", "user_id", user.id),
    readOptional(supabase, "languages")
  ]);

  return emptyRawData({
    shops,
    users: [user],
    customers,
    services,
    levels,
    cards,
    transactions,
    promotions,
    notifications,
    languages
  });
}

function scopedData(user, data) {
  if (isSuperAdmin(user)) {
    return data;
  }

  if (isStoreOwner(user)) {
    const assignedShopIds = data.storeUsers
      .filter((item) => item.user_id === user.id)
      .map((item) => item.store_id);
    const ownedShopIds = new Set([
      ...data.shops.filter((shop) => shop.owner_id === user.id).map((shop) => shop.id),
      ...assignedShopIds
    ]);

    return {
      ...data,
      shops: data.shops.filter((shop) => ownedShopIds.has(shop.id)),
      storeUsers: data.storeUsers.filter((item) => ownedShopIds.has(item.store_id)),
      users: data.users.filter((item) => item.id === user.id || data.storeUsers.some((storeUser) => ownedShopIds.has(storeUser.store_id) && storeUser.user_id === item.id)),
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

  if (!isCustomer(user)) return data;

  const customerIds = new Set(data.customers.filter((customer) => customer.user_id === user.id).map((customer) => customer.id));
  const shopIds = new Set(data.customers.filter((customer) => customer.user_id === user.id).map((customer) => customer.shop_id));

  return {
    ...data,
    shops: data.shops.filter((shop) => shopIds.has(shop.id)),
    storeUsers: [],
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
      slug: routeSlug(shop),
      store_url: routePathFor(routeSlug(shop)),
      total_members: data.customers.filter((customer) => customer.shop_id === shop.id).length,
      remaining_days: shop.remaining_days ?? remainingDays(shop.subscription_end_date),
      subscription_status: computedSubscriptionStatus(shop),
      owner_name: [
        userMap.get(shop.owner_id)?.name,
        ...(data.storeUsers || [])
          .filter((item) => item.store_id === shop.id)
          .map((item) => userMap.get(item.user_id)?.name)
      ].filter(Boolean).join(", ")
    })),
    storeUsers: (data.storeUsers || []).map((item) => ({
      ...item,
      shop_name: shopMap.get(item.store_id)?.name || "",
      shop_slug: routeSlug(shopMap.get(item.store_id)),
      user_name: userMap.get(item.user_id)?.name || "",
      user_email: userMap.get(item.user_id)?.email || ""
    })),
    users: data.users.map((user) => ({ ...user, role: normalizeRole(user.role) })),
    customers: data.customers.map((customer) => ({
      ...customer,
      slug: routeSlug(customer),
      shop_name: shopMap.get(customer.shop_id)?.name || "",
      shop_slug: routeSlug(shopMap.get(customer.shop_id)),
      customer_url: routePathFor(routeSlug(shopMap.get(customer.shop_id)), routeSlug(customer))
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
    if (isStoreOwner(auth.user)) {
      return NextResponse.json(shapeData(await readStoreOwnerData(supabase, auth.user)));
    }

    if (isCustomer(auth.user)) {
      return NextResponse.json(shapeData(await readCustomerData(supabase, auth.user)));
    }

    const [shops, storeUsers, users, customers, services, levels, cards, transactions, promotions, activityLogs, notifications, settings, languages] = await Promise.all([
      readAll(supabase, "shops"),
      readOptional(supabase, "store_users"),
      readAll(supabase, "member_users", "id,name,email,role,status,phone,locale,created_at"),
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
      storeUsers,
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

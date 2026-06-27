import { hashPassword, requireMemberUser } from "@/lib/memberhub/auth";
import { isCustomer, isStoreOwner, isSuperAdmin, normalizeRole, toLegacyRole } from "@/lib/memberhub/access";
import { slugify } from "@/lib/memberhub/slug";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import crypto from "node:crypto";
import { NextResponse } from "next/server";

const resources = {
  shops: {
    table: "shops",
    fields: ["name", "slug", "address", "phone", "email", "logo_data_url", "description", "owner_id", "status", "subscription_start_date", "subscription_end_date", "subscription_status", "subscription_plan"],
    adminOnlyCreate: true
  },
  storeUsers: {
    table: "store_users",
    fields: ["store_id", "user_id", "role"],
    adminOnlyCreate: true,
    adminOnlyWrite: true
  },
  customers: {
    table: "customers",
    fields: ["shop_id", "user_id", "name", "slug", "email", "phone", "birthday", "gender", "notes", "avatar_url", "address", "status"],
    needsShop: true
  },
  services: {
    table: "services",
    fields: ["shop_id", "name", "price", "duration_minutes", "description", "image_url", "status"],
    needsShop: true
  },
  levels: {
    table: "membership_levels",
    fields: ["shop_id", "name", "color", "icon", "min_points", "min_spend", "earn_rate", "discount_percent", "benefits", "sort_order", "status"],
    needsShop: true
  },
  cards: {
    table: "membership_cards",
    fields: ["customer_id", "shop_id", "card_number", "secure_token", "qr_payload", "points", "tier", "total_spend", "expires_at", "status"],
    needsShop: true
  },
  transactions: {
    table: "transactions",
    fields: ["customer_id", "shop_id", "service_id", "transaction_code", "price", "discount", "tax", "amount", "points_delta", "note"],
    needsShop: true
  },
  promotions: {
    table: "promotions",
    fields: ["shop_id", "service_id", "title", "description", "type", "discount_percent", "discount_amount", "start_date", "end_date", "status"],
    needsShop: true
  },
  users: {
    table: "member_users",
    fields: ["name", "email", "role", "status", "phone"],
    adminOnlyCreate: true
  },
  notifications: {
    table: "notifications",
    fields: ["shop_id", "user_id", "title", "body", "status"],
    needsShop: true
  },
  settings: {
    table: "settings",
    fields: ["shop_id", "key", "value"],
    needsShop: true
  }
};

const numericFields = new Set([
  "shop_id",
  "store_id",
  "user_id",
  "owner_id",
  "customer_id",
  "service_id",
  "price",
  "duration_minutes",
  "points",
  "total_spend",
  "min_points",
  "min_spend",
  "earn_rate",
  "sort_order",
  "discount_percent",
  "discount_amount",
  "discount",
  "tax",
  "amount",
  "points_delta"
]);

function cleanPayload(body, config) {
  return config.fields.reduce((result, field) => {
    if (!(field in body)) return result;
    const value = body[field];

    if (value === "" || value === undefined) {
      result[field] = null;
      return result;
    }

    if (numericFields.has(field)) {
      const number = Number(value);
      if (Number.isFinite(number)) result[field] = number;
      return result;
    }

    result[field] = typeof value === "string" ? value.trim() : value;
    return result;
  }, {});
}

function secureToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(dateValue, months) {
  const date = new Date(dateValue || todayDate());
  date.setMonth(date.getMonth() + Number(months || 1));
  return date.toISOString().slice(0, 10);
}

function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function nextSubscriptionStatus(shop) {
  if (shop?.subscription_status === "suspended" || shop?.status === "locked") return "suspended";
  const remaining = daysUntil(shop?.subscription_end_date);
  if (remaining === null) return shop?.subscription_status || "active";
  if (remaining <= 0) return "expired";
  if (remaining <= 30) return "expiring";
  return "active";
}

function publicMemberPath(token) {
  return `/member/${token}`;
}

async function getOwnedShopIds(supabase, user) {
  if (isSuperAdmin(user)) {
    const { data, error } = await supabase.from("shops").select("id").order("id", { ascending: true });
    if (error) throw error;
    return (data || []).map((shop) => shop.id);
  }

  if (isStoreOwner(user)) {
    const { data, error } = await supabase.from("shops").select("id").eq("owner_id", user.id).order("id", { ascending: true });
    if (error) throw error;
    const ownerIds = (data || []).map((shop) => shop.id);
    const { data: assigned } = await supabase
      .from("store_users")
      .select("store_id")
      .eq("user_id", user.id);
    return [...new Set([...ownerIds, ...(assigned || []).map((item) => item.store_id)])];
  }

  return [];
}

async function assertCanWrite(supabase, user, config, payload, id) {
  const tenantOperationTables = new Set([
    "customers",
    "services",
    "membership_levels",
    "membership_cards",
    "transactions",
    "promotions",
    "settings"
  ]);

  if (isCustomer(user)) {
    if (config.table === "customers" && id) {
      const { data, error } = await supabase
        .from(config.table)
        .select("id,user_id")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return { error: "Khong tim thay ho so khach hang", status: 404 };
      }

      if (data.user_id !== user.id) {
        return { error: "Khong duoc sua ho so khach hang khac", status: 403 };
      }

      delete payload.shop_id;
      delete payload.user_id;
      delete payload.status;
      delete payload.slug;
      return {};
    }

    return { error: "Khach hang khong co quyen ghi du lieu quan tri", status: 403 };
  }

  if (config.adminOnlyCreate && !id && !isSuperAdmin(user)) {
    return { error: "Chi admin moi co quyen tao du lieu nay", status: 403 };
  }

  if (config.adminOnlyWrite && !isSuperAdmin(user)) {
    return { error: "Chi admin moi co quyen quan ly du lieu nay", status: 403 };
  }

  if (isSuperAdmin(user)) {
    if (tenantOperationTables.has(config.table)) {
      return { error: "Super Admin chi quan ly cua hang, tai khoan va bao cao tong quan", status: 403 };
    }
    return {};
  }

  if (config.table === "member_users") {
    return { error: "Chi admin moi co quyen quan ly nguoi dung", status: 403 };
  }

  const ownedShopIds = await getOwnedShopIds(supabase, user);
  if (!ownedShopIds.length) {
    return { error: "Tai khoan chua duoc gan cua hang", status: 403 };
  }

  if (!payload.shop_id && config.needsShop) {
    payload.shop_id = ownedShopIds[0];
  }

  if (payload.shop_id && !ownedShopIds.includes(Number(payload.shop_id))) {
    return { error: "Khong duoc ghi du lieu cua cua hang khac", status: 403 };
  }

  if (id) {
    const guardSelect = config.table === "shops" ? "id,owner_id" : "id,shop_id";
    const { data, error } = await supabase
      .from(config.table)
      .select(guardSelect)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return { error: "Khong tim thay ban ghi", status: 404 };
    }

    const rowShopId = config.table === "shops" ? data.id || payload.shop_id : data.shop_id;
    if (config.table === "shops" && data.owner_id !== user.id) {
      return { error: "Khong duoc sua cua hang khac", status: 403 };
    }

    if (config.table !== "shops" && rowShopId && !ownedShopIds.includes(Number(rowShopId))) {
      return { error: "Khong duoc sua du lieu cua cua hang khac", status: 403 };
    }
  }

  if (config.needsShop && payload.shop_id) {
    const { data: shop } = await supabase
      .from("shops")
      .select("id,status,subscription_status,subscription_end_date")
      .eq("id", payload.shop_id)
      .maybeSingle();

    const readonlyStatus = nextSubscriptionStatus(shop);
    if (readonlyStatus === "expired" || readonlyStatus === "suspended") {
      return { error: "Cua hang da het han hoac dang bi khoa, chi duoc xem du lieu", status: 403 };
    }
  }

  return {};
}

async function applyTransactionToCard(supabase, transaction, previous = null) {
  if (!transaction?.customer_id || !transaction?.shop_id) return;

  const pointDiff = Number(transaction.points_delta || 0) - Number(previous?.points_delta || 0);
  const spendDiff = Number(transaction.amount || 0) - Number(previous?.amount || 0);

  if (!pointDiff && !spendDiff) return;

  let { data: card, error } = await supabase
    .from("membership_cards")
    .select("id,points,total_spend")
    .eq("customer_id", transaction.customer_id)
    .eq("shop_id", transaction.shop_id)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from("membership_cards")
      .select("id,points")
      .eq("customer_id", transaction.customer_id)
      .eq("shop_id", transaction.shop_id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    card = fallback.data;
    error = fallback.error;
  }

  if (error || !card) return;

  const updatePayload = {
    points: Math.max(0, Number(card.points || 0) + pointDiff),
    total_spend: Math.max(0, Number(card.total_spend || 0) + spendDiff)
  };

  const { data: levels } = await supabase
    .from("membership_levels")
    .select("name,min_points,min_spend,status")
    .eq("shop_id", transaction.shop_id)
    .eq("status", "active");
  const nextTier = (levels || [])
    .filter((level) => updatePayload.points >= Number(level.min_points || 0) && updatePayload.total_spend >= Number(level.min_spend || 0))
    .sort((left, right) => Number(right.min_points || 0) + Number(right.min_spend || 0) - Number(left.min_points || 0) - Number(left.min_spend || 0))[0]?.name;

  if (nextTier) {
    updatePayload.tier = nextTier;
  }

  const { error: updateError } = await supabase
    .from("membership_cards")
    .update(updatePayload)
    .eq("id", card.id);

  if (updateError) {
    await supabase
      .from("membership_cards")
      .update({ points: updatePayload.points })
      .eq("id", card.id);
  }

  try {
    await supabase
      .from("point_histories")
      .insert({
      shop_id: transaction.shop_id,
      customer_id: transaction.customer_id,
      card_id: card.id,
      transaction_id: transaction.id || null,
      points_before: Number(card.points || 0),
      points_delta: pointDiff,
      points_after: updatePayload.points,
      reason: "transaction",
      actor_id: transaction.actor_id || null
      });
  } catch {}
}

function prepareUserPayload(body, payload, mode) {
  const password = String(body.password || "").trim();
  const nextPayload = { ...payload };

  if (mode === "post") {
    nextPayload.role = payload.role || "store_owner";
    nextPayload.status = payload.status || "active";
  }

  if (nextPayload.role) {
    nextPayload.role = toLegacyRole(nextPayload.role);
  }

  if (password) {
    Object.assign(nextPayload, hashPassword(password));
  }

  return nextPayload;
}

async function runMutation(supabase, config, mode, payload, id) {
  const workingPayload = { ...payload };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const query = mode === "patch"
      ? supabase.from(config.table).update(workingPayload).eq("id", id).select("*").single()
      : supabase.from(config.table).insert(workingPayload).select("*").single();

    const result = await query;
    const missingColumn = result.error?.message?.match(/Could not find the '([^']+)' column/);

    if (missingColumn && missingColumn[1] in workingPayload) {
      delete workingPayload[missingColumn[1]];
      continue;
    }

    return result;
  }

  return { data: null, error: new Error("Khong the luu do schema Supabase chua dong bo") };
}

function transactionAmount(payload) {
  const rawAmount = Number(payload.amount || 0);
  if (rawAmount) return rawAmount;

  const price = Number(payload.price || 0);
  const discount = Number(payload.discount || 0);
  const tax = Number(payload.tax || 0);

  return Math.max(0, price - discount + tax);
}

async function defaultShopId(supabase, user) {
  const ids = await getOwnedShopIds(supabase, user);
  return ids[0] || null;
}

async function settingValue(supabase, shopId, key, fallback) {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("shop_id", shopId)
    .eq("key", key)
    .maybeSingle();

  return data?.value ?? fallback;
}

async function pointsForTransaction(supabase, payload) {
  const amount = Number(payload.amount || 0);
  const rateValue = await settingValue(supabase, payload.shop_id, "points_vnd_per_point", "10000").catch(() => "10000");
  const vndPerPoint = Math.max(1, Number(String(rateValue).replace(/[^0-9.]/g, "")) || 10000);
  return Math.floor(amount / vndPerPoint);
}

async function memberUserExists(supabase, userId) {
  if (!userId) return false;

  const { data, error } = await supabase
    .from("member_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return !error && Boolean(data?.id);
}

function customerEmail(payload, id = null) {
  const email = String(payload.email || "").trim().toLowerCase();
  if (email) return email;
  return id ? `customer-${id}@memberhub.local` : `customer-${Date.now()}-${secureToken(4)}@memberhub.local`;
}

async function ensureCustomerUser(supabase, payload, body) {
  if (payload.user_id) {
    const hasUser = await memberUserExists(supabase, payload.user_id);
    if (!hasUser) {
      return { error: "Tai khoan khach hang khong ton tai", status: 400 };
    }
    return {};
  }

  const email = customerEmail(payload);
  payload.email = email;
  const { data: existingUser, error: existingUserError } = await supabase
    .from("member_users")
    .select("id,role")
    .eq("email", email)
    .maybeSingle();

  if (existingUserError) {
    return { error: existingUserError.message, status: 400 };
  }

  if (existingUser?.id) {
    if (!isCustomer(existingUser.role)) {
      return { error: "Email nay dang thuoc tai khoan khong phai khach hang", status: 400 };
    }

    payload.user_id = existingUser.id;
    return {};
  }

  const passwordPayload = hashPassword(String(body.password || "").trim() || "Customer@123");
  const { data: customerUser, error: customerUserError } = await supabase
    .from("member_users")
    .insert({
      name: payload.name || email,
      email,
      role: "customer",
      status: payload.status || "active",
      phone: payload.phone || null,
      ...passwordPayload
    })
    .select("id")
    .single();

  if (customerUserError) {
    return { error: customerUserError.message, status: 400 };
  }

  payload.user_id = customerUser.id;
  return {};
}

async function syncCustomerUser(supabase, customer, payload) {
  if (!customer?.user_id) return {};

  const updatePayload = {};
  if (payload.name !== undefined) updatePayload.name = payload.name;
  if (payload.email !== undefined) {
    payload.email = customerEmail(payload, customer.id);
    updatePayload.email = payload.email;
  }
  if (payload.phone !== undefined) updatePayload.phone = payload.phone;
  if (payload.status !== undefined) updatePayload.status = payload.status;

  if (!Object.keys(updatePayload).length) return {};

  const { error } = await supabase
    .from("member_users")
    .update(updatePayload)
    .eq("id", customer.user_id)
    .eq("role", "customer");

  if (error) {
    return { error: error.message, status: 400 };
  }

  return {};
}

async function writeResource(request, params, mode) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  if (!supabase) {
    return NextResponse.json({ error: "Server chua cau hinh Supabase." }, { status: 500 });
  }

  const auth = await requireMemberUser(request, supabase);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { collection } = await params;
  const config = resources[collection];
  if (!config) {
    return NextResponse.json({ error: "Tai nguyen khong hop le" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const id = mode === "patch" ? Number(body.id) : null;
  if (mode === "patch" && !id) {
    return NextResponse.json({ error: "Thieu id ban ghi" }, { status: 400 });
  }

  const payload = cleanPayload(body, config);

  if (collection === "customers" && mode === "patch") {
    delete payload.user_id;
  }

  if (config.needsShop && !payload.shop_id) {
    const fallbackShopId = await defaultShopId(supabase, auth.user);
    if (fallbackShopId) {
      payload.shop_id = fallbackShopId;
    }
  }

  if (config.fields.includes("slug") && !payload.slug && payload.name) {
    payload.slug = slugify(payload.name);
  }

  if (config.fields.includes("slug") && payload.slug) {
    payload.slug = slugify(payload.slug);
  }

  if (collection === "cards") {
    payload.secure_token = payload.secure_token || secureToken();
    payload.card_number = payload.card_number || `MC${String(payload.shop_id || "0").padStart(3, "0")}${Date.now()}`;
    payload.qr_payload = payload.qr_payload || publicMemberPath(payload.secure_token);
    payload.points = payload.points ?? 0;
    payload.total_spend = payload.total_spend ?? 0;
    payload.tier = payload.tier || "Member";
    payload.status = payload.status || "active";
  }

  if (collection === "shops" && !payload.owner_id && isStoreOwner(auth.user)) {
    payload.owner_id = auth.user.id;
  }

  if (collection === "shops") {
    payload.subscription_start_date = payload.subscription_start_date || todayDate();
    if (!payload.subscription_end_date && body.subscription_months) {
      payload.subscription_end_date = addMonths(payload.subscription_start_date, body.subscription_months);
    }
    payload.subscription_status = payload.subscription_status || nextSubscriptionStatus(payload);
    payload.subscription_plan = payload.subscription_plan || "standard";

    if (mode === "post" && !payload.owner_id && body.owner_email) {
      const ownerEmail = String(body.owner_email || "").trim().toLowerCase();
      const { data: existingOwner, error: existingOwnerError } = await supabase
        .from("member_users")
        .select("id,role")
        .eq("email", ownerEmail)
        .maybeSingle();

      if (existingOwnerError) {
        return NextResponse.json({ error: existingOwnerError.message }, { status: 400 });
      }

      if (existingOwner?.id) {
        if (isCustomer(existingOwner.role)) {
          return NextResponse.json({ error: "Email chu cua hang dang thuoc tai khoan khach hang" }, { status: 400 });
        }
        payload.owner_id = existingOwner.id;
      } else {
        const ownerPassword = String(body.owner_password || "").trim() || "Owner@123";
        const { data: ownerUser, error: ownerError } = await supabase
          .from("member_users")
          .insert({
            name: String(body.owner_name || payload.name || ownerEmail).trim(),
            email: ownerEmail,
            phone: String(body.owner_phone || payload.phone || "").trim() || null,
            role: "owner",
            status: "active",
            ...hashPassword(ownerPassword)
          })
          .select("id")
          .single();

        if (ownerError) {
          return NextResponse.json({ error: ownerError.message }, { status: 400 });
        }

        payload.owner_id = ownerUser.id;
      }
    }
  }

  if (collection === "transactions") {
    const amount = transactionAmount(payload);

    if (!payload.amount && amount) {
      payload.amount = amount;
    }

    if (payload.points_delta === undefined || payload.points_delta === null) {
      payload.points_delta = await pointsForTransaction(supabase, payload);
    }

    payload.transaction_code = payload.transaction_code || `TX-${Date.now()}-${secureToken(5)}`.toUpperCase();
  }

  const permission = await assertCanWrite(supabase, auth.user, config, payload, id);
  if (permission.error) {
    return NextResponse.json({ error: permission.error }, { status: permission.status });
  }

  if (collection === "users") {
    if (!isSuperAdmin(auth.user)) {
      return NextResponse.json({ error: "Chi admin moi co quyen quan ly nguoi dung" }, { status: 403 });
    }

    if (mode === "post" && normalizeRole(payload.role) === "super_admin") {
      return NextResponse.json({ error: "Khong the tao them tai khoan admin tu man hinh nay" }, { status: 403 });
    }

    if (mode === "patch") {
      const { data: targetUser, error: targetError } = await supabase
        .from("member_users")
        .select("id,role")
        .eq("id", id)
        .maybeSingle();

      if (targetError || !targetUser) {
        return NextResponse.json({ error: "Tai khoan khong ton tai" }, { status: 404 });
      }

      if (isSuperAdmin(targetUser.role)) {
        const password = String(body.password || "").trim();

        if (!password) {
          return NextResponse.json({ error: "Tai khoan admin chi duoc doi mat khau" }, { status: 403 });
        }

        Object.keys(payload).forEach((key) => delete payload[key]);
        Object.assign(payload, hashPassword(password));
      }
    }

    const userPayload = prepareUserPayload(body, payload, mode);
    if (mode === "post" && !userPayload.password_hash) {
      Object.assign(userPayload, hashPassword("Owner@123"));
    }

    delete userPayload.password;
    Object.assign(payload, userPayload);
  }

  if (collection === "storeUsers") {
    payload.role = normalizeRole(payload.role || "store_owner");
  }

  if (collection === "customers" && mode === "post") {
    const account = await ensureCustomerUser(supabase, payload, body);
    if (account.error) {
      return NextResponse.json({ error: account.error }, { status: account.status });
    }
  }

  if (collection === "customers" && mode === "patch") {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id,user_id")
      .eq("id", id)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Khong tim thay ho so khach hang" }, { status: 404 });
    }

    const sync = await syncCustomerUser(supabase, customer, payload);
    if (sync.error) {
      return NextResponse.json({ error: sync.error }, { status: sync.status });
    }
  }

  let previousTransaction = null;
  if (mode === "patch" && collection === "transactions") {
    const { data: previous } = await supabase
      .from(config.table)
      .select("id,customer_id,shop_id,amount,points_delta")
      .eq("id", id)
      .maybeSingle();

    previousTransaction = previous;
  }

  const { data, error } = await runMutation(supabase, config, mode, payload, id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (collection === "customers" && mode === "post") {
    const token = secureToken();
    const cardNumber = `MC${String(data.shop_id).padStart(3, "0")}${String(data.id).padStart(6, "0")}`;
    const { data: lowestLevel } = await supabase
      .from("membership_levels")
      .select("name,min_points,min_spend,status")
      .eq("shop_id", data.shop_id)
      .eq("status", "active")
      .order("min_points", { ascending: true })
      .order("min_spend", { ascending: true })
      .limit(1)
      .maybeSingle();

    await runMutation(supabase, resources.cards, "post", {
      customer_id: data.id,
      shop_id: data.shop_id,
      card_number: cardNumber,
      secure_token: token,
      qr_payload: publicMemberPath(token),
      points: 0,
      tier: lowestLevel?.name || "Member",
      total_spend: 0,
      status: "active"
    });
  }

  if (collection === "storeUsers") {
    await supabase
      .from("member_users")
      .update({ role: "owner" })
      .eq("id", data.user_id);

    const { data: shop } = await supabase
      .from("shops")
      .select("id,owner_id")
      .eq("id", data.store_id)
      .maybeSingle();

    if (shop && !shop.owner_id) {
      await supabase
        .from("shops")
        .update({ owner_id: data.user_id })
        .eq("id", data.store_id);
    }
  }

  if (collection === "shops" && data.owner_id) {
    await supabase
      .from("member_users")
      .update({ role: "owner" })
      .eq("id", data.owner_id);

    await supabase
      .from("store_users")
      .upsert({
        store_id: data.id,
        user_id: data.owner_id,
        role: "store_owner"
      }, { onConflict: "store_id,user_id" });
  }

  if (collection === "transactions") {
    const movedCard =
      previousTransaction &&
      (previousTransaction.customer_id !== data.customer_id || previousTransaction.shop_id !== data.shop_id);

    if (movedCard) {
      await applyTransactionToCard(supabase, { ...previousTransaction, amount: 0, points_delta: 0 }, previousTransaction);
      await applyTransactionToCard(supabase, data);
    } else {
      await applyTransactionToCard(supabase, data, previousTransaction);
    }
  }

  return NextResponse.json({ row: data });
}

async function deleteResource(request, params) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  if (!supabase) {
    return NextResponse.json({ error: "Server chua cau hinh Supabase." }, { status: 500 });
  }

  const auth = await requireMemberUser(request, supabase);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { collection } = await params;
  const config = resources[collection];
  if (!config) {
    return NextResponse.json({ error: "Tai nguyen khong hop le" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Thieu id ban ghi" }, { status: 400 });
  }

  const permission = await assertCanWrite(supabase, auth.user, config, {}, id);
  if (permission.error) {
    return NextResponse.json({ error: permission.error }, { status: permission.status });
  }

  if (collection === "users") {
    const { data: targetUser, error: targetError } = await supabase
      .from("member_users")
      .select("id,role")
      .eq("id", id)
      .maybeSingle();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Tai khoan khong ton tai" }, { status: 404 });
    }

    if (isSuperAdmin(targetUser.role)) {
      return NextResponse.json({ error: "Khong the xoa tai khoan admin" }, { status: 403 });
    }
  }

  let deletedCustomerUserId = null;
  if (collection === "customers") {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id,user_id")
      .eq("id", id)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Khong tim thay ho so khach hang" }, { status: 404 });
    }

    deletedCustomerUserId = customer.user_id;
  }

  let previousTransaction = null;
  if (collection === "transactions") {
    const { data: previous } = await supabase
      .from(config.table)
      .select("id,customer_id,shop_id,amount,points_delta")
      .eq("id", id)
      .maybeSingle();

    previousTransaction = previous;
  }

  const { error } = await supabase.from(config.table).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (previousTransaction) {
    await applyTransactionToCard(supabase, { ...previousTransaction, amount: 0, points_delta: 0 }, previousTransaction);
  }

  if (deletedCustomerUserId) {
    const { count } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", deletedCustomerUserId);

    if (!count) {
      await supabase
        .from("member_users")
        .delete()
        .eq("id", deletedCustomerUserId)
        .eq("role", "customer");
    }
  }

  return NextResponse.json({ ok: true, id });
}

export async function POST(request, context) {
  return writeResource(request, context.params, "post");
}

export async function PATCH(request, context) {
  return writeResource(request, context.params, "patch");
}

export async function DELETE(request, context) {
  return deleteResource(request, context.params);
}

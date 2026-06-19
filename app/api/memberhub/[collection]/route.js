import { hashPassword, requireMemberUser } from "@/lib/memberhub/auth";
import { isCustomer, isStoreOwner, isSuperAdmin, normalizeRole, toLegacyRole } from "@/lib/memberhub/access";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

const resources = {
  shops: {
    table: "shops",
    fields: ["name", "slug", "address", "phone", "email", "description", "owner_id", "status"],
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
    fields: ["shop_id", "name", "min_points", "min_spend", "discount_percent", "benefits", "status"],
    needsShop: true
  },
  cards: {
    table: "membership_cards",
    fields: ["customer_id", "shop_id", "card_number", "qr_payload", "points", "tier", "total_spend", "expires_at", "status"],
    needsShop: true
  },
  transactions: {
    table: "transactions",
    fields: ["customer_id", "shop_id", "service_id", "price", "discount", "tax", "amount", "points_delta", "note"],
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
  "discount_percent",
  "discount_amount",
  "discount",
  "tax",
  "amount",
  "points_delta"
]);

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

  if (config.needsShop && !payload.shop_id) {
    const fallbackShopId = await defaultShopId(supabase, auth.user);
    if (fallbackShopId) {
      payload.shop_id = fallbackShopId;
    }
  }

  if (config.fields.includes("slug") && !payload.slug && payload.name) {
    payload.slug = slugify(payload.name);
  }

  if (collection === "cards" && !payload.qr_payload && payload.card_number) {
    payload.qr_payload = `memberhub://card/${payload.card_number}`;
  }

  if (collection === "shops" && !payload.owner_id && isStoreOwner(auth.user)) {
    payload.owner_id = auth.user.id;
  }

  if (collection === "transactions") {
    const amount = transactionAmount(payload);

    if (!payload.amount && amount) {
      payload.amount = amount;
    }

    if (payload.points_delta === undefined || payload.points_delta === null) {
      payload.points_delta = Math.floor(Number(payload.amount || 0) / 10000);
    }
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

  if (collection === "customers" && mode === "post" && !payload.user_id && payload.email) {
    const email = String(payload.email || "").trim().toLowerCase();
    const { data: existingUser } = await supabase
      .from("member_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser?.id) {
      payload.user_id = existingUser.id;
    } else {
      const passwordPayload = hashPassword(String(body.password || "").trim() || "Customer@123");
      const { data: customerUser, error: customerUserError } = await supabase
        .from("member_users")
        .insert({
          name: payload.name || email,
          email,
          role: "customer",
          status: "active",
          phone: payload.phone || null,
          ...passwordPayload
        })
        .select("id")
        .single();

      if (customerUserError) {
        return NextResponse.json({ error: customerUserError.message }, { status: 400 });
      }

      payload.user_id = customerUser.id;
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

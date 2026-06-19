export const roleAliases = {
  admin: "super_admin",
  super_admin: "super_admin",
  owner: "store_owner",
  store_owner: "store_owner",
  customer: "customer"
};

export const legacyRoles = {
  super_admin: "admin",
  store_owner: "owner",
  customer: "customer"
};

export function normalizeRole(role) {
  return roleAliases[String(role || "").trim()] || "customer";
}

export function toLegacyRole(role) {
  return legacyRoles[normalizeRole(role)] || "customer";
}

export function isSuperAdmin(userOrRole) {
  return normalizeRole(userOrRole?.role || userOrRole) === "super_admin";
}

export function isStoreOwner(userOrRole) {
  return normalizeRole(userOrRole?.role || userOrRole) === "store_owner";
}

export function isCustomer(userOrRole) {
  return normalizeRole(userOrRole?.role || userOrRole) === "customer";
}

export function roleMatches(actual, expected) {
  return normalizeRole(actual) === normalizeRole(expected);
}

export function dashboardPathFor(user, data = null) {
  const role = normalizeRole(user?.role);

  if (role === "super_admin") return "/admin";

  if (role === "store_owner") {
    const shop = data?.shops?.[0];
    return shop?.slug ? `/${shop.slug}` : "/";
  }

  const customer = data?.customers?.[0];
  const shop = data?.shops?.find((item) => item.id === customer?.shop_id) || data?.shops?.[0];

  if (shop?.slug && customer?.slug) {
    return `/${shop.slug}/${customer.slug}`;
  }

  return "/";
}

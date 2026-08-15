"use client";

import {
  BadgePercent,
  Bell,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Globe2,
  LayoutDashboard,
  ListFilter,
  Lock,
  Loader2,
  LockKeyhole,
  LogOut,
  Moon,
  Plus,
  QrCode,
  ReceiptText,
  RefreshCw,
  ScanLine,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Unlock,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { createTranslator as createNextIntlTranslator, NextIntlClientProvider } from "next-intl";
import { dashboardPathFor, isCustomer, isStoreOwner, isSuperAdmin, normalizeRole } from "@/lib/memberhub/access";
import { defaultLocale, getMessagesForLocale, normalizeLocale } from "@/lib/memberhub/i18n";
import { supabaseClient } from "@/lib/supabaseClient";
import { normalizeRoutePath } from "@/lib/memberhub/slug";
import { subscriptionPlanLimits } from "@/lib/memberhub/subscriptionPlans";
import { createTranslator, locales } from "@/messages/memberhub";

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const appAliasPath = "/HoangCasterMemberHub";
const bootstrapRequests = new Map();

const navItems = {
  super_admin: [
    ["overview", "nav.overview", LayoutDashboard],
    ["shops", "nav.shops", Building2],
    ["reports", "nav.reports", FileText],
    ["notifications", "nav.notifications", Bell],
    ["logs", "nav.logs", ShieldCheck],
    ["settings", "nav.settings", Settings]
  ],
  store_owner: [
    ["overview", "nav.overview", LayoutDashboard],
    ["customers", "nav.customers", UserRound],
    ["services", "nav.services", Scissors],
    ["requests", "nav.serviceRequests", ReceiptText],
    ["promotions", "nav.promotions", BadgePercent],
    ["reports", "nav.reports", FileText],
    ["notifications", "nav.notifications", Bell],
    ["settings", "nav.settings", Settings]
  ],
  customer: [
    ["cards", "nav.cards", CreditCard],
    ["services", "nav.services", Scissors],
    ["requests", "nav.serviceRequests", ReceiptText],
    ["transactions", "nav.transactions", ReceiptText],
    ["promotions", "nav.promotions", BadgePercent],
    ["notifications", "nav.notifications", Bell],
    ["profile", "nav.profile", UserRound]
  ]
};

const tableMap = {
  shops: "shops",
  shop: "shops",
  storeUsers: "storeUsers",
  users: "users",
  customers: "customers",
  services: "services",
  requests: "serviceRequests",
  cards: "cards",
  levels: "levels",
  transactions: "transactions",
  promotions: "promotions",
  logs: "activityLogs",
  notifications: "notifications",
  settings: "settings"
};

const roleKeys = {
  super_admin: "app.admin",
  store_owner: "app.owner",
  customer: "app.customer"
};

const avatarMaxBytes = 900 * 1024;

function money(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateText(value) {
  if (!value) return "-";
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${Number(match[3])}/${Number(match[2])}/${match[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function subscriptionStatus(row = {}) {
  if (row.subscription_status === "suspended" || row.status === "locked") return "suspended";
  const remaining = row.remaining_days ?? daysUntil(row.subscription_end_date);
  if (remaining === null || remaining === undefined) return row.subscription_status || "active";
  if (remaining <= 0) return "expired";
  if (remaining <= 30) return "expiring";
  return "active";
}

function subscriptionLabel(t, status) {
  return {
    active: t("common.active"),
    expiring: t("common.expiring"),
    expired: t("common.expired"),
    suspended: t("common.suspended")
  }[status] || status || "-";
}

function planLabel(t, value) {
  return {
    starter: t("subscription.starter"),
    standard: t("subscription.standard"),
    premium: t("subscription.premium")
  }[value] || value || "-";
}

function planOptionLabel(t, value) {
  const limits = subscriptionPlanLimits(value);
  if (limits.customerLimit === null) return `${planLabel(t, value)} — ∞ KH / ∞ DV / ∞ KM`;
  return `${planLabel(t, value)} — ${limits.customerLimit} KH / ${limits.serviceLimit} DV / ${limits.promotionLimit} KM`;
}

function statusLabel(t, value) {
  return {
    active: t("common.active"),
    inactive: t("common.inactive"),
    locked: t("common.locked"),
    expiring: t("common.expiring"),
    expired: t("common.expired"),
    suspended: t("common.suspended"),
    read: t("common.read"),
    unread: t("common.unread"),
    pending: t("request.pending"),
    confirmed: t("request.confirmed"),
    rejected: t("request.rejected"),
    completed: t("request.completed"),
    cancelled: t("request.cancelled")
  }[value] || value || "-";
}

function genderLabel(t, value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "-";

  return {
    female: t("common.female"),
    male: t("common.male"),
    other: t("common.other")
  }[normalized] || value;
}

function displayAccountName(user, t) {
  if (isSuperAdmin(user)) return t("app.admin");
  return user?.name || "-";
}

function avatarUrlFor(user, fallback = null) {
  return user?.avatar_url || user?.avatarUrl || fallback?.avatar_url || fallback?.avatarUrl || "";
}

function initialFor(user, fallback = "M") {
  const text = user?.name || user?.email || fallback;
  return String(text).trim().charAt(0).toUpperCase() || fallback;
}

function remainingText(t, value) {
  if (value === null || value === undefined) return "-";
  if (Number(value) <= 0) return t("common.expired");
  return `${value} ${t("common.days")}`;
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsForInput(dateValue, months) {
  const date = new Date(dateValue || todayInputDate());
  date.setMonth(date.getMonth() + Number(months || 1));
  return date.toISOString().slice(0, 10);
}

function monthsBetweenForInput(startValue, endValue) {
  if (!startValue || !endValue) return "1";
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return "1";

  const wholeMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  const needsPartialMonth = end.getDate() > start.getDate() ? 1 : 0;
  return String(Math.max(1, wholeMonths + needsPartialMonth));
}

function normalizeInputDate(value, fallback = todayInputDate()) {
  if (!value) return fallback;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
}

function generatePassword() {
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const suffix = Array.from(randomBytes.slice(0, 6), (byte) => chars[byte % chars.length]).join("");
  const digits = 1000 + ((randomBytes[6] * 256 + randomBytes[7]) % 9000);
  return `Mh@${suffix}${digits}`;
}

function userName(user) {
  return [user?.name, user?.email].filter(Boolean).join(" - ") || "-";
}

function currentOwner(shop, data = {}) {
  return (data.users || []).find((item) => Number(item.id) === Number(shop?.owner_id));
}

function storeUserFor(shop, user, data = {}) {
  return (data.storeUsers || []).find((item) => Number(item.store_id) === Number(shop?.id) && Number(item.user_id) === Number(user?.id));
}

function ownerCandidates(data = {}, currentShop = null) {
  const assignedUserIds = new Set([
    ...(data.storeUsers || []).map((item) => Number(item.user_id)),
    ...(data.shops || []).map((shop) => Number(shop.owner_id)).filter(Boolean)
  ]);
  if (currentShop?.owner_id) assignedUserIds.delete(Number(currentShop.owner_id));

  return (data.users || []).filter((item) => {
    if (isSuperAdmin(item) || isCustomer(item)) return false;
    return normalizeRole(item.role) === "store_owner" || !assignedUserIds.has(Number(item.id));
  });
}

function withBasePath(path) {
  if (!appBasePath || !path.startsWith("/")) return path;
  if (path === appBasePath || path.startsWith(`${appBasePath}/`)) return path;
  return `${appBasePath}${path}`;
}

function withoutBasePath(path) {
  if (!appBasePath) return path;
  if (path === appBasePath) return "/";
  if (path.startsWith(`${appBasePath}/`)) return path.slice(appBasePath.length) || "/";
  return path;
}

function appRoutePath(path) {
  const pathname = withoutBasePath(path);
  return pathname === appAliasPath ? "/" : pathname;
}

async function api(path, token, options = {}) {
  const response = await fetch(withBasePath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || payload.message || "Unable to load data.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function loadBootstrapData(token) {
  if (!bootstrapRequests.has(token)) {
    const request = api("/api/app-data", token)
      .then((payload) => {
        const { currentUser, ...data } = payload;
        if (!currentUser) throw new Error("Unable to load the current session.");
        return { user: currentUser, data };
      })
      .catch((error) => {
        bootstrapRequests.delete(token);
        throw error;
      });

    bootstrapRequests.set(token, request);
  }

  return bootstrapRequests.get(token);
}

async function saveResource(collection, token, row, method) {
  const payload = await api(`/api/memberhub/${collection}`, token, {
    method,
    body: JSON.stringify(row)
  });

  return payload.row || row;
}

function readAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (!file.type?.startsWith("image/")) {
      reject(new Error("Vui lòng chọn đúng tệp hình ảnh."));
      return;
    }

    if (file.size > avatarMaxBytes) {
      reject(new Error("Ảnh đại diện nên nhỏ hơn 900KB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
    reader.readAsDataURL(file);
  });
}

function readStored(key, fallback) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
}

function expectedRoleForPath() {
  if (typeof window === "undefined") return null;

  const pathname = appRoutePath(window.location.pathname);
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;
  if (segments[0] === "admin") return "super_admin";
  return segments.length > 1 ? "customer" : "store_owner";
}

function currentPathMatchesUser(user, data) {
  if (typeof window === "undefined") return true;

  const expectedRole = expectedRoleForPath();
  if (!expectedRole) return true;
  if (normalizeRole(user.role) !== expectedRole) return false;
  if (expectedRole === "super_admin") return appRoutePath(window.location.pathname).startsWith("/admin");

  const currentPath = normalizeRoutePath(appRoutePath(window.location.pathname)) || "/";
  const dashboardPath = normalizeRoutePath(dashboardPathFor(user, data)) || "/";
  return currentPath === dashboardPath;
}

export function MemberHubApp() {
  const [locale, setLocale] = useState(defaultLocale);
  const [localeReady, setLocaleReady] = useState(false);
  const messages = useMemo(() => getMessagesForLocale(locale), [locale]);

  useEffect(() => {
    setLocale(normalizeLocale(readStored("memberhub_locale", defaultLocale)));
    setLocaleReady(true);
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MemberHubAppContent locale={locale} localeReady={localeReady} setLocale={setLocale} />
    </NextIntlClientProvider>
  );
}

function MemberHubAppContent({ locale, localeReady, setLocale }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("overview");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [toast, setToast] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("polling");
  const [onlineCustomerUserIds, setOnlineCustomerUserIds] = useState([]);
  const realtimeRefreshRef = useRef(false);

  const fallbackT = useMemo(() => createTranslator(locale), [locale]);
  const intlT = useMemo(() => {
    return createNextIntlTranslator({
      locale,
      messages: getMessagesForLocale(locale)
    });
  }, [locale]);
  const t = (key, fallback) => {
    try {
      return intlT(key);
    } catch {
      return fallbackT(key, fallback);
    }
  };

  useEffect(() => {
    let ignore = false;
    setTheme(readStored("memberhub_theme", "light"));
    const savedToken = localStorage.getItem("memberhub_token") || "";
    if (!savedToken) {
      setBooting(false);
      return;
    }

    loadBootstrapData(savedToken)
      .then(({ user: sessionUser, data: nextData }) => {
        if (ignore) return;

        const nextUser = { ...sessionUser, role: normalizeRole(sessionUser.role) };
        if (!currentPathMatchesUser(nextUser, nextData)) {
          setToken("");
          return;
        }

        setToken(savedToken);
        setUser(nextUser);
        setLocale(normalizeLocale(readStored("memberhub_locale", nextUser.locale || defaultLocale)));
        const availableViews = (navItems[normalizeRole(nextUser.role)] || navItems.customer).map(([id]) => id);
        const defaultView = isCustomer(nextUser) ? "cards" : "overview";
        const savedView = readStored(`memberhub_last_view_${normalizeRole(nextUser.role)}`, defaultView);
        setView(availableViews.includes(savedView) ? savedView : defaultView);
        setData(nextData);
      })
      .catch((error) => {
        if (ignore) return;
        if (error?.status === 401 || error?.status === 403) {
          localStorage.removeItem("memberhub_token");
          setToken("");
        } else {
          setStatus(error.message || t("common.actionFailed"));
        }
      })
      .finally(() => {
        if (ignore) return;
        setBooting(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("memberhub_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`memberhub_last_view_${normalizeRole(user.role)}`, view);
  }, [user, view]);

  useEffect(() => {
    if (!localeReady) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locales.find((item) => item.id === locale)?.dir || "ltr";
    localStorage.setItem("memberhub_locale", locale);
    document.cookie = `memberhub_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale, localeReady]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    let active = true;
    let debounceTimer = null;
    let followUpTimer = null;

    async function syncLatestData(source = "polling") {
      if (!active || realtimeRefreshRef.current || document.visibilityState === "hidden") return;
      realtimeRefreshRef.current = true;
      if (source === "realtime") setRealtimeStatus("syncing");
      try {
        const nextData = await api("/api/app-data", token);
        if (active) setData(nextData);
        if (active && source === "realtime") setRealtimeStatus("connected");
      } catch {
        if (active) setRealtimeStatus("polling");
      } finally {
        realtimeRefreshRef.current = false;
      }
    }

    function scheduleRealtimeSync() {
      clearTimeout(debounceTimer);
      clearTimeout(followUpTimer);
      debounceTimer = setTimeout(() => syncLatestData("realtime"), 300);
      // Transaction and request events can arrive just before the related card update.
      followUpTimer = setTimeout(() => syncLatestData("realtime"), 1400);
    }

    const channel = supabaseClient
      ?.channel(`memberhub-live-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, scheduleRealtimeSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, scheduleRealtimeSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, scheduleRealtimeSync)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "membership_cards" }, scheduleRealtimeSync)
      .subscribe((status) => {
        if (!active) return;
        setRealtimeStatus(status === "SUBSCRIBED" ? "connected" : "polling");
      });

    const pollTimer = setInterval(() => syncLatestData("polling"), 20000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncLatestData("polling");
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
      clearTimeout(followUpTimer);
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) supabaseClient?.removeChannel(channel);
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!supabaseClient || !token || !user || !data) return;
    if (!isStoreOwner(user) && !isCustomer(user)) return;

    const shopIds = [...new Set((data.shops || []).map((shop) => Number(shop.id)).filter(Boolean))];
    if (!shopIds.length) return;

    const channels = [];
    const presenceKey = `${user.id}-${crypto.randomUUID()}`;
    const syncOwnerPresence = () => {
      if (!isStoreOwner(user)) return;
      const ids = new Set();
      channels.forEach((channel) => {
        Object.values(channel.presenceState()).flat().forEach((presence) => {
          if (presence.role === "customer" && presence.user_id) ids.add(Number(presence.user_id));
        });
      });
      setOnlineCustomerUserIds([...ids]);
    };

    shopIds.forEach((shopId) => {
      const channel = supabaseClient.channel(`memberhub-presence-shop-${shopId}`, {
        config: { presence: { key: presenceKey } }
      });
      channels.push(channel);
      channel
        .on("presence", { event: "sync" }, syncOwnerPresence)
        .on("presence", { event: "join" }, syncOwnerPresence)
        .on("presence", { event: "leave" }, syncOwnerPresence)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && isCustomer(user)) {
            await channel.track({ user_id: Number(user.id), role: "customer", online_at: new Date().toISOString() });
          }
        });
    });

    return () => {
      channels.forEach((channel) => supabaseClient.removeChannel(channel));
      setOnlineCustomerUserIds([]);
    };
  }, [token, user?.id, data?.shops]);

  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setStatus("");

    try {
      const payload = await api("/api/auth/login", "", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password")
        })
      });

      localStorage.setItem("memberhub_token", payload.token);
      const nextUser = { ...payload.user, role: normalizeRole(payload.user.role) };
      const nextLocale = normalizeLocale(locale);
      const nextData = await api("/api/app-data", payload.token);

      setToken(payload.token);
      setUser(nextUser);
      setLocale(nextLocale);
      const availableViews = (navItems[normalizeRole(nextUser.role)] || navItems.customer).map(([id]) => id);
      const defaultView = isCustomer(nextUser) ? "cards" : "overview";
      const savedView = readStored(`memberhub_last_view_${normalizeRole(nextUser.role)}`, defaultView);
      setView(availableViews.includes(savedView) ? savedView : defaultView);
      setData(nextData);
      router.replace(dashboardPathFor(nextUser, nextData));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    bootstrapRequests.delete(token);
    localStorage.removeItem("memberhub_token");
    setToken("");
    setUser(null);
    setData(null);
    setView("overview");
    router.replace("/");
  }

  async function refreshData() {
    if (!token || refreshing) return;
    setRefreshing(true);
    try {
      setData(await api("/api/app-data", token));
      setToast(t("toast.refreshed"));
    } catch (error) {
      setToast(error.message || t("common.actionFailed"));
    } finally {
      setRefreshing(false);
    }
  }

  async function changePassword({ currentPassword, newPassword }) {
    await api("/api/auth/change-password", token, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setToast(t("toast.passwordChanged"));
    setPasswordModalOpen(false);
  }

  async function changeAvatar(avatarUrl) {
    const payload = await api("/api/me", token, {
      method: "PATCH",
      body: JSON.stringify({ avatar_url: avatarUrl || null })
    });
    const nextUser = { ...payload.user, role: normalizeRole(payload.user.role) };
    setUser(nextUser);
    setData(await api("/api/app-data", token));
    setToast(t("toast.avatarChanged"));
    setAvatarModalOpen(false);
  }

  async function addLocalRow(collection, row) {
    const savedRow = await saveResource(collection, token, row, "POST");
    if (collection === "users") {
      // A newly-created user is already returned by the mutation. Avoid
      // reloading every dashboard table just to display this one new row.
      setData((current) => ({
        ...current,
        users: [...(current?.users || []), { ...savedRow, role: normalizeRole(savedRow.role) }]
      }));
    } else {
      setData(await api("/api/app-data", token));
    }
    setToast(t("toast.saved"));
    return savedRow;
  }

  async function updateLocalRow(collection, row) {
    const savedRow = await saveResource(collection, token, row, "PATCH");
    setData(await api("/api/app-data", token));
    setToast(t("toast.saved"));
    return savedRow;
  }

  async function deleteLocalRow(collection, row) {
    await saveResource(collection, token, { id: row.id }, "DELETE");
    setData(await api("/api/app-data", token));
    setToast(t("toast.deleted"));
  }

  async function toggleLockRow(collection, row) {
    const nextStatus = row.status === "locked" ? "active" : "locked";
    await saveResource(collection, token, { id: row.id, status: nextStatus }, "PATCH");
    setData(await api("/api/app-data", token));
    setToast(t("toast.saved"));
  }

  if (booting) {
    return <AppBootSkeleton t={t} />;
  }

  if (!user) {
    return (
      <LoginScreen
        loading={loading}
        locale={locale}
        status={status}
        t={t}
        theme={theme}
        setLocale={setLocale}
        setTheme={setTheme}
        onSubmit={login}
      />
    );
  }

  const items = navItems[normalizeRole(user.role)] || navItems.customer;
  const unreadNotifications = (data?.notifications || []).filter((item) => item.status !== "read").length;
  const presenceData = { ...data, onlineCustomerUserIds };
  const navigateTo = (nextView) => {
    if (items.some(([id]) => id === nextView)) setView(nextView);
  };

  return (
    <div className="mh-shell">
      <aside className="mh-sidebar">
        <Brand
          role={user.role}
          shop={isSuperAdmin(user) ? null : data?.shops?.[0]}
          t={t}
        />
        <nav className="mh-nav" aria-label="Workspace">
          {items.map(([id, labelKey, Icon]) => (
            <button
              className={view === id ? "active" : ""}
              key={id}
              onClick={() => navigateTo(id)}
              type="button"
              title={t(labelKey)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(labelKey)}</span>
              {id === "notifications" && unreadNotifications > 0 ? (
                <span className="mh-nav-count" aria-label={`${unreadNotifications} ${t("command.unread")}`}>
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      <section className="mh-workspace">
        <header className="mh-topbar">
          <div>
            <p className="mh-breadcrumb">{t("common.breadcrumbHome")} / {t(getViewTitleKey(view))}</p>
            <h1>{t(getViewTitleKey(view))}</h1>
          </div>
          <div className="mh-account">
            <button className="mh-command-trigger" type="button" onClick={() => setCommandOpen(true)} title={t("command.open")}>
              <Search size={17} aria-hidden="true" />
              <span>{t("command.search")}</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="mh-icon-toggle" disabled={refreshing} type="button" onClick={refreshData} title={t("command.refresh")}>
              <RefreshCw className={refreshing ? "mh-spin" : ""} size={17} aria-hidden="true" />
            </button>
            <span className={`mh-live-status ${realtimeStatus}`} title={t(`realtime.${realtimeStatus}`)}>
              <i aria-hidden="true" />
              <span>{t(realtimeStatus === "connected" ? "realtime.live" : "realtime.syncing")}</span>
            </span>
            {isStoreOwner(user) || isCustomer(user) ? (
              <LanguageSwitcher locale={locale} setLocale={setLocale} t={t} />
            ) : null}
            <ThemeToggle setTheme={setTheme} t={t} theme={theme} />
            <button className="mh-user-chip" type="button" onClick={() => setAvatarModalOpen(true)} title={t("avatar.change")}>
              <UserAvatar user={user} />
              <span>{displayAccountName(user, t)}</span>
              <Camera size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPasswordModalOpen(true)} title={t("auth.changePassword")}>
              <Lock size={17} aria-hidden="true" />
              <span>{t("auth.changePassword")}</span>
            </button>
            <button type="button" onClick={logout} title={t("auth.logout")}>
              <LogOut size={17} aria-hidden="true" />
              <span>{t("auth.logout")}</span>
            </button>
          </div>
        </header>

        <main className="mh-view">
          {data ? (
            <DashboardView
              addLocalRow={addLocalRow}
              deleteLocalRow={deleteLocalRow}
              toggleLockRow={toggleLockRow}
              updateLocalRow={updateLocalRow}
              data={presenceData}
              onNavigate={navigateTo}
              t={t}
              user={user}
              view={view}
              onChangeAvatar={() => setAvatarModalOpen(true)}
            />
          ) : null}
          {!data ? <EmptyState t={t} /> : null}
        </main>
      </section>

      {passwordModalOpen ? (
        <PasswordModal
          onClose={() => setPasswordModalOpen(false)}
          onSubmit={changePassword}
          t={t}
        />
      ) : null}
      {avatarModalOpen ? (
        <AvatarModal
          customer={data?.customers?.find((item) => Number(item.user_id) === Number(user.id))}
          onClose={() => setAvatarModalOpen(false)}
          onSubmit={changeAvatar}
          t={t}
          user={user}
        />
      ) : null}
      {toast ? <div className="mh-toast"><Check size={16} />{toast}</div> : null}
      {commandOpen ? (
        <CommandPalette
          data={data}
          items={items}
          onClose={() => setCommandOpen(false)}
          onNavigate={(nextView) => {
            navigateTo(nextView);
            setCommandOpen(false);
          }}
          t={t}
          unreadNotifications={unreadNotifications}
        />
      ) : null}
    </div>
  );
}

function CommandPalette({ data, items, onClose, onNavigate, t, unreadNotifications }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = items.filter(([, labelKey]) => t(labelKey).toLocaleLowerCase().includes(normalizedQuery));
  const searchResults = useMemo(() => buildGlobalSearchResults(data, normalizedQuery, t), [data, normalizedQuery, t]);
  const destinations = normalizedQuery
    ? [...filteredItems.map(([id]) => id), ...searchResults.map((result) => result.view)]
    : items.map(([id]) => id);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    inputRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="mh-command-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="mh-command" role="dialog" aria-modal="true" aria-label={t("command.title")}>
        <div className="mh-command-search">
          <Search size={19} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => destinations.length ? (index + 1) % destinations.length : 0);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => destinations.length ? (index - 1 + destinations.length) % destinations.length : 0);
              }
              if (event.key === "Enter" && destinations[activeIndex]) onNavigate(destinations[activeIndex]);
            }}
            placeholder={t("command.placeholder")}
            aria-label={t("command.search")}
            aria-activedescendant={destinations[activeIndex] ? `command-option-${activeIndex}` : undefined}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="mh-command-list">
          {!normalizedQuery ? (
            <>
              <p>{t("command.navigate")}</p>
              {items.map(([id, labelKey, Icon], index) => (
                <button className={activeIndex === index ? "is-active" : ""} id={`command-option-${index}`} key={id} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => onNavigate(id)}>
                  <span><Icon size={18} aria-hidden="true" />{t(labelKey)}</span>
                  {id === "notifications" && unreadNotifications > 0
                    ? <strong>{unreadNotifications}</strong>
                    : <ChevronRight size={16} aria-hidden="true" />}
                </button>
              ))}
            </>
          ) : (
            <>
              {filteredItems.length ? <p>{t("command.workspaces")}</p> : null}
              {filteredItems.map(([id, labelKey, Icon], index) => (
                <button className={activeIndex === index ? "is-active" : ""} id={`command-option-${index}`} key={`view:${id}`} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => onNavigate(id)}>
                  <span><Icon size={18} aria-hidden="true" />{t(labelKey)}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
              {searchResults.length ? <p>{t("command.dataResults")}</p> : null}
              {searchResults.map((result, index) => {
                const resultIndex = filteredItems.length + index;
                return (
                <button className={`mh-command-result ${activeIndex === resultIndex ? "is-active" : ""}`} id={`command-option-${resultIndex}`} key={result.key} type="button" onMouseEnter={() => setActiveIndex(resultIndex)} onClick={() => onNavigate(result.view)}>
                  <span>
                    <result.Icon size={18} aria-hidden="true" />
                    <span><b>{result.title}</b><small>{result.subtitle}</small></span>
                  </span>
                  <em>{result.kind}</em>
                </button>
                );
              })}
              {!filteredItems.length && !searchResults.length ? <div className="mh-command-empty">{t("command.empty")}</div> : null}
            </>
          )}
        </div>
        <footer><span>↑↓ {t("command.move")}</span><span>↵ {t("command.select")}</span></footer>
      </section>
    </div>
  );
}

function Brand({ t, role, shop }) {
  return (
    <div className="mh-brand">
      <LogoMark alt={shop?.name ? `${shop.name} ${t("shop.logo")}` : ""} src={shop?.logo_data_url} />
      <div>
        <strong>{t("app.name")}</strong>
        <span>{t(roleKeys[role] || "app.tagline")}</span>
      </div>
    </div>
  );
}

function LoginScreen({ loading, locale, status, t, theme, setLocale, setTheme, onSubmit }) {
  return (
    <main className="mh-auth">
      <section className="mh-auth-panel">
        <div className="mh-auth-brand">
          <LogoMark />
          <div>
            <p>{t("app.name")}</p>
            <h1>{t("auth.login")}</h1>
          </div>
        </div>
        <form className="mh-form" onSubmit={onSubmit}>
          <label>
            {t("auth.email")}
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            {t("auth.password")}
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <div className="mh-form-row compact">
            <label className="mh-check">
              <input name="remember" type="checkbox" defaultChecked />
              {t("auth.remember")}
            </label>
          </div>
          {status ? <div className="mh-alert">{status}</div> : null}
          <button className="mh-primary" disabled={loading} type="submit">
            {loading ? <Loader2 className="mh-spin" size={17} /> : <LockKeyhole size={17} />}
            {loading ? t("auth.signingIn") : t("auth.login")}
          </button>
        </form>
        <div className="mh-auth-tools">
          <LanguageSwitcher locale={locale} setLocale={setLocale} t={t} />
          <ThemeToggle setTheme={setTheme} t={t} theme={theme} />
        </div>
      </section>
    </main>
  );
}

function LogoMark({ alt = "", src = "" }) {
  const fallbackSrc = withBasePath("/assets/logo.png");

  return (
    <img
      className="mh-logo"
      src={src || fallbackSrc}
      alt={alt}
      aria-hidden={alt ? undefined : "true"}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = fallbackSrc;
      }}
    />
  );
}

function DashboardView({ addLocalRow, deleteLocalRow, toggleLockRow, updateLocalRow, view, user, data, t, onChangeAvatar, onNavigate }) {
  if (view === "overview") return <Overview data={data} onNavigate={onNavigate} t={t} user={user} />;
  if (view === "reports") return <Reports data={data} t={t} />;
  if (view === "scan") return <ScanView addLocalRow={addLocalRow} data={data} t={t} />;
  if (view === "profile") return <Profile data={data} onChangeAvatar={onChangeAvatar} t={t} updateLocalRow={updateLocalRow} user={user} />;
  if (view === "services" && isCustomer(user)) return <CustomerServices addLocalRow={addLocalRow} data={data} t={t} />;
  if (view === "requests") return <ServiceRequests data={data} isOwner={isStoreOwner(user)} t={t} updateLocalRow={updateLocalRow} />;
  if (view === "customers" && isStoreOwner(user)) {
    return (
      <CustomersWorkspace
        addLocalRow={addLocalRow}
        data={data}
        deleteLocalRow={deleteLocalRow}
        t={t}
        toggleLockRow={toggleLockRow}
        updateLocalRow={updateLocalRow}
      />
    );
  }

  const key = tableMap[view];
  const rows = data[key] || [];

  if (view === "cards" && isCustomer(user)) {
    return <CustomerCards cards={rows} data={data} t={t} />;
  }

  return (
    <ResourceTable
      addLocalRow={addLocalRow}
      canWrite={!isCustomer(user) && view !== "logs" && (view !== "storeUsers" || isSuperAdmin(user))}
      deleteLocalRow={deleteLocalRow}
      toggleLockRow={toggleLockRow}
      updateLocalRow={updateLocalRow}
      columns={getColumns(view, t, data)}
      collection={key}
      data={data}
      rows={rows}
      t={t}
      view={view}
    />
  );
}

function Overview({ data, onNavigate, t, user }) {
  const {
    transactions,
    customers,
    shops,
    revenue,
    points,
    newCustomers,
    topServices,
    activeShops,
    expiringShops,
    expiredShops,
    alerts,
    currentShop,
    revenueToday,
    revenueWeek,
    revenueMonth,
    revenueDailyComparison,
    revenueWeeklyComparison,
    revenueMonthlyComparison,
    pendingRequests,
    upcomingRequests
  } = useMemo(() => {
    const transactions = data.transactions ?? [];
    const cards = data.cards ?? [];
    const customers = data.customers ?? [];
    const shops = data.shops ?? [];

    const revenue = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const points = cards.reduce((sum, item) => sum + Number(item.points || 0), 0);
    const newCustomers = customers.filter((item) => {
      const created = new Date(item.created_at || Date.now());
      return Date.now() - created.getTime() < 1000 * 60 * 60 * 24 * 30;
    }).length;
    const topServices = rankBy(transactions, "service_name", "amount").slice(0, 5);
    const shopsWithSubscription = shops.map((shop) => ({
      ...shop,
      computed_subscription_status: subscriptionStatus(shop),
      computed_remaining_days: shop.remaining_days ?? daysUntil(shop.subscription_end_date)
    }));
    const activeShops = shopsWithSubscription.filter((shop) => shop.computed_subscription_status === "active").length;
    const expiringShops = shopsWithSubscription.filter((shop) => shop.computed_subscription_status === "expiring").length;
    const expiredShops = shopsWithSubscription.filter((shop) => shop.computed_subscription_status === "expired").length;
    const alerts = shopsWithSubscription
      .filter((shop) => shop.computed_subscription_status === "expired" || (shop.computed_remaining_days !== null && shop.computed_remaining_days <= 30))
      .sort((left, right) => Number(left.computed_remaining_days ?? 9999) - Number(right.computed_remaining_days ?? 9999))
      .slice(0, 8);
    const currentShop = isStoreOwner(user) ? shopsWithSubscription[0] : null;
    const revenueToday = sumRecent(transactions, 1);
    const revenueWeek = sumRecent(transactions, 7);
    const revenueMonth = sumRecent(transactions, 30);
    const revenueDailyComparison = compareRevenuePeriods(transactions, 1);
    const revenueWeeklyComparison = compareRevenuePeriods(transactions, 7);
    const revenueMonthlyComparison = compareRevenuePeriods(transactions, 30);
    const pendingRequests = (data.serviceRequests || []).filter((request) => request.status === "pending").length;
    const upcomingRequests = (data.serviceRequests || [])
      .filter((request) => request.status === "confirmed" && request.preferred_at && new Date(request.preferred_at).getTime() >= Date.now())
      .sort((left, right) => new Date(left.preferred_at).getTime() - new Date(right.preferred_at).getTime())
      .slice(0, 5);

    return { transactions, customers, shops, revenue, points, newCustomers, topServices, activeShops, expiringShops, expiredShops, alerts, currentShop, revenueToday, revenueWeek, revenueMonth, revenueDailyComparison, revenueWeeklyComparison, revenueMonthlyComparison, pendingRequests, upcomingRequests };
  }, [data, user]);

  const customerInsights = useMemo(
    () => buildCustomerInsights(transactions, customers),
    [transactions, customers]
  );

  return (
    <>
      <section className="mh-dashboard-intro">
        <div>
          <span>{t("dashboard.workspaceReady")}</span>
          <h2>{t("dashboard.welcomeBack").replace("{name}", displayAccountName(user, t))}</h2>
          <p>{t("dashboard.quickActionsCopy")}</p>
        </div>
        <div className="mh-quick-actions" aria-label={t("dashboard.quickActions")}>
          {(isSuperAdmin(user)
            ? [["shops", Building2, "nav.shops"], ["reports", FileText, "nav.reports"], ["notifications", Bell, "nav.notifications"]]
            : [["customers", UserRound, "nav.customers"], ["requests", ReceiptText, "nav.serviceRequests"], ["reports", FileText, "nav.reports"]]
          ).map(([target, Icon, label]) => (
            <button key={target} type="button" onClick={() => onNavigate(target)}>
              <Icon size={18} aria-hidden="true" />
              <span>{t(label)}</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <div className="mh-stats">
        {isSuperAdmin(user) ? (
          <>
            <Stat label={t("dashboard.shops")} value={shops.length} />
            <Stat label={t("dashboard.activeShops")} value={activeShops} />
            <Stat label={t("dashboard.expiringShops")} value={expiringShops} />
            <Stat label={t("dashboard.expiredShops")} value={expiredShops} />
            <Stat label={t("dashboard.customers")} value={customers.length} />
            <Stat label={t("dashboard.newCustomers")} value={newCustomers} />
            <Stat label={t("dashboard.transactions")} value={transactions.length} />
          </>
        ) : (
          <>
            <Stat label={currentShop?.name || t("shop.name")} value={currentShop?.computed_remaining_days === null ? "-" : `${currentShop?.computed_remaining_days ?? "-"} ${t("common.days")}`} />
            <Stat label={t("dashboard.customers")} value={customers.length} />
            <Stat comparison={revenueDailyComparison} label={t("reports.daily")} trendLabel={t("revenue.vsPreviousDay")} value={money(revenueToday)} />
            <Stat comparison={revenueWeeklyComparison} label={t("reports.weekly")} trendLabel={t("revenue.vsPreviousWeek")} value={money(revenueWeek)} />
            <Stat comparison={revenueMonthlyComparison} label={t("reports.monthly")} trendLabel={t("revenue.vsPreviousMonth")} value={money(revenueMonth)} />
            <Stat label={t("request.pending")} value={pendingRequests} />
          </>
        )}
      </div>

      {isSuperAdmin(user) ? (
        <section className="mh-card">
          <PanelTitle icon={Bell} title={t("dashboard.subscriptionAlerts")} />
          <div className="mh-alert-list">
            {alerts.map((shop) => (
              <div className="mh-alert-row" key={shop.id}>
                <strong>{shop.name}</strong>
                <span>{shop.computed_subscription_status === "expired" ? t("common.expired") : `${shop.computed_remaining_days} ${t("common.days")}`}</span>
                <StatusBadge t={t} value={shop.computed_subscription_status} />
              </div>
            ))}
            {!alerts.length ? <div className="mh-empty">{t("common.empty")}</div> : null}
          </div>
        </section>
      ) : null}

      {isStoreOwner(user) && currentShop?.computed_subscription_status === "expiring" ? (
        <div className="mh-alert warning">
          {t("dashboard.expiringNotice").replace("{days}", currentShop.computed_remaining_days)}
        </div>
      ) : null}
      {isStoreOwner(user) && currentShop?.computed_subscription_status === "expired" ? (
        <div className="mh-alert">{t("dashboard.expiredNotice")}</div>
      ) : null}

      {isStoreOwner(user) && currentShop ? (
        <div className="mh-grid two mh-owner-operations">
          <section className="mh-card">
            <PanelTitle icon={CreditCard} title={`${t("subscription.plan")}: ${planLabel(t, currentShop.subscription_plan)}`} />
            <PlanUsageRows currentShop={currentShop} customers={customers} data={data} t={t} />
          </section>
          <section className="mh-card">
            <PanelTitle icon={ReceiptText} title={t("nav.serviceRequests")} />
            <div className="mh-upcoming-list">
              {upcomingRequests.map((request) => (
                <div className="mh-upcoming-row" key={request.id}>
                  <div><strong>{request.customer_name}</strong><span>{request.service_name}</span></div>
                  <time>{new Date(request.preferred_at).toLocaleString("vi-VN")}</time>
                  <StatusBadge t={t} value={request.status} />
                </div>
              ))}
              {!upcomingRequests.length ? <div className="mh-empty">{t("common.empty")}</div> : null}
            </div>
          </section>
        </div>
      ) : null}

      {isStoreOwner(user) ? <CustomerInsights insights={customerInsights} t={t} /> : null}
      {isStoreOwner(user) ? <CustomerSegments insights={customerInsights} t={t} /> : null}

      <section className="mh-card mh-chart-card">
        <PanelTitle icon={FileText} title={t("dashboard.topServices")} />
        <BarChart rows={topServices} />
      </section>

      <section className="mh-card">
        <PanelTitle icon={ReceiptText} title={t("dashboard.recentTransactions")} />
        <ResourceTable
          columns={getColumns("transactions", t, data)}
          compact
          data={data}
          rows={transactions.slice(0, 6)}
          t={t}
          view="transactions"
        />
      </section>
    </>
  );
}

function CustomerInsights({ insights, t }) {
  const { activeLast30Days, averageOrderValue, repeatRate, rankedCustomers } = insights;

  return (
    <section className="mh-card mh-customer-insights">
      <div className="mh-insights-heading">
        <PanelTitle icon={UserRound} title={t("dashboard.customerInsights")} />
        <p>{t("dashboard.customerInsightsCopy")}</p>
      </div>

      <div className="mh-insight-metrics">
        <div><span>{t("dashboard.averageOrder")}</span><strong>{money(averageOrderValue)}</strong></div>
        <div><span>{t("dashboard.repeatRate")}</span><strong>{repeatRate}%</strong></div>
        <div><span>{t("dashboard.activeCustomers30")}</span><strong>{activeLast30Days}</strong></div>
        <div><span>{t("dashboard.knownCustomers")}</span><strong>{rankedCustomers.length}</strong></div>
      </div>

      <div className="mh-customer-ranking" role="list" aria-label={t("dashboard.topCustomersBySpend")}>
        {rankedCustomers.slice(0, 5).map((customer, index) => (
          <article className={index === 0 ? "is-leader" : ""} key={customer.key} role="listitem">
            <div className="mh-rank-number">{String(index + 1).padStart(2, "0")}</div>
            <div className="mh-rank-customer">
              <strong>{customer.name}</strong>
              <span>{customer.favoriteService || t("common.empty")}</span>
            </div>
            <div className="mh-rank-detail"><span>{t("dashboard.serviceUses")}</span><strong>{customer.visits}</strong></div>
            <div className="mh-rank-detail"><span>{t("dashboard.pointsEarned")}</span><strong>{customer.points.toLocaleString("vi-VN")}</strong></div>
            <div className="mh-rank-detail"><span>{t("dashboard.lastVisit")}</span><strong>{dateText(customer.lastVisit)}</strong></div>
            <div className="mh-rank-spend"><span>{t("dashboard.totalSpent")}</span><strong>{money(customer.totalSpend)}</strong></div>
          </article>
        ))}
        {!rankedCustomers.length ? <div className="mh-insights-empty">{t("dashboard.noCustomerInsights")}</div> : null}
      </div>
    </section>
  );
}

function CustomerSegments({ insights, t }) {
  const segmentDefinitions = [
    { id: "vip", title: t("segment.vip"), description: t("segment.vipCopy"), rows: insights.segments.vip },
    { id: "risk", title: t("segment.atRisk"), description: t("segment.atRiskCopy"), rows: insights.segments.atRisk },
    { id: "offer", title: t("segment.offer"), description: t("segment.offerCopy"), rows: insights.segments.offer }
  ];

  return (
    <section className="mh-card mh-customer-segments">
      <div className="mh-insights-heading">
        <PanelTitle icon={ListFilter} title={t("segment.title")} />
        <p>{t("segment.description")}</p>
      </div>
      <div className="mh-segment-grid">
        {segmentDefinitions.map((segment) => (
          <article className={`mh-segment ${segment.id}`} key={segment.id}>
            <header>
              <div><strong>{segment.title}</strong><span>{segment.description}</span></div>
              <b>{segment.rows.length}</b>
            </header>
            <div className="mh-segment-list">
              {segment.rows.slice(0, 4).map((customer) => (
                <div key={customer.key}>
                  <span><strong>{customer.name}</strong><small>{customer.favoriteService || t("common.empty")}</small></span>
                  <b>{segment.id === "risk" ? `${customer.daysSinceVisit} ${t("common.days")}` : money(customer.totalSpend)}</b>
                </div>
              ))}
              {!segment.rows.length ? <p>{t("segment.empty")}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlanUsageRows({ currentShop, customers, data, t }) {
  const limits = subscriptionPlanLimits(currentShop.subscription_plan);
  const rows = [
    [t("dashboard.customers"), customers.length, limits.customerLimit],
    [t("nav.services"), (data.services || []).length, limits.serviceLimit],
    [t("nav.promotions"), (data.promotions || []).length, limits.promotionLimit]
  ];

  return <div className="mh-plan-usage">{rows.map(([label, value, limit]) => {
    const progress = limit === null ? 0 : Math.min(100, Math.round((value / Math.max(1, limit)) * 100));
    return <div className="mh-plan-usage-row" key={label}>
      <div><span>{label}</span><strong>{value.toLocaleString("vi-VN")} / {limit === null ? "∞" : limit.toLocaleString("vi-VN")}</strong></div>
      <div className={`mh-progress ${progress >= 80 ? "warning" : ""}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={limit === null ? 0 : progress}><div style={{ width: limit === null ? "0%" : `${progress}%` }} /></div>
    </div>;
  })}</div>;
}

function CustomersWorkspace({ addLocalRow, data, deleteLocalRow, t, toggleLockRow, updateLocalRow }) {
  const [tab, setTab] = useState("list");
  const [customerCreateRequest, setCustomerCreateRequest] = useState(0);
  const tabs = [
    ["list", "customers.list", UserRound],
    ["levels", "customers.levels", Sparkles],
    ["transactions", "customers.transactions", ReceiptText],
    ["scan", "nav.scan", QrCode]
  ];

  return (
    <div className="mh-resource">
      <div className="mh-quick-actions">
        <button className="mh-primary slim" type="button" onClick={() => {
          setTab("list");
          setCustomerCreateRequest((request) => request + 1);
        }}>
          <Plus size={17} />
          {t("customers.addCustomer")}
        </button>
        <button className="mh-tool-button" type="button" onClick={() => setTab("scan")}>
          <QrCode size={17} />
          {t("customers.scanQr")}
        </button>
        <button className="mh-tool-button" type="button" onClick={() => exportCsv("customers.csv", data.customers, getColumns("customers", t, data))}>
          <Download size={17} />
          {t("common.exportCsv")}
        </button>
      </div>
      <div className="mh-role-tabs">
        {tabs.map(([id, labelKey, Icon]) => (
          <button className={tab === id ? "active" : ""} key={id} type="button" onClick={() => setTab(id)}>
            <Icon size={17} />
            {t(labelKey)}
          </button>
        ))}
      </div>
      {tab === "list" ? (
        <ResourceTable
          addLocalRow={addLocalRow}
          canWrite
          collection="customers"
          columns={getColumns("customers", t, data)}
          data={data}
          deleteLocalRow={deleteLocalRow}
          openAddRequest={customerCreateRequest}
          rows={data.customers}
          t={t}
          toggleLockRow={toggleLockRow}
          updateLocalRow={updateLocalRow}
          view="customers"
        />
      ) : null}
      {tab === "levels" ? (
        <>
          <MembershipLevelSettings
            addLocalRow={addLocalRow}
            data={data}
            t={t}
            updateLocalRow={updateLocalRow}
          />
          <ResourceTable
            addLocalRow={addLocalRow}
            canWrite
            collection="levels"
            columns={getColumns("levels", t, data)}
            data={data}
            deleteLocalRow={deleteLocalRow}
            rows={data.levels}
            t={t}
            toggleLockRow={toggleLockRow}
            updateLocalRow={updateLocalRow}
            view="levels"
          />
        </>
      ) : null}
      {tab === "transactions" ? (
        <ResourceTable
          addLocalRow={addLocalRow}
          canWrite
          collection="transactions"
          columns={getColumns("transactions", t, data)}
          data={data}
          deleteLocalRow={deleteLocalRow}
          rows={data.transactions}
          t={t}
          updateLocalRow={updateLocalRow}
          view="transactions"
        />
      ) : null}
      {tab === "scan" ? <ScanView addLocalRow={addLocalRow} data={data} t={t} /> : null}
    </div>
  );
}

function MembershipLevelSettings({ addLocalRow, data, t, updateLocalRow }) {
  const tierModeSetting = (data.settings || []).find((item) => item.key === "membership_tier_mode");
  const pointsSetting = (data.settings || []).find((item) => item.key === "points_vnd_per_point");
  const [tierMode, setTierMode] = useState(tierModeSetting?.value || "both");
  const [vndPerPoint, setVndPerPoint] = useState(pointsSetting?.value || "10000");
  const [saving, setSaving] = useState(false);

  useEffect(() => setTierMode(tierModeSetting?.value || "both"), [tierModeSetting?.value]);
  useEffect(() => setVndPerPoint(pointsSetting?.value || "10000"), [pointsSetting?.value]);

  async function saveSetting(existing, key, value) {
    const row = { id: existing?.id, shop_id: existing?.shop_id || data.shops?.[0]?.id, key, value: String(value) };
    if (existing?.id) return updateLocalRow("settings", row);
    return addLocalRow("settings", row);
  }

  async function savePolicy() {
    setSaving(true);
    try {
      await saveSetting(tierModeSetting, "membership_tier_mode", tierMode);
      await saveSetting(pointsSetting, "points_vnd_per_point", Math.max(1, Number(vndPerPoint || 10000)));
    } finally {
      setSaving(false);
    }
  }

  const activeLevels = [...(data.levels || [])]
    .filter((level) => level.status === "active")
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));

  return (
    <section className="mh-card mh-level-policy">
      <div className="mh-level-policy-heading">
        <PanelTitle icon={Sparkles} title={t("level.policyTitle")} />
        <p>{t("level.policyCopy")}</p>
      </div>
      <div className="mh-level-policy-grid">
        <label>
          <span>{t("level.qualificationMode")}</span>
          <select value={tierMode} onChange={(event) => setTierMode(event.target.value)}>
            <option value="both">{t("level.modeBoth")}</option>
            <option value="either">{t("level.modeEither")}</option>
            <option value="points">{t("level.modePoints")}</option>
            <option value="spend">{t("level.modeSpend")}</option>
          </select>
        </label>
        <label>
          <span>{t("level.pointConversion")}</span>
          <div className="mh-level-point-input">
            <input min="1" step="1000" type="number" value={vndPerPoint} onChange={(event) => setVndPerPoint(event.target.value)} />
            <small>VND / 1 {t("common.points")}</small>
          </div>
        </label>
        <button className="mh-primary slim" disabled={saving} type="button" onClick={savePolicy}>
          {saving ? <Loader2 className="mh-spin" size={17} /> : <Check size={17} />}
          {t("level.savePolicy")}
        </button>
      </div>
      <div className="mh-level-preview" aria-label={t("level.activeLevels")}>
        {activeLevels.map((level) => (
          <article key={level.id} style={{ "--level-color": level.color || "var(--mh-brand)" }}>
            <span>{level.name}</span>
            <strong>{Number(level.earn_rate || 1)}x</strong>
            <small>{Number(level.discount_percent || 0)}% {t("level.discount")}</small>
          </article>
        ))}
        {!activeLevels.length ? <p>{t("level.emptyPolicy")}</p> : null}
      </div>
    </section>
  );
}

function Reports({ data, t }) {
  const intervals = [
    [t("reports.daily"), sumRecent(data.transactions, 1)],
    [t("reports.weekly"), sumRecent(data.transactions, 7)],
    [t("reports.monthly"), sumRecent(data.transactions, 30)],
    [t("reports.yearly"), sumRecent(data.transactions, 365)]
  ];
  const topCustomers = rankBy(data.transactions, "customer_name", "amount").slice(0, 5);

  return (
    <>
      <div className="mh-stats report">
        {intervals.map(([label, value]) => <Stat key={label} label={label} value={money(value)} />)}
      </div>
      <div className="mh-grid two">
        <section className="mh-card">
          <PanelTitle icon={UserRound} title={t("reports.topCustomers")} />
          <BarChart rows={topCustomers} />
        </section>
        <section className="mh-card">
          <PanelTitle icon={ReceiptText} title={t("reports.topRevenue")} />
          <ResourceTable compact columns={getColumns("transactions", t, data)} data={data} rows={data.transactions} t={t} view="transactions" />
        </section>
      </div>
    </>
  );
}

function ResourceTable({ addLocalRow, canWrite = false, data, deleteLocalRow, toggleLockRow, updateLocalRow, collection, columns, compact = false, openAddRequest = 0, rows, t, view }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const pageSize = compact ? 6 : 8;
  const editableFields = useMemo(() => getEditableFields(view, t, data), [data, t, view]);
  const modalFields = isSuperAdmin(editingRow) && view === "users"
    ? [{ key: "password", label: t("auth.newPassword"), type: "password", required: true }]
    : editableFields;

  const orderedRows = useMemo(() => {
    if (view !== "users") return rows;
    return [...rows].sort((left, right) => Number(isSuperAdmin(right)) - Number(isSuperAdmin(left)));
  }, [rows, view]);

  const statuses = useMemo(() => ["all", ...new Set(orderedRows.map((row) => row.status).filter(Boolean))], [orderedRows]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return orderedRows.filter((row) => {
      const matchesText = !needle || Object.values(row).join(" ").toLowerCase().includes(needle);
      const matchesStatus = status === "all" || row.status === status;
      return matchesText && matchesStatus;
    });
  }, [orderedRows, debouncedQuery, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [debouncedQuery, status, view]);

  useEffect(() => {
    if (!openAddRequest) return;
    setEditingRow(null);
    setModalMode("add");
  }, [openAddRequest]);

  return (
    <div className={`mh-resource ${compact ? "compact" : ""}`}>
      {!compact ? (
        <div className="mh-toolbar">
          <div className="mh-toolbar-main">
            <label className="mh-search">
              <Search size={17} />
              <input aria-label={t("common.search")} placeholder={t("common.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label className="mh-select">
              <ListFilter size={17} />
              <select aria-label={t("common.filter")} value={status} onChange={(event) => setStatus(event.target.value)}>
                {statuses.map((item) => <option key={item} value={item}>{item === "all" ? t("common.all") : statusLabel(t, item)}</option>)}
              </select>
            </label>
          </div>
          <div className="mh-toolbar-actions">
            <button className="mh-tool-button" type="button" onClick={() => exportCsv(`${view}.csv`, filtered, columns)}>
              <Download size={17} />
              {t("common.exportData")}
            </button>
            <button className="mh-tool-button" type="button" onClick={() => window.print()}>
              <FileText size={17} />
              {t("common.print")}
            </button>
            {collection && canWrite && addLocalRow ? (
              <button className="mh-primary slim" type="button" onClick={() => {
                setEditingRow(null);
                setModalMode("add");
              }}>
                <Plus size={17} />
                {t("common.add")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mh-table-wrap">
        <table className="mh-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              {!compact && canWrite ? <th>{t("common.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <TableRow
                canWrite={canWrite}
                collection={collection}
                columns={columns}
                compact={compact}
                data={data}
                deleteLocalRow={deleteLocalRow}
                key={row.id}
                row={row}
                setEditingRow={setEditingRow}
                setModalMode={setModalMode}
                t={t}
                toggleLockRow={toggleLockRow}
              />
            ))}
          </tbody>
        </table>
        {!visible.length ? <div className="mh-empty">{t("common.empty")}</div> : null}
      </div>

      {!compact ? (
        <div className="mh-pagination">
          <span>{filtered.length} {t("common.rows")}</span>
          <div>
            <button disabled={page <= 1} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /></button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {modalMode === "detail" && view === "shops" ? (
        <ShopDetailModal
          data={data}
          row={editingRow}
          onClose={() => {
            setEditingRow(null);
            setModalMode("");
          }}
          t={t}
        />
      ) : null}

      {modalMode === "account" && view === "shops" ? (
        <ShopAccountModal
          addLocalRow={addLocalRow}
          data={data}
          deleteLocalRow={deleteLocalRow}
          row={editingRow}
          onClose={() => {
            setEditingRow(null);
            setModalMode("");
          }}
          t={t}
          updateLocalRow={updateLocalRow}
        />
      ) : null}

      {modalMode === "renew" && view === "shops" ? (
        <RenewShopModal
          row={editingRow}
          onClose={() => {
            setEditingRow(null);
            setModalMode("");
          }}
          onSave={async (row) => {
            await updateLocalRow(collection, row);
            setEditingRow(null);
            setModalMode("");
          }}
          t={t}
        />
      ) : null}

      {(modalMode === "add" || modalMode === "edit") && view === "shops" ? (
        <ShopFormModal
          data={data}
          mode={modalMode}
          row={editingRow}
          onClose={() => {
            setEditingRow(null);
            setModalMode("");
          }}
          onSave={async (row) => {
            if (modalMode === "edit") {
              await updateLocalRow(collection, row);
            } else {
              await addLocalRow(collection, row);
            }
            setEditingRow(null);
            setModalMode("");
          }}
          t={t}
        />
      ) : null}

      {modalMode === "customerAccount" && view === "customers" ? (
        <CustomerAccountModal
          row={editingRow}
          onClose={() => {
            setEditingRow(null);
            setModalMode("");
          }}
          t={t}
          updateLocalRow={updateLocalRow}
        />
      ) : null}

      {modalMode && !(view === "shops" && ["detail", "account", "renew", "add", "edit"].includes(modalMode)) && !(view === "customers" && modalMode === "customerAccount") ? (
        <ResourceModal
          fields={modalFields}
          mode={modalMode}
          row={editingRow}
          title={isSuperAdmin(editingRow) && view === "users" ? t("auth.changePassword") : null}
          onClose={() => {
            setEditingRow(null);
            setModalMode("");
          }}
          onSave={async (row) => {
            if (modalMode === "edit") {
              await updateLocalRow(collection, row);
            } else {
              await addLocalRow(collection, row);
            }
            setEditingRow(null);
            setModalMode("");
          }}
          t={t}
        />
      ) : null}
    </div>
  );
}

function useCloseOnEscape(onClose, enabled = true) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (enabled && event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onClose]);
}

function closeOnBackdropClick(onClose) {
  return (event) => {
    if (event.target === event.currentTarget) onClose();
  };
}

function ShopFormModal({ data, mode, row, title, onClose, onSave, t }) {
  const owners = ownerCandidates(data, row);
  const [ownerMode, setOwnerMode] = useState(row?.owner_id ? "existing" : "new");
  const initialStartDate = normalizeInputDate(row?.subscription_start_date);
  const initialEndDate = normalizeInputDate(row?.subscription_end_date, addMonthsForInput(initialStartDate, 1));
  const [startDate, setStartDate] = useState(initialStartDate);
  const [months, setMonths] = useState(monthsBetweenForInput(initialStartDate, initialEndDate));
  const [endDate, setEndDate] = useState(initialEndDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useCloseOnEscape(onClose, !saving);

  function changeStartDate(value) {
    const nextStart = normalizeInputDate(value, startDate);
    setStartDate(nextStart);
    setEndDate(addMonthsForInput(nextStart, months));
  }

  function changeMonths(value) {
    const nextMonths = String(Math.max(1, Number(value || 1)));
    setMonths(nextMonths);
    setEndDate(addMonthsForInput(startDate, nextMonths));
  }

  function changeEndDate(value) {
    const nextEnd = normalizeInputDate(value, endDate);
    setEndDate(nextEnd);
    setMonths(monthsBetweenForInput(startDate, nextEnd));
  }

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("owner_password") || "");
    const confirmPassword = String(form.get("owner_password_confirm") || "");

    if (ownerMode === "new" && password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    const payload = {
      ...(row || {}),
      name: form.get("name"),
      logo_data_url: form.get("logo_data_url"),
      address: form.get("address"),
      email: form.get("email"),
      phone: form.get("phone"),
      slug: form.get("slug"),
      status: form.get("status"),
      subscription_plan: form.get("subscription_plan"),
      subscription_start_date: startDate,
      subscription_months: months,
      subscription_end_date: endDate,
      subscription_status: "active",
      description: form.get("description")
    };

    if (ownerMode === "existing") {
      payload.owner_id = form.get("owner_id");
    } else {
      payload.owner_id = "";
      payload.owner_name = form.get("owner_name");
      payload.owner_email = form.get("owner_email");
      payload.owner_phone = form.get("owner_phone");
      payload.owner_password = password;
      payload.owner_status = form.get("owner_status");
    }

    try {
      setSaving(true);
      setError("");
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message || "Khong the luu cua hang.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mh-modal-backdrop" role="presentation">
      <section className="mh-modal mh-wide-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{title || (mode === "edit" ? t("shop.editShop") : t("shop.addShop"))}</h2>
          <button type="button" onClick={onClose} disabled={saving} title={t("common.cancel")}><X size={18} /></button>
        </header>
        <form className="mh-form" onSubmit={submit}>
          <fieldset className="mh-form-section">
            <legend>{t("shop.infoSection")}</legend>
            <label>{t("shop.name")}<input name="name" defaultValue={row?.name || ""} required /></label>
            <label>{t("shop.logo")}<input name="logo_data_url" defaultValue={row?.logo_data_url || ""} /></label>
            <label>{t("shop.address")}<input name="address" defaultValue={row?.address || ""} /></label>
            <label>{t("shop.email")}<input name="email" type="email" defaultValue={row?.email || ""} /></label>
            <label>{t("shop.phone")}<input name="phone" defaultValue={row?.phone || ""} /></label>
            <label>{t("shop.code")}<input name="slug" defaultValue={row?.slug || ""} /></label>
            <label>{t("shop.systemStatus")}
              <select name="status" defaultValue={row?.status || "active"}>
                <option value="active">{t("common.active")}</option>
                <option value="locked">{t("common.locked")}</option>
              </select>
            </label>
            <label>{t("service.description")}<textarea name="description" defaultValue={row?.description || ""} rows={3} /></label>
          </fieldset>

          <fieldset className="mh-form-section">
            <legend>{t("shop.ownerSection")}</legend>
            <div className="mh-radio-grid">
              <label className="mh-check">
                <input checked={ownerMode === "existing"} name="owner_mode" type="radio" value="existing" onChange={() => setOwnerMode("existing")} />
                {t("owner.useExisting")}
              </label>
              <label className="mh-check">
                <input checked={ownerMode === "new"} name="owner_mode" type="radio" value="new" onChange={() => setOwnerMode("new")} />
                {t("owner.createNew")}
              </label>
            </div>
            {ownerMode === "existing" ? (
              <label>{t("shop.owner")}
                <select name="owner_id" defaultValue={row?.owner_id || ""} required>
                  <option value="">-</option>
                  {owners.map((owner) => <option key={owner.id} value={owner.id}>{userName(owner)}</option>)}
                </select>
              </label>
            ) : (
              <>
                <label>{t("owner.name")}<input name="owner_name" required /></label>
                <label>{t("owner.email")}<input name="owner_email" type="email" required /></label>
                <label>{t("owner.phone")}<input name="owner_phone" /></label>
                <label>{t("owner.tempPassword")}<input name="owner_password" type="password" minLength={8} required placeholder="Owner@123" /></label>
                <label>{t("auth.confirmPassword")}<input name="owner_password_confirm" type="password" minLength={8} required /></label>
                <label>{t("common.status")}
                  <select name="owner_status" defaultValue="active">
                    <option value="active">{t("common.active")}</option>
                    <option value="locked">{t("common.locked")}</option>
                  </select>
                </label>
              </>
            )}
          </fieldset>

          <fieldset className="mh-form-section">
            <legend>{t("subscription.section")}</legend>
            <label>{t("subscription.plan")}
              <select name="subscription_plan" defaultValue={row?.subscription_plan || "standard"}>
                <option value="starter">{planOptionLabel(t, "starter")}</option>
                <option value="standard">{planOptionLabel(t, "standard")}</option>
                <option value="premium">{planOptionLabel(t, "premium")}</option>
              </select>
            </label>
            <label>{t("subscription.start")}<input name="subscription_start_date" type="date" value={startDate} required onChange={(event) => changeStartDate(event.target.value)} /></label>
            <label>{t("subscription.months")}<input name="subscription_months" min="1" step="1" type="number" value={months} required onChange={(event) => changeMonths(event.target.value)} /></label>
            <label>{t("subscription.end")}<input name="subscription_end_date" type="date" value={endDate} min={startDate} required onChange={(event) => changeEndDate(event.target.value)} /></label>
          </fieldset>
          {error ? <div className="mh-alert">{error}</div> : null}
          <div className="mh-modal-actions">
            <button className="mh-tool-button" type="button" onClick={onClose} disabled={saving}>{t("common.cancel")}</button>
            <button className="mh-primary slim" type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RenewShopModal({ row, onClose, onSave, t }) {
  useCloseOnEscape(onClose);
  const initialStartDate = normalizeInputDate(row?.subscription_start_date);
  const initialEndDate = normalizeInputDate(row?.subscription_end_date, addMonthsForInput(initialStartDate, 1));
  const [startDate, setStartDate] = useState(initialStartDate);
  const [months, setMonths] = useState(monthsBetweenForInput(initialStartDate, initialEndDate));
  const [endDate, setEndDate] = useState(initialEndDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function changeStartDate(value) {
    const nextStart = normalizeInputDate(value, startDate);
    setStartDate(nextStart);
    setEndDate(addMonthsForInput(nextStart, months));
  }

  function changeMonths(value) {
    const nextMonths = String(Math.max(1, Number(value || 1)));
    setMonths(nextMonths);
    setEndDate(addMonthsForInput(startDate, nextMonths));
  }

  function changeEndDate(value) {
    const nextEnd = normalizeInputDate(value, endDate);
    setEndDate(nextEnd);
    setMonths(monthsBetweenForInput(startDate, nextEnd));
  }

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError("");
      await onSave({
        ...row,
        subscription_plan: form.get("subscription_plan"),
        subscription_start_date: startDate,
        subscription_months: months,
        subscription_end_date: endDate,
        subscription_status: "active",
        subscription_renewal_note: form.get("subscription_renewal_note")
      });
    } catch (saveError) {
      setError(saveError.message || "Khong the gia han.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mh-modal-backdrop" role="presentation" onClick={closeOnBackdropClick(onClose)}>
      <section className="mh-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{t("subscription.renew")}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}><X size={18} /></button>
        </header>
        <form className="mh-form" onSubmit={submit}>
          <label>{t("subscription.plan")}
            <select name="subscription_plan" defaultValue={row?.subscription_plan || "standard"}>
              <option value="starter">{planOptionLabel(t, "starter")}</option>
              <option value="standard">{planOptionLabel(t, "standard")}</option>
              <option value="premium">{planOptionLabel(t, "premium")}</option>
            </select>
          </label>
          <label>{t("subscription.start")}<input type="date" value={startDate} required onChange={(event) => changeStartDate(event.target.value)} /></label>
          <label>{t("subscription.months")}<input min="1" step="1" type="number" value={months} required onChange={(event) => changeMonths(event.target.value)} /></label>
          <label>{t("subscription.end")}<input type="date" value={endDate} min={startDate} required onChange={(event) => changeEndDate(event.target.value)} /></label>
          <label>{t("transaction.note")}<textarea name="subscription_renewal_note" rows={3} /></label>
          {error ? <div className="mh-alert">{error}</div> : null}
          <div className="mh-modal-actions">
            <button className="mh-tool-button" type="button" onClick={onClose} disabled={saving}>{t("common.cancel")}</button>
            <button className="mh-primary slim" type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ShopDetailModal({ data, row, onClose, t }) {
  useCloseOnEscape(onClose);
  const owner = currentOwner(row, data);
  const employees = Math.max(0, Number(row?.employee_count || 0));

  return (
    <div className="mh-modal-backdrop" role="presentation" onClick={closeOnBackdropClick(onClose)}>
      <section className="mh-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{t("shop.viewDetails")}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}><X size={18} /></button>
        </header>
        <div className="mh-detail-list">
          <span>{t("shop.name")}</span><strong>{row?.name || "-"}</strong>
          <span>{t("shop.owner")}</span><strong>{owner?.name || "-"}</strong>
          <span>{t("owner.email")}</span><strong>{owner?.email || "-"}</strong>
          <span>{t("dashboard.customers")}</span><strong>{row?.total_members ?? 0}</strong>
          <span>{t("subscription.plan")}</span><strong>{planLabel(t, row?.subscription_plan)}</strong>
          <span>{t("subscription.start")}</span><strong>{dateText(row?.subscription_start_date)}</strong>
          <span>{t("subscription.end")}</span><strong>{dateText(row?.subscription_end_date)}</strong>
          <span>{t("subscription.remaining")}</span><strong>{remainingText(t, row?.remaining_days)}</strong>
          <span>{t("account.staffCount")}</span><strong>{employees}</strong>
        </div>
      </section>
    </div>
  );
}

function ShopAccountModal({ addLocalRow, data, deleteLocalRow, row, onClose, t, updateLocalRow }) {
  useCloseOnEscape(onClose);
  const owner = currentOwner(row, data);
  const owners = ownerCandidates(data, row);
  const [ownerMode, setOwnerMode] = useState("existing");
  const [password, setPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function run(action) {
    try {
      setSaving(true);
      setError("");
      await action();
    } catch (actionError) {
      setError(actionError.message || "Khong the cap nhat tai khoan.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    if (!owner?.id) {
      setError(t("account.noOwner"));
      return;
    }
    const nextPassword = password || generatePassword();
    await run(async () => {
      await updateLocalRow("users", { id: owner.id, password: nextPassword });
      setGeneratedPassword(nextPassword);
      setPassword("");
    });
  }

  async function changeOwner(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      if (ownerMode === "existing") {
        await updateLocalRow("shops", { ...row, owner_id: form.get("owner_id") });
        return;
      }

      const passwordValue = String(form.get("owner_password") || "");
      if (passwordValue !== String(form.get("owner_password_confirm") || "")) {
        throw new Error(t("auth.passwordMismatch"));
      }

      const newOwner = await addLocalRow("users", {
        name: form.get("owner_name"),
        email: form.get("owner_email"),
        phone: form.get("owner_phone"),
        password: passwordValue,
        role: "store_owner",
        status: form.get("owner_status")
      });
      await updateLocalRow("shops", { ...row, owner_id: newOwner.id });
    });
  }

  async function removeOwner() {
    if (!owner?.id || !window.confirm(t("account.removeOwnerConfirm"))) return;
    await run(async () => {
      const relation = storeUserFor(row, owner, data);
      await updateLocalRow("shops", { ...row, owner_id: "" });
      if (relation?.id && deleteLocalRow) {
        await deleteLocalRow("storeUsers", relation);
      }
    });
  }

  async function toggleOwnerLock() {
    if (!owner?.id) return;
    await run(async () => {
      await updateLocalRow("users", { id: owner.id, status: owner.status === "locked" ? "active" : "locked" });
    });
  }

  return (
    <div className="mh-modal-backdrop" role="presentation" onClick={closeOnBackdropClick(onClose)}>
      <section className="mh-modal mh-wide-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{t("account.manage")}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}><X size={18} /></button>
        </header>
        <div className="mh-account-summary">
          <strong>{owner?.name || t("account.noOwner")}</strong>
          <span>{owner?.email || "-"}</span>
          {owner?.status ? <StatusBadge t={t} value={owner.status} /> : null}
        </div>

        <form className="mh-form" onSubmit={resetPassword}>
          <fieldset className="mh-form-section">
            <legend>{t("account.resetPassword")}</legend>
            <label>{t("auth.newPassword")}<input value={password} minLength={8} type="password" onChange={(event) => setPassword(event.target.value)} placeholder={t("account.randomIfBlank")} /></label>
            <div className="mh-modal-actions">
              <button className="mh-tool-button" type="button" disabled={saving || !owner} onClick={() => setPassword(generatePassword())}>{t("account.generatePassword")}</button>
              <button className="mh-primary slim" type="submit" disabled={saving || !owner}>{t("account.resetPassword")}</button>
            </div>
            {generatedPassword ? <div className="mh-generated-password"><span>{t("account.newPassword")}</span><strong>{generatedPassword}</strong></div> : null}
          </fieldset>
        </form>

        <form className="mh-form" onSubmit={changeOwner}>
          <fieldset className="mh-form-section">
            <legend>{t("account.changeOwner")}</legend>
            <div className="mh-radio-grid">
              <label className="mh-check"><input checked={ownerMode === "existing"} name="account_owner_mode" type="radio" onChange={() => setOwnerMode("existing")} />{t("owner.useExisting")}</label>
              <label className="mh-check"><input checked={ownerMode === "new"} name="account_owner_mode" type="radio" onChange={() => setOwnerMode("new")} />{t("owner.createNew")}</label>
            </div>
            {ownerMode === "existing" ? (
              <label>{t("shop.owner")}
                <select name="owner_id" defaultValue={row?.owner_id || ""} required>
                  <option value="">-</option>
                  {owners.map((candidate) => <option key={candidate.id} value={candidate.id}>{userName(candidate)}</option>)}
                </select>
              </label>
            ) : (
              <>
                <label>{t("owner.name")}<input name="owner_name" required /></label>
                <label>{t("owner.email")}<input name="owner_email" type="email" required /></label>
                <label>{t("owner.phone")}<input name="owner_phone" /></label>
                <label>{t("owner.tempPassword")}<input name="owner_password" type="password" minLength={8} required /></label>
                <label>{t("auth.confirmPassword")}<input name="owner_password_confirm" type="password" minLength={8} required /></label>
                <label>{t("common.status")}<select name="owner_status" defaultValue="active"><option value="active">{t("common.active")}</option><option value="locked">{t("common.locked")}</option></select></label>
              </>
            )}
            <div className="mh-modal-actions">
              <button className="mh-primary slim" type="submit" disabled={saving}>{t("account.changeOwner")}</button>
            </div>
          </fieldset>
        </form>

        {error ? <div className="mh-alert">{error}</div> : null}
        <div className="mh-modal-actions">
          <button className="mh-tool-button" type="button" onClick={toggleOwnerLock} disabled={saving || !owner}>{owner?.status === "locked" ? t("common.unlock") : t("common.lock")}</button>
          <button className="mh-tool-button" type="button" onClick={removeOwner} disabled={saving || !owner}>{t("account.removeOwner")}</button>
          <button className="mh-primary slim" type="button" onClick={onClose}>{t("common.save")}</button>
        </div>
      </section>
    </div>
  );
}

function CustomerAccountModal({ row, onClose, t, updateLocalRow }) {
  useCloseOnEscape(onClose);
  const [password, setPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function run(action) {
    try {
      setSaving(true);
      setError("");
      await action();
    } catch (actionError) {
      setError(actionError.message || "Khong the cap nhat tai khoan khach hang.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    const nextPassword = password || generatePassword();
    await run(async () => {
      await updateLocalRow("customers", { id: row.id, password: nextPassword });
      setGeneratedPassword(nextPassword);
      setPassword("");
    });
  }

  async function toggleCustomerLock() {
    await run(async () => {
      await updateLocalRow("customers", { id: row.id, status: row.status === "locked" ? "active" : "locked" });
    });
  }

  return (
    <div className="mh-modal-backdrop" role="presentation" onClick={closeOnBackdropClick(onClose)}>
      <section className="mh-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{t("account.customerAccount")}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}><X size={18} /></button>
        </header>
        <div className="mh-account-summary">
          <strong>{row?.name || "-"}</strong>
          <span>{row?.email || "-"}</span>
          <StatusBadge t={t} value={row?.status} />
        </div>
        <form className="mh-form" onSubmit={resetPassword}>
          <label>{t("auth.newPassword")}<input value={password} minLength={8} type="password" onChange={(event) => setPassword(event.target.value)} placeholder={t("account.randomIfBlank")} /></label>
          <div className="mh-modal-actions">
            <button className="mh-tool-button" type="button" disabled={saving} onClick={() => setPassword(generatePassword())}>{t("account.generatePassword")}</button>
            <button className="mh-primary slim" type="submit" disabled={saving}>{t("account.resetPassword")}</button>
          </div>
          {generatedPassword ? <div className="mh-generated-password"><span>{t("account.newPassword")}</span><strong>{generatedPassword}</strong></div> : null}
        </form>
        {error ? <div className="mh-alert">{error}</div> : null}
        <div className="mh-modal-actions">
          <button className="mh-tool-button" type="button" onClick={toggleCustomerLock} disabled={saving}>{row?.status === "locked" ? t("common.unlock") : t("common.lock")}</button>
          <button className="mh-primary slim" type="button" onClick={onClose}>{t("common.save")}</button>
        </div>
      </section>
    </div>
  );
}

function ResourceModal({ fields, mode, row, title, onClose, onSave, t }) {
  useCloseOnEscape(onClose);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextRow = { ...(row || {}) };
    fields.forEach((field) => {
      if (field.addOnly && mode !== "add") return;
      const value = form.get(field.key);

      if (field.type === "password" && !value) return;
      nextRow[field.key] = value ?? "";
    });

    try {
      setSaving(true);
      setError("");
      await onSave(nextRow);
    } catch (saveError) {
      setError(saveError.message || "Khong the luu du lieu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mh-modal-backdrop" role="presentation" onClick={closeOnBackdropClick(onClose)}>
      <section className="mh-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{title || (mode === "edit" ? t("common.edit") : t("common.add"))}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}><X size={18} /></button>
        </header>
        <form className="mh-form" onSubmit={submit}>
          {fields.filter((field) => !field.addOnly || mode === "add").map((field) => (
            <ModalField field={field} key={field.key} row={row} />
          ))}
          {error ? <div className="mh-alert">{error}</div> : null}
          <div className="mh-modal-actions">
            <button className="mh-tool-button" type="button" onClick={onClose} disabled={saving}>{t("common.cancel")}</button>
            <button className="mh-primary slim" type="submit" disabled={saving}>
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TableRow({ canWrite, collection, columns, compact, data, deleteLocalRow, row, setEditingRow, setModalMode, t, toggleLockRow }) {
  const protectedAdmin = collection === "users" && isSuperAdmin(row);
  const isShopRow = collection === "shops";
  const isCustomerRow = collection === "customers";
  const [busyAction, setBusyAction] = useState("");

  async function runRowAction(action, actionRunner) {
    if (busyAction) return;
    setBusyAction(action);
    try {
      await actionRunner();
    } catch (actionError) {
      window.alert(actionError.message || t("common.actionFailed"));
    } finally {
      setBusyAction("");
    }
  }

  return (
    <tr>
      {columns.map((column) => (
        <td data-label={column.label} key={column.key}>{column.render ? column.render(row) : formatCell(row[column.key])}</td>
      ))}
      {!compact && canWrite ? (
        <td>
          <div className="mh-action-group">
            {isShopRow ? (
              <button
                className="mh-icon-action"
                type="button"
                title={t("shop.viewDetails")}
                onClick={() => {
                  setEditingRow(row);
                  setModalMode("detail");
                }}
              >
                <FileText size={16} />
              </button>
            ) : null}
            <button
              className="mh-icon-action"
              type="button"
              title={protectedAdmin ? t("auth.changePassword") : isShopRow ? t("shop.editShop") : t("common.edit")}
              onClick={() => {
                setEditingRow(row);
                setModalMode("edit");
              }}
            >
              {protectedAdmin ? <Lock size={16} /> : <Settings size={16} />}
            </button>
            {isShopRow ? (
              <>
                <button
                  className="mh-icon-action"
                  type="button"
                  title={t("subscription.renew")}
                  onClick={() => {
                    setEditingRow(row);
                    setModalMode("renew");
                  }}
                >
                  <CreditCard size={16} />
                </button>
                <button
                  className="mh-icon-action"
                  type="button"
                  title={t("account.manage")}
                  onClick={() => {
                    setEditingRow(row);
                    setModalMode("account");
                  }}
                >
                  <UserRound size={16} />
                </button>
                <button
                  className="mh-icon-action"
                  type="button"
                  title={t("shop.exportMembers")}
                  onClick={() => {
                    const members = (data.customers || []).filter((customer) => Number(customer.shop_id) === Number(row.id));
                    exportCsv(`${row.slug || row.name || "shop"}-members.csv`, members, getColumns("customers", t, data));
                  }}
                >
                  <Download size={16} />
                </button>
              </>
            ) : null}
            {isCustomerRow ? (
              <button
                className="mh-icon-action"
                type="button"
                title={t("account.manage")}
                onClick={() => {
                  setEditingRow(row);
                  setModalMode("customerAccount");
                }}
              >
                <LockKeyhole size={16} />
              </button>
            ) : null}
            {!protectedAdmin && row.status && toggleLockRow ? (
              <button
                className="mh-icon-action"
                type="button"
                disabled={Boolean(busyAction)}
                title={row.status === "locked" ? t("common.unlock") : t("common.lock")}
                onClick={() => runRowAction("lock", () => toggleLockRow(collection, row))}
              >
                {busyAction === "lock" ? (
                  <Loader2 className="mh-spin" size={16} />
                ) : row.status === "locked" ? (
                  <Unlock size={16} />
                ) : (
                  <Lock size={16} />
                )}
              </button>
            ) : null}
            {!protectedAdmin && deleteLocalRow ? (
              <button
                className="mh-icon-action danger"
                type="button"
                disabled={Boolean(busyAction)}
                title={t("common.delete")}
                onClick={() => {
                  if (window.confirm(t("common.confirmDelete"))) {
                    runRowAction("delete", () => deleteLocalRow(collection, row));
                  }
                }}
              >
                {busyAction === "delete" ? <Loader2 className="mh-spin" size={16} /> : <Trash2 size={16} />}
              </button>
            ) : null}
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function ModalField({ field, row }) {
  const value = row?.[field.key] ?? field.defaultValue ?? "";

  if (field.options?.length) {
    return (
      <label>
        {field.label}
        <select name={field.key} defaultValue={value} required={field.required || false}>
          {!field.required ? <option value="">-</option> : null}
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.multiline) {
    return (
      <label>
        {field.label}
        <textarea name={field.key} placeholder={field.label} defaultValue={value} rows={3} />
      </label>
    );
  }

  return (
    <label>
      {field.label}
      <input
        name={field.key}
        placeholder={field.placeholder || field.label}
        defaultValue={field.type === "password" ? "" : value}
        min={field.min}
        step={field.step}
        required={field.required || false}
        type={field.type || "text"}
      />
    </label>
  );
}

function CustomerCards({ cards, data, t }) {
  if (!cards.length) return <div className="mh-empty">{t("common.empty")}</div>;

  return (
    <div className="mh-customer-card-page">
      <div className="mh-card-grid">
        {cards.map((card) => {
          const levels = (data.levels || [])
            .filter((level) => Number(level.shop_id) === Number(card.shop_id) && level.status === "active")
            .sort((left, right) => Number(left.min_points || 0) - Number(right.min_points || 0));
          const nextLevel = levels.find((level) => Number(level.min_points || 0) > Number(card.points || 0));
          const progress = nextLevel
            ? Math.min(100, Math.round((Number(card.points || 0) / Math.max(1, Number(nextLevel.min_points || 0))) * 100))
            : 100;
          return (
            <article className="mh-member-card" key={card.id}>
              <div className="mh-member-card-head">
                <span>{card.shop_name}</span>
                <em>{card.tier}</em>
              </div>
              <div className="mh-member-card-identity">
                <small>{card.customer_name}</small>
                <h2>{card.card_number}</h2>
              </div>
              <div className="mh-qr-wrap">
                <QrImage alt={t("card.qr")} value={card.qr_payload || card.secure_token || card.card_number} />
                <div>
                  <strong>{Number(card.points || 0).toLocaleString("vi-VN")} {t("common.points")}</strong>
                  <p>{t("card.spend")}: {money(card.total_spend)}</p>
                  <p>{t("card.expires")}: {dateText(card.expires_at)}</p>
                  <p>{t("common.status")}: {statusLabel(t, card.status)}</p>
                </div>
              </div>
              <div className="mh-tier-progress">
                <div><span>{card.tier}</span><strong>{nextLevel ? nextLevel.name : "MAX"}</strong></div>
                <div className="mh-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
                <small>{nextLevel ? `${Number(nextLevel.min_points || 0) - Number(card.points || 0)} ${t("common.points")}` : t("request.completed")}</small>
              </div>
            </article>
          );
        })}
      </div>
      <section className="mh-card">
        <PanelTitle icon={ReceiptText} title={t("nav.serviceRequests")} />
        <div className="mh-upcoming-list">
          {(data.serviceRequests || []).filter((request) => ["pending", "confirmed"].includes(request.status)).slice(0, 5).map((request) => (
            <div className="mh-upcoming-row" key={request.id}>
              <div><strong>{request.service_name}</strong><span>{request.shop_name}</span></div>
              <time>{request.preferred_at ? new Date(request.preferred_at).toLocaleString("vi-VN") : "-"}</time>
              <StatusBadge t={t} value={request.status} />
            </div>
          ))}
          {!(data.serviceRequests || []).some((request) => ["pending", "confirmed"].includes(request.status)) ? <div className="mh-empty">{t("common.empty")}</div> : null}
        </div>
      </section>
    </div>
  );
}

function CustomerServices({ addLocalRow, data, t }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const services = (data.services || []).filter((item) => item.status === "active");

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer = (data.customers || []).find((item) => Number(item.shop_id) === Number(selected.shop_id));
    if (!customer) return setError(t("request.customerMissing"));
    const preferredDate = String(form.get("preferred_date") || "");
    const preferredTime = String(form.get("preferred_time") || "");
    const preferredAt = preferredDate && preferredTime
      ? new Date(`${preferredDate}T${preferredTime}:00`).toISOString()
      : null;
    try {
      setSaving(true);
      setError("");
      await addLocalRow("serviceRequests", {
        shop_id: selected.shop_id,
        customer_id: customer.id,
        service_id: selected.id,
        preferred_at: preferredAt,
        note: form.get("note") || ""
      });
      setSelected(null);
    } catch (requestError) {
      const message = String(requestError.message || "");
      setError(message.includes("service_requests") && message.includes("schema cache")
        ? t("request.temporarilyUnavailable")
        : message || t("common.actionFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mh-resource">
      <div className="mh-table-wrap">
        <table className="mh-table">
          <thead><tr><th>{t("service.name")}</th><th>{t("shop.name")}</th><th>{t("service.price")}</th><th>{t("service.duration")}</th><th>{t("common.actions")}</th></tr></thead>
          <tbody>{services.map((service) => (
            <tr key={service.id}>
              <td data-label={t("service.name")}>{service.name}</td>
              <td data-label={t("shop.name")}>{service.shop_name}</td>
              <td data-label={t("service.price")}>{money(service.price)}</td>
              <td data-label={t("service.duration")}>{service.duration_minutes || 0} {t("common.minutes")}</td>
              <td><button className="mh-primary slim" type="button" onClick={() => { setError(""); setSelected(service); }}>{t("request.choose")}</button></td>
            </tr>
          ))}</tbody>
        </table>
        {!services.length ? <div className="mh-empty">{t("common.empty")}</div> : null}
      </div>
      {selected ? (
        <div className="mh-modal-backdrop" role="presentation" onMouseDown={closeOnBackdropClick(() => !saving && setSelected(null))}>
          <section className="mh-modal" role="dialog" aria-modal="true" aria-labelledby="service-request-title">
            <header><h2 id="service-request-title">{t("request.title")}</h2><button type="button" disabled={saving} onClick={() => setSelected(null)}><X size={18} /></button></header>
            <form className="mh-form" onSubmit={submit}>
              <div className="mh-request-summary"><strong>{selected.name}</strong><span>{selected.shop_name} · {money(selected.price)} · {selected.duration_minutes || 0} {t("common.minutes")}</span></div>
              <div className="mh-form-row">
                <label>{t("request.preferredDate")}<input name="preferred_date" type="date" min={todayInputDate()} required /></label>
                <label>{t("request.preferredTime")}<input name="preferred_time" type="time" required /></label>
              </div>
              <label>{t("transaction.note")}<textarea name="note" rows={3} /></label>
              {error ? <div className="mh-alert">{error}</div> : null}
              <div className="mh-modal-actions"><button className="mh-tool-button" type="button" disabled={saving} onClick={() => setSelected(null)}>{t("common.cancel")}</button><button className="mh-primary" type="submit" disabled={saving}>{saving ? t("common.loading") : t("request.send")}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ServiceRequests({ data, isOwner, t, updateLocalRow }) {
  const rows = data.serviceRequests || [];
  async function decide(row, status) {
    try { await updateLocalRow("serviceRequests", { id: row.id, status }); }
    catch (error) { window.alert(error.message || t("common.actionFailed")); }
  }
  return (
    <div className="mh-resource"><div className="mh-table-wrap"><table className="mh-table">
      <thead><tr>{isOwner ? <th>{t("customer.name")}</th> : null}<th>{t("service.name")}</th><th>{t("shop.name")}</th><th>{t("request.preferredAt")}</th><th>{t("transaction.note")}</th><th>{t("common.status")}</th>{isOwner ? <th>{t("common.actions")}</th> : null}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}>{isOwner ? <td>{row.customer_name}</td> : null}<td>{row.service_name}</td><td>{row.shop_name}</td><td>{row.preferred_at ? new Date(row.preferred_at).toLocaleString("vi-VN") : "-"}</td><td>{formatCell(row.note)}</td><td><StatusBadge t={t} value={row.status} /></td>{isOwner ? <td><div className="mh-action-group">{row.status === "pending" ? <><button className="mh-icon-action" title={t("request.confirm")} onClick={() => decide(row, "confirmed")}><Check size={16} /></button><button className="mh-icon-action danger" title={t("request.reject")} onClick={() => decide(row, "rejected")}><X size={16} /></button></> : null}{row.status === "confirmed" ? <><button className="mh-primary slim" type="button" onClick={() => decide(row, "completed")}>{t("request.completed")}</button><button className="mh-tool-button slim" type="button" onClick={() => decide(row, "cancelled")}>{t("request.cancelled")}</button></> : null}</div></td> : null}</tr>)}</tbody>
    </table>{!rows.length ? <div className="mh-empty">{t("common.empty")}</div> : null}</div></div>
  );
}

function ScanView({ addLocalRow, data, t }) {
  const cards = data.cards || [];
  const [code, setCode] = useState(cards[0]?.card_number || "");
  const [scanning, setScanning] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ value: "", at: 0 });
  const card = cards.find((item) => {
    const raw = code.trim().toLowerCase();
    if (!raw) return false;
    let pathname = "";
    try { pathname = new URL(raw).pathname.toLowerCase(); } catch {}
    const token = (pathname || raw).split("/").filter(Boolean).at(-1) || "";
    const needles = [raw, pathname, token].filter(Boolean);
    return [item.card_number, item.secure_token, item.qr_payload]
      .filter(Boolean)
      .some((value) => needles.some((needle) => String(value).toLowerCase().includes(needle)));
  });

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { if (scanner.isScanning) await scanner.stop(); } catch {}
      try { await scanner.clear(); } catch {}
    }
    setScanning(false);
  }

  async function startScanner() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraMessage(t("scan.httpsRequired"));
      return;
    }
    try {
      setCameraMessage("");
      const { Html5Qrcode } = await import("html5-qrcode");
      await stopScanner();
      const scanner = new Html5Qrcode("mh-camera-reader", { verbose: false });
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          const now = Date.now();
          if (lastScanRef.current.value === decodedText && now - lastScanRef.current.at < 2500) return;
          lastScanRef.current = { value: decodedText, at: now };
          setCode(decodedText);
          setCameraMessage(t("scan.detected"));
          await stopScanner();
        },
        () => {}
      );
    } catch (error) {
      await stopScanner();
      setCameraMessage(error?.name === "NotAllowedError" ? t("scan.permissionDenied") : t("scan.cameraFailed"));
    }
  }

  useEffect(() => () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner?.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
  }, []);

  return (
    <div className="mh-grid two">
      <section className="mh-card">
        <PanelTitle icon={QrCode} title={t("scan.title")} />
        <div className="mh-camera-actions">
          <button className="mh-primary slim" type="button" onClick={scanning ? stopScanner : startScanner}>
            <Camera size={17} />{scanning ? t("scan.stopCamera") : t("scan.openCamera")}
          </button>
        </div>
        <div id="mh-camera-reader" className={`mh-camera-reader ${scanning ? "active" : ""}`} />
        {cameraMessage ? <div className="mh-camera-message" role="status">{cameraMessage}</div> : null}
        <label className="mh-scan-input">
          <ScanLine size={20} />
          <input value={code} placeholder={t("scan.placeholder")} onChange={(event) => setCode(event.target.value)} />
        </label>
        {!scanning ? <div className="mh-scan-window">
          <QrCode size={88} />
        </div> : null}
      </section>
      <section className="mh-card">
        <PanelTitle icon={UserRound} title={t("scan.result")} />
        {card ? (
          <div className="mh-scan-result">
            <QrImage alt={t("card.qr")} value={card.qr_payload || card.secure_token || card.card_number} />
            <h2>{card.customer_name}</h2>
            <p>{card.shop_name}</p>
            <strong>{card.tier} - {Number(card.points || 0).toLocaleString("vi-VN")} {t("common.points")}</strong>
            {addLocalRow ? <RecordTransactionForm addLocalRow={addLocalRow} card={card} data={data} t={t} /> : null}
          </div>
        ) : <div className="mh-empty">{t("common.empty")}</div>}
      </section>
    </div>
  );
}

function RecordTransactionForm({ addLocalRow, card, data, t }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const services = (data.services || []).filter((service) => service.shop_id === card.shop_id);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const serviceId = Number(form.get("service_id") || 0);
    const service = services.find((item) => item.id === serviceId);
    const amount = Number(form.get("amount") || service?.price || 0);

    try {
      setSaving(true);
      setError("");
      await addLocalRow("transactions", {
        shop_id: card.shop_id,
        customer_id: card.customer_id,
        service_id: serviceId || null,
        price: amount,
        amount,
        note: form.get("note") || ""
      });
      event.currentTarget.reset();
    } catch (transactionError) {
      setError(transactionError.message || "Khong the ghi nhan giao dich.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mh-form mh-transaction-form" onSubmit={submit}>
      <label>
        {t("service.name")}
        <select name="service_id" defaultValue="">
          <option value="">-</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.name} - {money(service.price)}</option>
          ))}
        </select>
      </label>
      <label>
        {t("transaction.total")}
        <input name="amount" type="number" min="0" required />
      </label>
      <label>
        {t("transaction.note")}
        <textarea name="note" rows={2} />
      </label>
      {error ? <div className="mh-alert">{error}</div> : null}
      <button className="mh-primary slim" type="submit" disabled={saving}>
        {saving ? t("common.loading") : t("transactions.record")}
      </button>
    </form>
  );
}

function UserAvatar({ user, fallback, src, className = "" }) {
  const imageSrc = src !== undefined ? src : avatarUrlFor(user, fallback);

  return (
    <span className={`mh-avatar ${imageSrc ? "has-image" : ""} ${className}`.trim()}>
      {imageSrc ? <img src={imageSrc} alt="" /> : initialFor(user)}
    </span>
  );
}

function Profile({ data, onChangeAvatar, t, updateLocalRow, user }) {
  const customer = data.customers?.[0];
  const card = data.cards?.find((item) => Number(item.customer_id) === Number(customer?.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!customer) return;

    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError("");
      await updateLocalRow("customers", {
        id: customer.id,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        birthday: form.get("birthday"),
        address: form.get("address"),
        notes: form.get("notes")
      });
    } catch (profileError) {
      setError(profileError.message || "Khong the luu ho so.");
    } finally {
      setSaving(false);
    }
  }

  if (!customer) return <div className="mh-empty">{t("common.empty")}</div>;

  return (
    <section className="mh-profile-layout">
      <aside className="mh-profile-summary">
        <div className="mh-profile-avatar-wrap">
          <UserAvatar className="large" fallback={customer} user={user} />
          <button type="button" onClick={onChangeAvatar} title={t("avatar.change")}>
            <Camera size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="mh-profile-identity">
          <span>{t("app.customer")}</span>
          <h2>{customer.name || user.name}</h2>
          <p>{customer.email || user.email}</p>
        </div>

        <div className="mh-profile-facts">
          <div><span>{t("shop.name")}</span><strong>{customer.shop_name || "-"}</strong></div>
          <div><span>{t("customer.phone")}</span><strong>{customer.phone || user.phone || "-"}</strong></div>
          <div><span>{t("customer.birthday")}</span><strong>{dateText(customer.birthday)}</strong></div>
          <div><span>{t("card.number")}</span><strong>{card?.card_number || "-"}</strong></div>
        </div>

        {card ? (
          <div className="mh-profile-membership">
            <div><span>{t("card.tier")}</span><strong>{card.tier || "-"}</strong></div>
            <div><span>{t("common.points")}</span><strong>{Number(card.points || 0).toLocaleString("vi-VN")}</strong></div>
            <div><span>{t("card.spend")}</span><strong>{money(card.total_spend)}</strong></div>
          </div>
        ) : null}
      </aside>

      <div className="mh-profile-editor">
        <header>
          <div>
            <h2>{t("profile.personalInfo")}</h2>
            <p>{t("profile.personalCopy")}</p>
          </div>
          <button className="mh-tool-button slim" type="button" onClick={onChangeAvatar}>
            <Camera size={16} aria-hidden="true" />
            <span>{t("avatar.change")}</span>
          </button>
        </header>

        <form className="mh-form mh-profile-form" onSubmit={submit}>
          <div className="mh-profile-fields">
            <label>
              {t("customer.name")}
              <input name="name" defaultValue={customer.name || ""} />
            </label>
            <label>
              {t("customer.email")}
              <input name="email" type="email" defaultValue={customer.email || ""} />
            </label>
            <label>
              {t("customer.phone")}
              <input name="phone" defaultValue={customer.phone || ""} />
            </label>
            <label>
              {t("customer.birthday")}
              <input name="birthday" type="date" defaultValue={customer.birthday || ""} />
            </label>
            <label className="wide">
              {t("shop.address")}
              <input name="address" defaultValue={customer.address || ""} />
            </label>
            <label className="wide">
              {t("customer.notes")}
              <textarea name="notes" defaultValue={customer.notes || ""} rows={4} />
            </label>
          </div>
          {error ? <div className="mh-alert">{error}</div> : null}
          <footer>
            <span>{t("profile.saveHint")}</span>
            <button className="mh-primary slim" type="submit" disabled={saving}>
              {saving ? t("common.loading") : t("profile.saveChanges")}
            </button>
          </footer>
        </form>
      </div>
    </section>
  );
}

function AvatarModal({ customer, onClose, onSubmit, t, user }) {
  useCloseOnEscape(onClose);
  const [preview, setPreview] = useState(avatarUrlFor(user, customer));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      setPreview(await readAvatarFile(file));
    } catch (avatarError) {
      setError(avatarError.message || t("avatar.invalid"));
    }
  }

  async function submit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await onSubmit(preview || null);
    } catch (avatarError) {
      setError(avatarError.message || t("avatar.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mh-modal-backdrop" role="presentation" onClick={closeOnBackdropClick(onClose)}>
      <section className="mh-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-title">
        <header>
          <h2 id="avatar-title">{t("avatar.change")}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}>
            <X size={18} />
          </button>
        </header>
        <form className="mh-form mh-avatar-form" onSubmit={submit}>
          <div className="mh-avatar-preview">
            <UserAvatar className="large" fallback={customer} src={preview} user={user} />
            <div>
              <strong>{displayAccountName(user, t)}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <label className="mh-avatar-upload">
            <Camera size={18} aria-hidden="true" />
            <span>{t("avatar.upload")}</span>
            <small>{t("avatar.help")}</small>
            <input accept="image/*" onChange={chooseFile} type="file" />
          </label>
          {error ? <div className="mh-alert">{error}</div> : null}
          <div className="mh-modal-actions">
            <button type="button" onClick={() => setPreview("")}>{t("avatar.remove")}</button>
            <button type="button" onClick={onClose}>{t("common.cancel")}</button>
            <button className="mh-primary slim" type="submit" disabled={saving}>
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PasswordModal({ onClose, onSubmit, t }) {
  useCloseOnEscape(onClose);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSubmit({ currentPassword, newPassword });
    } catch (passwordError) {
      setError(passwordError.message || t("auth.changePasswordFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mh-modal-backdrop" role="presentation" onClick={closeOnBackdropClick(onClose)}>
      <section className="mh-modal" role="dialog" aria-modal="true" aria-labelledby="password-title">
        <header>
          <h2 id="password-title">{t("auth.changePassword")}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}>
            <X size={18} />
          </button>
        </header>
        <form className="mh-form" onSubmit={submit}>
          <label>
            {t("auth.currentPassword")}
            <input name="currentPassword" type="password" required autoComplete="current-password" />
          </label>
          <label>
            {t("auth.newPassword")}
            <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            {t("auth.confirmPassword")}
            <input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          {error ? <div className="mh-alert">{error}</div> : null}
          <div className="mh-modal-actions">
            <button className="mh-tool-button" type="button" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button className="mh-primary slim" type="submit" disabled={saving}>
              {saving ? <Loader2 className="mh-spin" size={16} /> : <Lock size={16} />}
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function LanguageSwitcher({ locale, setLocale, t }) {
  return (
    <label className="mh-mini-select" title={t("common.language")}>
      <Globe2 size={16} />
      <select value={locale} onChange={(event) => setLocale(event.target.value)}>
        {locales.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
  );
}

function ThemeToggle({ setTheme, t, theme }) {
  return (
    <button className="mh-icon-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={t("common.theme")}>
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function AppBootSkeleton({ t }) {
  return (
    <main className="mh-boot" aria-busy="true" aria-live="polite">
      <section className="mh-boot-center">
        <div className="mh-boot-identity" aria-hidden="true">
          <LogoMark />
          <span>{t("app.name")}</span>
        </div>
        <div className="mh-boot-progress" aria-hidden="true"><span /></div>
        <p role="status">{t("common.loading")}</p>
      </section>
    </main>
  );
}

function EmptyState({ t }) {
  return <div className="mh-empty">{t("common.empty")}</div>;
}

function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="mh-panel-title">
      <Icon size={18} />
      <h2>{title}</h2>
    </div>
  );
}

function Stat({ comparison, label, trendLabel, value }) {
  return (
    <article className="mh-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {comparison ? (
        <div className={`mh-stat-trend ${comparison.direction}`}>
          <b>{comparison.direction === "up" ? "↑" : comparison.direction === "down" ? "↓" : "→"} {Math.abs(comparison.percent)}%</b>
          <small>{trendLabel}</small>
        </div>
      ) : null}
    </article>
  );
}

function BarChart({ rows }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="mh-bars">
      {rows.map((row) => (
        <div className="mh-bar-row" key={row.label}>
          <span>{row.label || "-"}</span>
          <div><i style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} /></div>
          <strong>{money(row.value)}</strong>
        </div>
      ))}
      {!rows.length ? <div className="mh-empty">{formatCell("")}</div> : null}
    </div>
  );
}

function getViewTitleKey(view) {
  return {
    overview: "nav.overview",
    shops: "nav.shops",
    shop: "nav.shop",
    storeUsers: "nav.storeOwners",
    users: "nav.users",
    customers: "nav.customers",
    services: "nav.services",
    requests: "nav.serviceRequests",
    cards: "nav.cards",
    levels: "nav.levels",
    transactions: "nav.transactions",
    promotions: "nav.promotions",
    reports: "nav.reports",
    scan: "nav.scan",
    logs: "nav.logs",
    notifications: "nav.notifications",
    settings: "nav.settings",
    profile: "nav.profile"
  }[view] || "nav.overview";
}

function getColumns(view, t, data = {}) {
  const statusColumn = { key: "status", label: t("common.status"), render: (row) => <StatusBadge t={t} value={row.status} /> };
  const linkColumn = (key, label) => ({
    key,
    label,
    render: (row) => row[key] ? (
      <a className="mh-inline-link" href={routePath(row[key])} target="_blank" rel="noreferrer">
        {t("common.open")}
      </a>
    ) : "-"
  });
  const columns = {
    shops: [
      { key: "name", label: t("shop.name") },
      { key: "owner_name", label: t("shop.owner") },
      { key: "email", label: t("shop.email") },
      { key: "phone", label: t("shop.phone") },
      { key: "subscription_plan", label: t("subscription.plan"), render: (row) => <span className="mh-plan-badge">{planLabel(t, row.subscription_plan)}</span> },
      { key: "subscription_start_date", label: t("subscription.start"), render: (row) => dateText(row.subscription_start_date) },
      { key: "subscription_end_date", label: t("subscription.end"), render: (row) => dateText(row.subscription_end_date) },
      { key: "remaining_days", label: t("subscription.remaining"), render: (row) => {
        const remaining = row.remaining_days ?? daysUntil(row.subscription_end_date);
        return <span className="mh-remaining-badge">{remainingText(t, remaining)}</span>;
      } },
      { key: "total_members", label: t("dashboard.customers") },
      { key: "subscription_status", label: t("common.status"), render: (row) => <StatusBadge t={t} value={subscriptionStatus(row)} /> }
    ],
    shop: [
      { key: "name", label: t("shop.name") },
      linkColumn("store_url", t("common.link")),
      { key: "owner_name", label: t("shop.owner") },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email") },
      { key: "address", label: t("shop.address") },
      statusColumn
    ],
    storeUsers: [
      { key: "shop_name", label: t("shop.name") },
      { key: "user_name", label: t("shop.owner") },
      { key: "user_email", label: t("customer.email") },
      { key: "role", label: t("common.role") },
      { key: "created_at", label: t("promotion.dates"), render: (row) => dateText(row.created_at) }
    ],
    users: [
      { key: "name", label: t("customer.name") },
      { key: "email", label: t("customer.email") },
      { key: "role", label: t("common.actions") },
      { key: "phone", label: t("customer.phone") },
      statusColumn
    ],
    customers: [
      { key: "name", label: t("customer.name") },
      { key: "is_online", label: t("presence.label"), render: (row) => {
        const isOnline = (data.onlineCustomerUserIds || []).includes(Number(row.user_id));
        return (
        <span className={`mh-presence ${isOnline ? "online" : "offline"}`}>
          <span aria-hidden="true" />
          {isOnline ? t("presence.online") : t("presence.offline")}
        </span>
      ); } },
      linkColumn("customer_url", t("common.link")),
      { key: "shop_name", label: t("shop.name") },
      { key: "email", label: t("customer.email") },
      { key: "phone", label: t("customer.phone") },
      { key: "birthday", label: t("customer.birthday"), render: (row) => dateText(row.birthday) },
      { key: "gender", label: t("customer.gender"), render: (row) => genderLabel(t, row.gender) },
      statusColumn
    ],
    services: [
      { key: "name", label: t("service.name") },
      { key: "shop_name", label: t("shop.name") },
      { key: "price", label: t("service.price"), render: (row) => money(row.price) },
      { key: "duration_minutes", label: t("service.duration"), render: (row) => `${row.duration_minutes || 0} ${t("common.minutes")}` },
      statusColumn
    ],
    cards: [
      { key: "card_number", label: t("card.number") },
      { key: "customer_name", label: t("customer.name") },
      { key: "shop_name", label: t("shop.name") },
      { key: "points", label: t("common.points") },
      { key: "tier", label: t("card.tier") },
      { key: "total_spend", label: t("card.spend"), render: (row) => money(row.total_spend) },
      statusColumn
    ],
    levels: [
      { key: "name", label: t("level.name") },
      { key: "shop_name", label: t("shop.name") },
      { key: "min_points", label: t("level.condition"), render: (row) => `${row.min_points || 0} pts / ${money(row.min_spend)}` },
      { key: "earn_rate", label: t("level.earnRate"), render: (row) => `${row.earn_rate || 1}x` },
      { key: "discount_percent", label: t("level.discount"), render: (row) => `${row.discount_percent || 0}%` },
      { key: "benefits", label: t("level.benefits") },
      statusColumn
    ],
    transactions: [
      { key: "transaction_code", label: t("transaction.code") },
      { key: "customer_name", label: t("customer.name") },
      { key: "service_name", label: t("service.name") },
      { key: "shop_name", label: t("shop.name") },
      { key: "amount", label: t("transaction.total"), render: (row) => money(row.amount) },
      { key: "points_delta", label: t("transaction.points") },
      { key: "created_at", label: t("promotion.dates"), render: (row) => dateText(row.created_at) }
    ],
    promotions: [
      { key: "title", label: t("promotion.title") },
      { key: "shop_name", label: t("shop.name") },
      { key: "type", label: t("promotion.type") },
      { key: "discount_percent", label: t("promotion.value"), render: (row) => row.discount_amount ? money(row.discount_amount) : `${row.discount_percent || 0}%` },
      { key: "end_date", label: t("promotion.dates"), render: (row) => `${dateText(row.start_date)} - ${dateText(row.end_date)}` },
      statusColumn
    ],
    logs: [
      { key: "actor_name", label: t("customer.name") },
      { key: "action", label: t("common.actions") },
      { key: "entity_type", label: t("common.entity") },
      { key: "entity_id", label: t("common.identifier") },
      { key: "created_at", label: t("promotion.dates"), render: (row) => dateText(row.created_at) }
    ],
    notifications: [
      { key: "title", label: t("nav.notifications") },
      { key: "body", label: t("transaction.note") },
      { key: "status", label: t("common.status"), render: (row) => <StatusBadge t={t} value={row.status} /> },
      { key: "created_at", label: t("promotion.dates"), render: (row) => dateText(row.created_at) }
    ],
    settings: [
      { key: "key", label: t("nav.settings") },
      { key: "value", label: t("service.description") }
    ]
  };

  return columns[view] || columns.customers;
}

function getEditableFields(view, t, data = {}) {
  const idLabel = (label) => `${label} ${t("common.identifier")}`;
  const shopOptions = optionList(data.shops, "id", (item) => item.name);
  const ownerOptions = optionList(
    (data.users || []).filter((user) => normalizeRole(user.role) !== "customer"),
    "id",
    (item) => `${item.name} - ${item.email}`
  );
  const customerOptions = optionList(data.customers, "id", (item) => `${item.name} #${item.id}`);
  const serviceOptions = optionList(data.services, "id", (item) => `${item.name} #${item.id}`);
  const statusOptions = {
    activeLocked: [
      { value: "active", label: t("common.active") },
      { value: "locked", label: t("common.locked") }
    ],
    activeInactive: [
      { value: "active", label: t("common.active") },
      { value: "inactive", label: t("common.inactive") }
    ],
    notifications: [
      { value: "unread", label: t("common.unread") },
      { value: "read", label: t("common.read") }
    ]
  };

  const fields = {
    shops: [
      { key: "name", label: t("shop.name"), required: true },
      { key: "logo_data_url", label: t("shop.logo") },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email"), type: "email" },
      { key: "address", label: t("shop.address") },
      { key: "slug", label: t("shop.code") },
      { key: "owner_id", label: idLabel(t("shop.owner")), type: "number", options: ownerOptions },
      { key: "owner_name", label: t("owner.name"), addOnly: true },
      { key: "owner_email", label: t("owner.email"), type: "email", addOnly: true },
      { key: "owner_phone", label: t("owner.phone"), addOnly: true },
      { key: "owner_password", label: t("owner.tempPassword"), type: "password", addOnly: true, placeholder: "Owner@123" },
      { key: "subscription_plan", label: t("subscription.plan"), defaultValue: "standard", options: [
        { value: "starter", label: planOptionLabel(t, "starter") },
        { value: "standard", label: planOptionLabel(t, "standard") },
        { value: "premium", label: planOptionLabel(t, "premium") }
      ] },
      { key: "subscription_start_date", label: t("subscription.start"), type: "date" },
      { key: "subscription_months", label: t("subscription.months"), type: "number", addOnly: true, defaultValue: "1", options: [
        { value: "1", label: "1" },
        { value: "3", label: "3" },
        { value: "6", label: "6" },
        { value: "12", label: "12" }
      ] },
      { key: "subscription_end_date", label: t("subscription.end"), type: "date" },
      { key: "description", label: t("service.description"), multiline: true },
      { key: "subscription_status", label: t("common.status"), defaultValue: "active", options: [
        { value: "active", label: t("common.active") },
        { value: "expiring", label: t("common.expiring") },
        { value: "expired", label: t("common.expired") },
        { value: "suspended", label: t("common.suspended") }
      ] },
      { key: "status", label: t("shop.systemStatus"), defaultValue: "active", options: statusOptions.activeLocked }
    ],
    shop: [
      { key: "name", label: t("shop.name") },
      { key: "logo_data_url", label: t("shop.logo") },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email"), type: "email" },
      { key: "address", label: t("shop.address") },
      { key: "description", label: t("service.description"), multiline: true },
      { key: "status", label: t("shop.systemStatus"), defaultValue: "active", options: statusOptions.activeLocked }
    ],
    storeUsers: [
      { key: "store_id", label: t("shop.name"), type: "number", required: true, options: shopOptions },
      { key: "user_id", label: t("shop.owner"), type: "number", required: true, options: ownerOptions },
      { key: "role", label: t("common.role"), defaultValue: "store_owner", options: [
        { value: "store_owner", label: t("app.owner") }
      ] }
    ],
    users: [
      { key: "name", label: t("customer.name") },
      { key: "email", label: t("customer.email"), type: "email" },
      { key: "role", label: t("common.role"), defaultValue: "store_owner", options: [
        { value: "store_owner", label: t("app.owner") },
        { value: "customer", label: t("app.customer") }
      ] },
      { key: "phone", label: t("customer.phone") },
      { key: "password", label: t("auth.password"), type: "password", placeholder: "Owner@123" },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeLocked }
    ],
    customers: [
      { key: "shop_id", label: t("shop.name"), type: "number", required: true, options: shopOptions },
      { key: "name", label: t("customer.name"), required: true },
      { key: "email", label: t("customer.email"), type: "email" },
      { key: "password", label: t("auth.password"), type: "password", addOnly: true, placeholder: "Customer@123" },
      { key: "phone", label: t("customer.phone") },
      { key: "birthday", label: t("customer.birthday"), type: "date" },
      { key: "gender", label: t("customer.gender"), options: [
        { value: "", label: "-" },
        { value: "female", label: t("common.female") },
        { value: "male", label: t("common.male") },
        { value: "other", label: t("common.other") }
      ] },
      { key: "notes", label: t("customer.notes"), multiline: true },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeLocked }
    ],
    services: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "name", label: t("service.name") },
      { key: "price", label: t("service.price"), type: "number" },
      { key: "duration_minutes", label: t("service.duration"), type: "number", min: "1", step: "1", defaultValue: "30", placeholder: t("service.durationExample") },
      { key: "description", label: t("service.description"), multiline: true },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeInactive }
    ],
    cards: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "customer_id", label: t("customer.name"), type: "number", options: customerOptions },
      { key: "card_number", label: t("card.number") },
      { key: "secure_token", label: t("card.secureToken") },
      { key: "points", label: t("common.points"), type: "number" },
      { key: "tier", label: t("card.tier"), defaultValue: "Silver", options: [
        { value: "Silver", label: "Silver" },
        { value: "Gold", label: "Gold" },
        { value: "Platinum", label: "Platinum" },
        { value: "Diamond", label: "Diamond" }
      ] },
      { key: "total_spend", label: t("card.spend"), type: "number" },
      { key: "expires_at", label: t("card.expires"), type: "date" },
      { key: "status", label: t("common.status"), defaultValue: "active", options: [
        ...statusOptions.activeLocked,
        { value: "expired", label: t("common.expired") }
      ] }
    ],
    levels: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "name", label: t("level.name"), required: true },
      { key: "color", label: t("level.color"), type: "color", defaultValue: "#2563eb" },
      { key: "min_points", label: t("common.points"), type: "number", min: "0", defaultValue: "0" },
      { key: "min_spend", label: t("card.spend"), type: "number", min: "0", defaultValue: "0" },
      { key: "earn_rate", label: t("level.earnRate"), type: "number", min: "1", max: "20", defaultValue: "1" },
      { key: "discount_percent", label: t("level.discount"), type: "number", min: "0", max: "100", defaultValue: "0" },
      { key: "sort_order", label: t("level.sortOrder"), type: "number", min: "0", defaultValue: "0" },
      { key: "benefits", label: t("level.benefits"), multiline: true },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeInactive }
    ],
    transactions: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "customer_id", label: t("customer.name"), type: "number", options: customerOptions },
      { key: "service_id", label: t("service.name"), type: "number", options: serviceOptions },
      { key: "price", label: t("service.price"), type: "number" },
      { key: "discount", label: t("transaction.discount"), type: "number" },
      { key: "tax", label: t("transaction.tax"), type: "number" },
      { key: "amount", label: t("transaction.total"), type: "number" },
      { key: "points_delta", label: t("transaction.points"), type: "number" },
      { key: "note", label: t("transaction.note"), multiline: true }
    ],
    promotions: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "service_id", label: t("service.name"), type: "number", options: serviceOptions },
      { key: "title", label: t("promotion.title") },
      { key: "description", label: t("service.description"), multiline: true },
      { key: "type", label: t("promotion.type"), defaultValue: "percent", options: [
        { value: "percent", label: "%" },
        { value: "amount", label: t("transaction.total") }
      ] },
      { key: "discount_percent", label: t("level.discount"), type: "number" },
      { key: "discount_amount", label: t("promotion.value"), type: "number" },
      { key: "start_date", label: t("promotion.dates"), type: "date" },
      { key: "end_date", label: t("card.expires"), type: "date" },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeInactive }
    ],
    notifications: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "user_id", label: t("customer.name"), type: "number", options: optionList(data.users, "id", (item) => `${item.name} - ${item.email}`) },
      { key: "title", label: t("nav.notifications") },
      { key: "body", label: t("transaction.note"), multiline: true },
      { key: "status", label: t("common.status"), defaultValue: "unread", options: statusOptions.notifications }
    ],
    settings: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "key", label: t("nav.settings") },
      { key: "value", label: t("service.description"), multiline: true }
    ],
    logs: []
  };

  return fields[view] || fields.customers;
}

function StatusBadge({ t, value }) {
  const status = value || "active";
  return <span className={`mh-status ${status}`}>{statusLabel(t, status)}</span>;
}

function optionList(rows = [], valueKey, labelFor) {
  return rows.map((row) => ({
    value: String(row[valueKey] ?? ""),
    label: labelFor(row)
  }));
}

function routePath(value) {
  const path = normalizeRoutePath(value);
  return path.startsWith("/") ? withBasePath(path) : path;
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("vi-VN");
  return String(value);
}

function exportCsv(filename, rows, columns) {
  const header = columns.map((column) => column.label);
  const lines = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(","));
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function qrContent(value) {
  const text = String(value || "");
  if (!text.startsWith("/")) return text;
  if (typeof window === "undefined") return text;
  return `${window.location.origin}${withBasePath(text)}`;
}

function QrImage({ alt, value }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrContent(value), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220
    }).then((url) => { if (active) setSrc(url); }).catch(() => { if (active) setSrc(""); });
    return () => { active = false; };
  }, [value]);
  return src ? <img alt={alt} src={src} /> : <div className="mh-qr-placeholder" aria-label={alt}><QrCode size={56} /></div>;
}

function rankBy(rows, labelKey, valueKey) {
  const map = new Map();
  rows.forEach((row) => {
    const label = row[labelKey] || "-";
    map.set(label, (map.get(label) || 0) + Number(row[valueKey] || 0));
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function buildGlobalSearchResults(data, query, t) {
  const needle = normalizeSearchText(query).trim();
  if (!needle || !data) return [];

  const definitions = [
    {
      rows: data.customers || [],
      view: "customers",
      kind: t("search.customer"),
      Icon: UserRound,
      title: (row) => row.name || row.email || `#${row.id}`,
      subtitle: (row) => [row.phone, row.email].filter(Boolean).join(" · "),
      values: (row) => [row.name, row.email, row.phone, row.slug, row.id]
    },
    {
      rows: data.transactions || [],
      view: "transactions",
      kind: t("search.transaction"),
      Icon: ReceiptText,
      title: (row) => row.transaction_code || `#${row.id}`,
      subtitle: (row) => [row.customer_name, row.service_name, money(row.amount)].filter(Boolean).join(" · "),
      values: (row) => [row.transaction_code, row.customer_name, row.service_name, row.amount, row.note, row.id]
    },
    {
      rows: data.services || [],
      view: "services",
      kind: t("search.service"),
      Icon: Scissors,
      title: (row) => row.name || `#${row.id}`,
      subtitle: (row) => [row.shop_name, money(row.price)].filter(Boolean).join(" · "),
      values: (row) => [row.name, row.description, row.shop_name, row.price, row.id]
    },
    {
      rows: data.serviceRequests || [],
      view: "requests",
      kind: t("search.request"),
      Icon: ListFilter,
      title: (row) => row.customer_name || `#${row.id}`,
      subtitle: (row) => [row.service_name, row.status, dateText(row.preferred_at)].filter(Boolean).join(" · "),
      values: (row) => [row.customer_name, row.service_name, row.shop_name, row.status, row.note, row.id]
    }
  ];

  return definitions.flatMap((definition) => definition.rows
    .filter((row) => definition.values(row).some((value) => normalizeSearchText(value).includes(needle)))
    .slice(0, 5)
    .map((row) => ({
      key: `${definition.view}:${row.id}`,
      view: definition.view,
      kind: definition.kind,
      Icon: definition.Icon,
      title: definition.title(row),
      subtitle: definition.subtitle(row) || t("common.empty")
    })))
    .slice(0, 12);
}

function buildCustomerInsights(transactions, customers) {
  const customerById = new Map(customers.map((customer) => [String(customer.id), customer]));
  const customerMap = new Map();

  transactions.forEach((transaction) => {
    const customerId = transaction.customer_id == null ? "" : String(transaction.customer_id);
    const key = customerId || `name:${transaction.customer_name || "-"}`;
    const profile = customerById.get(customerId);
    const current = customerMap.get(key) || {
      key,
      name: transaction.customer_name || profile?.name || "-",
      totalSpend: 0,
      visits: 0,
      points: 0,
      lastVisit: null,
      services: new Map()
    };
    const serviceName = transaction.service_name || "";
    const createdAt = transaction.created_at ? new Date(transaction.created_at).getTime() : 0;

    current.totalSpend += Number(transaction.amount || 0);
    current.visits += 1;
    current.points += Number(transaction.points_delta || 0);
    if (createdAt > Number(current.lastVisit || 0)) current.lastVisit = createdAt;
    if (serviceName) current.services.set(serviceName, (current.services.get(serviceName) || 0) + 1);
    customerMap.set(key, current);
  });

  const rankedCustomers = [...customerMap.values()]
    .map((customer) => ({
      ...customer,
      favoriteService: [...customer.services.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "",
      daysSinceVisit: customer.lastVisit
        ? Math.max(0, Math.floor((Date.now() - Number(customer.lastVisit)) / (24 * 60 * 60 * 1000)))
        : 9999
    }))
    .sort((left, right) => right.totalSpend - left.totalSpend || right.visits - left.visits);
  const activeThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const repeatCustomers = rankedCustomers.filter((customer) => customer.visits > 1).length;
  const averageCustomerSpend = rankedCustomers.length
    ? rankedCustomers.reduce((sum, customer) => sum + customer.totalSpend, 0) / rankedCustomers.length
    : 0;
  const vipCount = rankedCustomers.length ? Math.max(1, Math.ceil(rankedCustomers.length * 0.2)) : 0;
  const vipKeys = new Set(rankedCustomers.slice(0, vipCount).map((customer) => customer.key));
  const vip = rankedCustomers.filter((customer) => vipKeys.has(customer.key));
  const atRisk = rankedCustomers
    .filter((customer) => !vipKeys.has(customer.key)
      && customer.daysSinceVisit >= 45
      && (customer.visits >= 2 || customer.totalSpend >= averageCustomerSpend))
    .sort((left, right) => right.daysSinceVisit - left.daysSinceVisit);
  const atRiskKeys = new Set(atRisk.map((customer) => customer.key));
  const offer = rankedCustomers
    .filter((customer) => !vipKeys.has(customer.key)
      && !atRiskKeys.has(customer.key)
      && (customer.visits >= 2 || customer.totalSpend >= averageCustomerSpend * 0.6))
    .sort((left, right) => right.totalSpend - left.totalSpend);

  return {
    rankedCustomers,
    segments: { vip, atRisk, offer },
    averageOrderValue: transactions.length
      ? transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0) / transactions.length
      : 0,
    repeatRate: rankedCustomers.length ? Math.round((repeatCustomers / rankedCustomers.length) * 100) : 0,
    activeLast30Days: rankedCustomers.filter((customer) => Number(customer.lastVisit || 0) >= activeThreshold).length
  };
}

function sumRecent(rows, days) {
  const min = Date.now() - days * 24 * 60 * 60 * 1000;
  return rows.reduce((sum, row) => {
    const created = new Date(row.created_at || 0).getTime();
    return created >= min ? sum + Number(row.amount || 0) : sum;
  }, 0);
}

function compareRevenuePeriods(rows, days) {
  const now = Date.now();
  const duration = days * 24 * 60 * 60 * 1000;
  const currentStart = now - duration;
  const previousStart = currentStart - duration;
  let current = 0;
  let previous = 0;

  rows.forEach((row) => {
    const createdAt = new Date(row.created_at || 0).getTime();
    const amount = Number(row.amount || 0);
    if (createdAt >= currentStart && createdAt <= now) current += amount;
    else if (createdAt >= previousStart && createdAt < currentStart) previous += amount;
  });

  const percent = previous > 0
    ? Math.round(((current - previous) / previous) * 100)
    : current > 0 ? 100 : 0;

  return {
    current,
    previous,
    percent,
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat"
  };
}

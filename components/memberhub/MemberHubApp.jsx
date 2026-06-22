"use client";

import {
  BadgePercent,
  Bell,
  Building2,
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
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createTranslator as createNextIntlTranslator, NextIntlClientProvider } from "next-intl";
import { dashboardPathFor, isCustomer, isStoreOwner, isSuperAdmin, normalizeRole } from "@/lib/memberhub/access";
import { getMessagesForLocale } from "@/lib/memberhub/i18n";
import { normalizeRoutePath } from "@/lib/memberhub/slug";
import { createTranslator, locales } from "@/messages/memberhub";

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === "production" ? "/HoangCasterMemberHub" : "");

const navItems = {
  super_admin: [
    ["overview", "nav.overview", LayoutDashboard],
    ["shops", "nav.shops", Building2],
    ["storeUsers", "nav.storeOwners", ShieldCheck],
    ["users", "nav.users", UsersRound],
    ["customers", "nav.customers", UserRound],
    ["services", "nav.services", Scissors],
    ["cards", "nav.cards", CreditCard],
    ["levels", "nav.levels", Sparkles],
    ["transactions", "nav.transactions", ReceiptText],
    ["promotions", "nav.promotions", BadgePercent],
    ["reports", "nav.reports", FileText],
    ["scan", "nav.scan", ScanLine],
    ["logs", "nav.logs", ShieldCheck],
    ["settings", "nav.settings", Settings]
  ],
  store_owner: [
    ["overview", "nav.overview", LayoutDashboard],
    ["shop", "nav.shop", Building2],
    ["customers", "nav.customers", UserRound],
    ["services", "nav.services", Scissors],
    ["cards", "nav.cards", CreditCard],
    ["levels", "nav.levels", Sparkles],
    ["transactions", "nav.transactions", ReceiptText],
    ["promotions", "nav.promotions", BadgePercent],
    ["reports", "nav.reports", FileText],
    ["scan", "nav.scan", ScanLine],
    ["notifications", "nav.notifications", Bell],
    ["settings", "nav.settings", Settings]
  ],
  customer: [
    ["cards", "nav.cards", CreditCard],
    ["services", "nav.services", Scissors],
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

function money(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateText(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
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
    throw new Error(payload.error || payload.message || "Unable to load data.");
  }

  return payload;
}

async function saveResource(collection, token, row, method) {
  const payload = await api(`/api/memberhub/${collection}`, token, {
    method,
    body: JSON.stringify(row)
  });

  return payload.row || row;
}

function readStored(key, fallback) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
}

function expectedRoleForPath() {
  if (typeof window === "undefined") return null;

  const pathname = withoutBasePath(window.location.pathname);
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
  if (expectedRole === "super_admin") return withoutBasePath(window.location.pathname).startsWith("/admin");

  const currentPath = normalizeRoutePath(withoutBasePath(window.location.pathname)) || "/";
  const dashboardPath = normalizeRoutePath(dashboardPathFor(user, data)) || "/";
  return currentPath === dashboardPath;
}

export function MemberHubApp() {
  const [locale, setLocale] = useState("vi");
  const messages = useMemo(() => getMessagesForLocale(locale), [locale]);

  useEffect(() => {
    setLocale(readStored("memberhub_locale", "vi"));
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MemberHubAppContent locale={locale} setLocale={setLocale} />
    </NextIntlClientProvider>
  );
}

function MemberHubAppContent({ locale, setLocale }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("overview");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [toast, setToast] = useState("");

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
    setTheme(readStored("memberhub_theme", "light"));
    const savedToken = localStorage.getItem("memberhub_token") || "";
    if (!savedToken) {
      setBooting(false);
      return;
    }

    setLoading(true);
    Promise.all([
      api("/api/me", savedToken),
      api("/api/app-data", savedToken)
    ])
      .then(([payload, nextData]) => {
        const nextUser = { ...payload.user, role: normalizeRole(payload.user.role) };
        if (!currentPathMatchesUser(nextUser, nextData)) {
          setToken("");
          return;
        }

        setToken(savedToken);
        setUser(nextUser);
        setLocale(isSuperAdmin(nextUser) ? "vi" : readStored("memberhub_locale", nextUser.locale || "vi"));
        setView(isCustomer(nextUser) ? "cards" : "overview");
        setData(nextData);
        router.replace(dashboardPathFor(nextUser, nextData));
      })
      .catch(() => {
        localStorage.removeItem("memberhub_token");
        setToken("");
      })
      .finally(() => {
        setLoading(false);
        setBooting(false);
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("memberhub_theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("memberhub_locale", locale);
    document.cookie = `memberhub_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

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
      const nextLocale = isSuperAdmin(nextUser) ? "vi" : nextUser.locale || locale;
      setToken(payload.token);
      setUser(nextUser);
      setLocale(nextLocale);
      setView(isCustomer(nextUser) ? "cards" : "overview");
      const nextData = await api("/api/app-data", payload.token);
      setData(nextData);
      router.replace(dashboardPathFor(nextUser, nextData));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("memberhub_token");
    setToken("");
    setUser(null);
    setData(null);
    setView("overview");
    router.replace("/");
  }

  async function changePassword({ currentPassword, newPassword }) {
    await api("/api/auth/change-password", token, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setToast(t("toast.passwordChanged"));
    setPasswordModalOpen(false);
  }

  async function addLocalRow(collection, row) {
    await saveResource(collection, token, row, "POST");
    setData(await api("/api/app-data", token));
    setToast(t("toast.saved"));
  }

  async function updateLocalRow(collection, row) {
    await saveResource(collection, token, row, "PATCH");
    setData(await api("/api/app-data", token));
    setToast(t("toast.saved"));
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
    return <BootScreen t={t} />;
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

  return (
    <div className="mh-shell">
      <aside className="mh-sidebar">
        <Brand t={t} role={user.role} />
        <nav className="mh-nav" aria-label="Workspace">
          {items.map(([id, labelKey, Icon]) => (
            <button
              className={view === id ? "active" : ""}
              key={id}
              onClick={() => setView(id)}
              type="button"
              title={t(labelKey)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(labelKey)}</span>
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
            {isStoreOwner(user) || isCustomer(user) ? (
              <LanguageSwitcher locale={locale} setLocale={setLocale} t={t} />
            ) : null}
            <ThemeToggle setTheme={setTheme} t={t} theme={theme} />
            <span>{user.name}</span>
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
          {loading ? <LoadingState t={t} /> : null}
          {!loading && data ? (
            <DashboardView
              addLocalRow={addLocalRow}
              deleteLocalRow={deleteLocalRow}
              toggleLockRow={toggleLockRow}
              updateLocalRow={updateLocalRow}
              data={data}
              t={t}
              user={user}
              view={view}
            />
          ) : null}
          {!loading && !data ? <EmptyState t={t} /> : null}
        </main>
      </section>

      {passwordModalOpen ? (
        <PasswordModal
          onClose={() => setPasswordModalOpen(false)}
          onSubmit={changePassword}
          t={t}
        />
      ) : null}
      {toast ? <div className="mh-toast"><Check size={16} />{toast}</div> : null}
    </div>
  );
}

function Brand({ t, role }) {
  return (
    <div className="mh-brand">
      <LogoMark />
      <div>
        <strong>{t("app.name")}</strong>
        <span>{t(roleKeys[role] || "app.tagline")}</span>
      </div>
    </div>
  );
}

function BootScreen({ t }) {
  return (
    <main className="mh-auth mh-boot">
      <section className="mh-auth-panel">
        <div className="mh-auth-brand">
          <LogoMark />
          <div>
            <p>{t("app.name")}</p>
            <h1>{t("common.loading")}</h1>
          </div>
        </div>
        <div className="mh-boot-state">
          <Loader2 className="mh-spin" size={22} aria-hidden="true" />
          <span>{t("common.loading")}</span>
        </div>
      </section>
    </main>
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

function LogoMark() {
  return <img className="mh-logo" src={withBasePath("/assets/logo.png")} alt="" aria-hidden="true" />;
}

function DashboardView({ addLocalRow, deleteLocalRow, toggleLockRow, updateLocalRow, view, user, data, t }) {
  if (view === "overview") return <Overview data={data} t={t} user={user} />;
  if (view === "reports") return <Reports data={data} t={t} />;
  if (view === "scan") return <ScanView cards={data.cards} t={t} />;
  if (view === "profile") return <Profile customers={data.customers} t={t} updateLocalRow={updateLocalRow} user={user} />;

  const key = tableMap[view];
  const rows = data[key] || [];

  if (view === "cards" && isCustomer(user)) {
    return <CustomerCards cards={rows} t={t} />;
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

function Overview({ data, t, user }) {
  const revenue = data.transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const points = data.cards.reduce((sum, item) => sum + Number(item.points || 0), 0);
  const newCustomers = data.customers.filter((item) => {
    const created = new Date(item.created_at || Date.now());
    return Date.now() - created.getTime() < 1000 * 60 * 60 * 24 * 30;
  }).length;
  const topServices = rankBy(data.transactions, "service_name", "amount").slice(0, 5);

  return (
    <>
      <div className="mh-stats">
        <Stat label={t("dashboard.revenue")} value={money(revenue)} />
        <Stat label={t("dashboard.customers")} value={data.customers.length} />
        <Stat label={t("dashboard.transactions")} value={data.transactions.length} />
        <Stat label={t("dashboard.newCustomers")} value={newCustomers} />
        <Stat label={t("dashboard.points")} value={points.toLocaleString("vi-VN")} />
      </div>

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
          rows={data.transactions.slice(0, 6)}
          t={t}
          view="transactions"
        />
      </section>
    </>
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

function ResourceTable({ addLocalRow, canWrite = false, data, deleteLocalRow, toggleLockRow, updateLocalRow, collection, columns, compact = false, rows, t, view }) {
  const [query, setQuery] = useState("");
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
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orderedRows.filter((row) => {
      const matchesText = !needle || Object.values(row).join(" ").toLowerCase().includes(needle);
      const matchesStatus = status === "all" || row.status === status;
      return matchesText && matchesStatus;
    });
  }, [orderedRows, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [query, status, view]);

  return (
    <div className={`mh-resource ${compact ? "compact" : ""}`}>
      {!compact ? (
        <div className="mh-toolbar">
          <label className="mh-search">
            <Search size={17} />
            <input aria-label={t("common.search")} placeholder={t("common.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="mh-select">
            <ListFilter size={17} />
            <select aria-label={t("common.filter")} value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => <option key={item} value={item}>{item === "all" ? t("common.all") : item}</option>)}
            </select>
          </label>
          <button className="mh-tool-button" type="button" onClick={() => exportCsv(`${view}.csv`, filtered, columns)}>
            <Download size={17} />
            {t("common.exportCsv")}
          </button>
          <button className="mh-tool-button" type="button" onClick={() => window.print()}>
            <FileText size={17} />
            {t("common.printPdf")}
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

      {modalMode ? (
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

function ResourceModal({ fields, mode, row, title, onClose, onSave, t }) {
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
    <div className="mh-modal-backdrop" role="presentation">
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

function TableRow({ canWrite, collection, columns, compact, deleteLocalRow, row, setEditingRow, setModalMode, t, toggleLockRow }) {
  const protectedAdmin = collection === "users" && isSuperAdmin(row);

  return (
    <tr>
      {columns.map((column) => (
        <td key={column.key}>{column.render ? column.render(row) : formatCell(row[column.key])}</td>
      ))}
      {!compact && canWrite ? (
        <td>
          <div className="mh-action-group">
            <button
              className="mh-icon-action"
              type="button"
              title={protectedAdmin ? t("auth.changePassword") : t("common.edit")}
              onClick={() => {
                setEditingRow(row);
                setModalMode("edit");
              }}
            >
              {protectedAdmin ? <Lock size={16} /> : <Settings size={16} />}
            </button>
            {!protectedAdmin && row.status && toggleLockRow ? (
              <button
                className="mh-icon-action"
                type="button"
                title={row.status === "locked" ? t("common.unlock") : t("common.lock")}
                onClick={() => toggleLockRow(collection, row)}
              >
                {row.status === "locked" ? <Unlock size={16} /> : <Lock size={16} />}
              </button>
            ) : null}
            {!protectedAdmin && deleteLocalRow ? (
              <button
                className="mh-icon-action danger"
                type="button"
                title={t("common.delete")}
                onClick={() => {
                  if (window.confirm(t("common.confirmDelete"))) {
                    deleteLocalRow(collection, row);
                  }
                }}
              >
                <Trash2 size={16} />
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
        required={field.required || false}
        type={field.type || "text"}
      />
    </label>
  );
}

function CustomerCards({ cards, t }) {
  if (!cards.length) return <div className="mh-empty">{t("common.empty")}</div>;

  return (
    <div className="mh-card-grid">
      {cards.map((card) => (
        <article className="mh-member-card" key={card.id}>
          <div className="mh-member-card-head">
            <span>{card.shop_name}</span>
            <em>{card.tier}</em>
          </div>
          <h2>{card.card_number}</h2>
          <div className="mh-qr-wrap">
            <img alt={t("card.qr")} src={qrUrl(card.qr_payload || card.card_number)} />
            <div>
              <strong>{Number(card.points || 0).toLocaleString("vi-VN")} {t("common.points")}</strong>
              <p>{t("card.spend")}: {money(card.total_spend)}</p>
              <p>{t("card.expires")}: {card.expires_at || "-"}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ScanView({ cards, t }) {
  const [code, setCode] = useState(cards[0]?.card_number || "");
  const card = cards.find((item) => item.card_number.toLowerCase() === code.trim().toLowerCase());

  return (
    <div className="mh-grid two">
      <section className="mh-card">
        <PanelTitle icon={QrCode} title={t("scan.title")} />
        <label className="mh-scan-input">
          <ScanLine size={20} />
          <input value={code} placeholder={t("scan.placeholder")} onChange={(event) => setCode(event.target.value)} />
        </label>
        <div className="mh-scan-window">
          <QrCode size={88} />
        </div>
      </section>
      <section className="mh-card">
        <PanelTitle icon={UserRound} title={t("scan.result")} />
        {card ? (
          <div className="mh-scan-result">
            <img alt={t("card.qr")} src={qrUrl(card.qr_payload || card.card_number)} />
            <h2>{card.customer_name}</h2>
            <p>{card.shop_name}</p>
            <strong>{card.tier} - {Number(card.points || 0).toLocaleString("vi-VN")} {t("common.points")}</strong>
          </div>
        ) : <div className="mh-empty">{t("common.empty")}</div>}
      </section>
    </div>
  );
}

function Profile({ customers, t, updateLocalRow, user }) {
  const customer = customers[0];
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

  return (
    <section className="mh-card mh-profile">
      <div className="mh-avatar">{user.name?.charAt(0) || "M"}</div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <div className="mh-profile-extra">
        <span>{t("customer.phone")}: {user.phone || "-"}</span>
        <span>{t("shop.name")}: {customer?.shop_name || "-"}</span>
        <span>{t("customer.birthday")}: {customer?.birthday || "-"}</span>
        <span>{t("shop.address")}: {customer?.address || "-"}</span>
      </div>
      {customer ? (
        <form className="mh-form" onSubmit={submit}>
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
          <label>
            {t("shop.address")}
            <input name="address" defaultValue={customer.address || ""} />
          </label>
          <label>
            {t("customer.notes")}
            <textarea name="notes" defaultValue={customer.notes || ""} rows={3} />
          </label>
          {error ? <div className="mh-alert">{error}</div> : null}
          <button className="mh-primary slim" type="submit" disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function PasswordModal({ onClose, onSubmit, t }) {
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
    <div className="mh-modal-backdrop" role="presentation">
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

function LoadingState({ t }) {
  return <div className="mh-empty loading"><Loader2 className="mh-spin" size={18} />{t("common.loading")}</div>;
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

function Stat({ label, value }) {
  return (
    <article className="mh-stat">
      <span>{label}</span>
      <strong>{value}</strong>
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
      linkColumn("store_url", t("common.link")),
      { key: "owner_name", label: t("shop.owner") },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email") },
      { key: "address", label: t("shop.address") },
      statusColumn
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
      linkColumn("customer_url", t("common.link")),
      { key: "shop_name", label: t("shop.name") },
      { key: "email", label: t("customer.email") },
      { key: "phone", label: t("customer.phone") },
      { key: "birthday", label: t("customer.birthday"), render: (row) => dateText(row.birthday) },
      { key: "gender", label: t("customer.gender") },
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
      { key: "discount_percent", label: t("level.discount"), render: (row) => `${row.discount_percent || 0}%` },
      { key: "benefits", label: t("level.benefits") },
      statusColumn
    ],
    transactions: [
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
  const shopOptions = optionList(data.shops, "id", (item) => `${item.name} #${item.id}`);
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
      { key: "name", label: t("shop.name") },
      { key: "owner_id", label: idLabel(t("shop.owner")), type: "number", options: ownerOptions },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email"), type: "email" },
      { key: "address", label: t("shop.address") },
      { key: "description", label: t("service.description"), multiline: true },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeLocked }
    ],
    shop: [
      { key: "name", label: t("shop.name") },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email"), type: "email" },
      { key: "address", label: t("shop.address") },
      { key: "description", label: t("service.description"), multiline: true },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeLocked }
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
      { key: "email", label: t("customer.email"), type: "email", required: true },
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
      { key: "duration_minutes", label: t("service.duration"), type: "number" },
      { key: "description", label: t("service.description"), multiline: true },
      { key: "status", label: t("common.status"), defaultValue: "active", options: statusOptions.activeInactive }
    ],
    cards: [
      { key: "shop_id", label: t("shop.name"), type: "number", options: shopOptions },
      { key: "customer_id", label: t("customer.name"), type: "number", options: customerOptions },
      { key: "card_number", label: t("card.number") },
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
      { key: "name", label: t("level.name") },
      { key: "min_points", label: t("common.points"), type: "number" },
      { key: "min_spend", label: t("card.spend"), type: "number" },
      { key: "discount_percent", label: t("level.discount"), type: "number" },
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
  const label = {
    active: t("common.active"),
    inactive: t("common.inactive"),
    locked: t("common.locked"),
    expired: t("common.expired"),
    read: t("common.read"),
    unread: t("common.unread")
  }[status] || status;

  return <span className={`mh-status ${status}`}>{label}</span>;
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

function qrUrl(value) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(value)}`;
}

function rankBy(rows, labelKey, valueKey) {
  const map = new Map();
  rows.forEach((row) => {
    const label = row[labelKey] || "-";
    map.set(label, (map.get(label) || 0) + Number(row[valueKey] || 0));
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function sumRecent(rows, days) {
  const min = Date.now() - days * 24 * 60 * 60 * 1000;
  return rows.reduce((sum, row) => {
    const created = new Date(row.created_at || 0).getTime();
    return created >= min ? sum + Number(row.amount || 0) : sum;
  }, 0);
}

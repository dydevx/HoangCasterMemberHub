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
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createTranslator as createNextIntlTranslator, NextIntlClientProvider } from "next-intl";
import { getMessagesForLocale } from "@/lib/memberhub/i18n";
import { createTranslator, locales } from "@/messages/memberhub";

const credentials = {
  admin: ["admin@example.com", "Admin@123"],
  owner: ["owner@example.com", "Owner@123"],
  customer: ["customer@example.com", "Customer@123"]
};

const navItems = {
  admin: [
    ["overview", "nav.overview", LayoutDashboard],
    ["shops", "nav.shops", Building2],
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
  owner: [
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
  admin: "app.admin",
  owner: "app.owner",
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

async function api(path, token, options = {}) {
  const response = await fetch(path, {
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

function readStored(key, fallback) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
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
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [view, setView] = useState("overview");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
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
    if (!savedToken) return;

    setToken(savedToken);
    setLoading(true);
    api("/api/me", savedToken)
      .then((payload) => {
        setUser(payload.user);
        setRole(payload.user.role);
        setLocale(payload.user.locale || readStored("memberhub_locale", "vi"));
        setView(payload.user.role === "customer" ? "cards" : "overview");
        return api("/api/app-data", savedToken);
      })
      .then(setData)
      .catch(() => {
        localStorage.removeItem("memberhub_token");
        setToken("");
      })
      .finally(() => setLoading(false));
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
          role,
          email: form.get("email"),
          password: form.get("password")
        })
      });

      localStorage.setItem("memberhub_token", payload.token);
      setToken(payload.token);
      setUser(payload.user);
      setLocale(payload.user.locale || locale);
      setView(payload.user.role === "customer" ? "cards" : "overview");
      const nextData = await api("/api/app-data", payload.token);
      setData(nextData);
      if (payload.demo || nextData.demo) setToast(t("error.noSupabase"));
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
    setRole("");
    setView("overview");
  }

  function addLocalRow(collection, row) {
    setData((current) => ({
      ...current,
      [collection]: [{ ...row, id: `local-${Date.now()}`, status: "active" }, ...(current?.[collection] || [])]
    }));
    setToast(t("toast.saved"));
  }

  if (!role && !user) {
    return (
      <RoleEntry
        locale={locale}
        setLocale={setLocale}
        setTheme={setTheme}
        t={t}
        theme={theme}
        onSelect={(nextRole) => setRole(nextRole)}
      />
    );
  }

  if (!user) {
    return (
      <LoginScreen
        loading={loading}
        locale={locale}
        role={role}
        status={status}
        t={t}
        theme={theme}
        setLocale={setLocale}
        setTheme={setTheme}
        onBack={() => setRole("")}
        onSubmit={login}
      />
    );
  }

  const items = navItems[user.role] || navItems.customer;

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
            <LanguageSwitcher locale={locale} setLocale={setLocale} t={t} />
            <ThemeToggle setTheme={setTheme} t={t} theme={theme} />
            <span>{user.name}</span>
            <button type="button" onClick={logout} title={t("auth.logout")}>
              <LogOut size={17} aria-hidden="true" />
              <span>{t("auth.logout")}</span>
            </button>
          </div>
        </header>

        {data?.demo ? <DemoBanner t={t} /> : null}

        <main className="mh-view">
          {loading ? <LoadingState t={t} /> : null}
          {!loading && data ? (
            <DashboardView
              addLocalRow={addLocalRow}
              data={data}
              t={t}
              user={user}
              view={view}
            />
          ) : null}
          {!loading && !data ? <EmptyState t={t} /> : null}
        </main>
      </section>

      {toast ? <div className="mh-toast"><Check size={16} />{toast}</div> : null}
    </div>
  );
}

function Brand({ t, role }) {
  return (
    <div className="mh-brand">
      <span className="mh-mark">M</span>
      <div>
        <strong>{t("app.name")}</strong>
        <span>{t(roleKeys[role] || "app.tagline")}</span>
      </div>
    </div>
  );
}

function RoleEntry({ locale, setLocale, setTheme, t, theme, onSelect }) {
  return (
    <main className="mh-entry">
      <section className="mh-entry-panel">
        <div className="mh-entry-copy">
          <div className="mh-auth-brand">
            <span className="mh-mark">M</span>
            <div>
              <h1>{t("app.name")}</h1>
              <p>{t("app.tagline")}</p>
            </div>
          </div>
          <h2>{t("app.chooseWorkspace")}</h2>
          <p>{t("app.workspaceCopy")}</p>
          <div className="mh-entry-controls">
            <LanguageSwitcher locale={locale} setLocale={setLocale} t={t} />
            <ThemeToggle setTheme={setTheme} t={t} theme={theme} />
          </div>
        </div>
        <div className="mh-entry-grid">
          {[
            ["admin", "01", "app.admin", "app.adminCopy"],
            ["owner", "02", "app.owner", "app.ownerCopy"],
            ["customer", "03", "app.customer", "app.customerCopy"]
          ].map(([id, number, titleKey, textKey]) => (
            <button className={`mh-role-card ${id}`} key={id} onClick={() => onSelect(id)} type="button">
              <span>{number}</span>
              <strong>{t(titleKey)}</strong>
              <small>{t(textKey)}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function LoginScreen({ loading, locale, role, status, t, theme, setLocale, setTheme, onBack, onSubmit }) {
  const [email, password] = credentials[role] || ["", ""];

  return (
    <main className={`mh-auth role-${role}`}>
      <section className="mh-auth-panel">
        <button className="mh-back" type="button" onClick={onBack}>
          <ChevronLeft size={16} />
          {t("auth.back")}
        </button>
        <div className="mh-auth-brand">
          <span className="mh-mark">M</span>
          <div>
            <p>{t(roleKeys[role])}</p>
            <h1>{t("auth.login")}</h1>
          </div>
        </div>
        <form className="mh-form" onSubmit={onSubmit}>
          <label>
            {t("auth.email")}
            <input name="email" type="email" required defaultValue={email} />
          </label>
          <label>
            {t("auth.password")}
            <input name="password" type="password" required defaultValue={password} />
          </label>
          <div className="mh-form-row compact">
            <label className="mh-check">
              <input name="remember" type="checkbox" defaultChecked />
              {t("auth.remember")}
            </label>
            <button className="mh-link-button" type="button">{t("auth.forgot")}</button>
          </div>
          <p className="mh-muted">{t("auth.demo")}</p>
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

function DashboardView({ addLocalRow, view, user, data, t }) {
  if (view === "overview") return <Overview data={data} t={t} user={user} />;
  if (view === "reports") return <Reports data={data} t={t} />;
  if (view === "scan") return <ScanView cards={data.cards} t={t} />;
  if (view === "profile") return <Profile customers={data.customers} t={t} user={user} />;

  const key = tableMap[view];
  const rows = data[key] || [];

  if (view === "cards" && user.role === "customer") {
    return <CustomerCards cards={rows} t={t} />;
  }

  return (
    <ResourceTable
      addLocalRow={addLocalRow}
      columns={getColumns(view, t)}
      collection={key}
      rows={rows}
      t={t}
      view={view}
    />
  );
}

function Overview({ data, t, user }) {
  const revenue = data.transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const points = data.cards.reduce((sum, item) => sum + Number(item.points || 0), 0);
  const returning = new Set(data.transactions.map((item) => item.customer_id)).size;
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

      <div className="mh-grid two">
        <section className="mh-card mh-chart-card">
          <PanelTitle icon={FileText} title={t("dashboard.topServices")} />
          <BarChart rows={topServices} />
        </section>
        <section className="mh-card">
          <PanelTitle icon={ShieldCheck} title={t("dashboard.tenantIsolation")} />
          <p className="mh-muted">{t("dashboard.tenantCopy")}</p>
          <div className="mh-security-list">
            <span><Check size={16} /> {t("security.shopScope")}</span>
            <span><Check size={16} /> {t("security.rls")}</span>
            <span><Check size={16} /> {t("security.rbac")}</span>
            <span><Check size={16} /> {t("security.jwt")}</span>
          </div>
          <div className="mh-returning">
            <strong>{returning}</strong>
            <span>{t("dashboard.returning")}</span>
          </div>
        </section>
      </div>

      <section className="mh-card">
        <PanelTitle icon={ReceiptText} title={t("dashboard.recentTransactions")} />
        <ResourceTable
          columns={getColumns("transactions", t)}
          compact
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
          <ResourceTable compact columns={getColumns("transactions", t)} rows={data.transactions} t={t} view="transactions" />
        </section>
      </div>
    </>
  );
}

function ResourceTable({ addLocalRow, collection, columns, compact = false, rows, t, view }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const pageSize = compact ? 6 : 8;

  const statuses = useMemo(() => ["all", ...new Set(rows.map((row) => row.status).filter(Boolean))], [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesText = !needle || Object.values(row).join(" ").toLowerCase().includes(needle);
      const matchesStatus = status === "all" || row.status === status;
      return matchesText && matchesStatus;
    });
  }, [query, rows, status]);

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
          {collection && addLocalRow ? (
            <button className="mh-primary slim" type="button" onClick={() => setModal(true)}>
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
              {!compact ? <th>{t("common.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : formatCell(row[column.key])}</td>
                ))}
                {!compact ? (
                  <td>
                    <button className="mh-icon-action" type="button" title={t("common.edit")}>
                      <Settings size={16} />
                    </button>
                  </td>
                ) : null}
              </tr>
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

      {modal ? (
        <CreateModal
          columns={columns}
          onClose={() => setModal(false)}
          onSave={(row) => {
            addLocalRow(collection, row);
            setModal(false);
          }}
          t={t}
        />
      ) : null}
    </div>
  );
}

function CreateModal({ columns, onClose, onSave, t }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const row = {};
    columns.slice(0, 5).forEach((column) => {
      row[column.key] = form.get(column.key) || "";
    });
    onSave(row);
  }

  return (
    <div className="mh-modal-backdrop" role="presentation">
      <section className="mh-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{t("common.add")}</h2>
          <button type="button" onClick={onClose} title={t("common.cancel")}><X size={18} /></button>
        </header>
        <form className="mh-form" onSubmit={submit}>
          {columns.slice(0, 5).map((column) => (
            <label key={column.key}>
              {column.label}
              <input name={column.key} placeholder={column.label} />
            </label>
          ))}
          <div className="mh-modal-actions">
            <button className="mh-tool-button" type="button" onClick={onClose}>{t("common.cancel")}</button>
            <button className="mh-primary slim" type="submit">{t("common.save")}</button>
          </div>
        </form>
      </section>
    </div>
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

function Profile({ customers, t, user }) {
  const customer = customers[0];
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
    </section>
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

function DemoBanner({ t }) {
  return (
    <div className="mh-demo-banner">
      <ShieldCheck size={18} />
      <span>{t("error.noSupabase")}</span>
    </div>
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

function getColumns(view, t) {
  const statusColumn = { key: "status", label: t("common.status"), render: (row) => <StatusBadge value={row.status} /> };
  const columns = {
    shops: [
      { key: "name", label: t("shop.name") },
      { key: "owner_name", label: t("shop.owner") },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email") },
      { key: "address", label: t("shop.address") },
      statusColumn
    ],
    shop: [
      { key: "name", label: t("shop.name") },
      { key: "owner_name", label: t("shop.owner") },
      { key: "phone", label: t("shop.phone") },
      { key: "email", label: t("shop.email") },
      { key: "address", label: t("shop.address") },
      statusColumn
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
      { key: "status", label: t("common.status"), render: (row) => <StatusBadge value={row.status} /> },
      { key: "created_at", label: t("promotion.dates"), render: (row) => dateText(row.created_at) }
    ],
    settings: [
      { key: "key", label: t("nav.settings") },
      { key: "value", label: t("service.description") }
    ]
  };

  return columns[view] || columns.customers;
}

function StatusBadge({ value }) {
  return <span className={`mh-status ${value || "active"}`}>{value || "active"}</span>;
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

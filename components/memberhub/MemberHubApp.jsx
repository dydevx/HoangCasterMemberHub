"use client";

import {
  BadgePercent,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Scissors,
  UserRound,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const roleText = {
  admin: "Admin hệ thống",
  owner: "Chủ cửa hàng",
  customer: "Khách hàng"
};

const credentials = {
  admin: ["admin@example.com", "Admin@123"],
  owner: ["owner@example.com", "Owner@123"],
  customer: ["customer@example.com", "Customer@123"]
};

const navItems = {
  admin: [
    ["overview", "Tổng quan", LayoutDashboard],
    ["shops", "Cửa hàng", Building2],
    ["users", "Người dùng", UsersRound],
    ["customers", "Khách hàng", UserRound],
    ["services", "Dịch vụ", Scissors],
    ["cards", "Thẻ thành viên", CreditCard],
    ["transactions", "Giao dịch", ReceiptText],
    ["promotions", "Ưu đãi", BadgePercent]
  ],
  owner: [
    ["overview", "Tổng quan", LayoutDashboard],
    ["shop", "Cửa hàng", Building2],
    ["customers", "Khách hàng", UserRound],
    ["services", "Dịch vụ", Scissors],
    ["cards", "Thẻ thành viên", CreditCard],
    ["transactions", "Giao dịch", ReceiptText],
    ["promotions", "Ưu đãi", BadgePercent]
  ],
  customer: [
    ["cards", "Thẻ của tôi", CreditCard],
    ["services", "Dịch vụ", Scissors],
    ["transactions", "Lịch sử", ReceiptText],
    ["promotions", "Ưu đãi", BadgePercent],
    ["profile", "Hồ sơ", UserRound]
  ]
};

const titles = {
  overview: "Tổng quan",
  shops: "Quản lý cửa hàng",
  shop: "Thông tin cửa hàng",
  users: "Quản lý người dùng",
  customers: "Quản lý khách hàng",
  services: "Quản lý dịch vụ",
  cards: "Thẻ thành viên",
  transactions: "Lịch sử giao dịch",
  promotions: "Chương trình ưu đãi",
  profile: "Thông tin cá nhân"
};

function money(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
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
    throw new Error(payload.error || payload.message || "Không thể tải dữ liệu.");
  }

  return payload;
}

export function MemberHubApp() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [view, setView] = useState("overview");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("memberhub_token") || "";
    if (!savedToken) return;

    setToken(savedToken);
    setLoading(true);
    api("/api/me", savedToken)
      .then((payload) => {
        setUser(payload.user);
        setRole(payload.user.role);
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
      setView(payload.user.role === "customer" ? "cards" : "overview");
      setData(await api("/api/app-data", payload.token));
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

  if (!role && !user) {
    return <RoleEntry onSelect={(nextRole) => setRole(nextRole)} />;
  }

  if (!user) {
    return (
      <LoginScreen
        role={role}
        loading={loading}
        status={status}
        onBack={() => setRole("")}
        onSubmit={login}
      />
    );
  }

  const items = navItems[user.role] || navItems.customer;

  return (
    <div className="mh-shell">
      <aside className="mh-sidebar">
        <div className="mh-brand">
          <span className="mh-mark">M</span>
          <div>
            <strong>MemberHub</strong>
            <span>{roleText[user.role]}</span>
          </div>
        </div>
        <nav className="mh-nav">
          {items.map(([id, label, Icon]) => (
            <button
              className={view === id ? "active" : ""}
              key={id}
              onClick={() => setView(id)}
              type="button"
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="mh-workspace">
        <header className="mh-topbar">
          <div>
            <p>{roleText[user.role]}</p>
            <h1>{titles[view]}</h1>
          </div>
          <div className="mh-account">
            <span>{user.name}</span>
            <button type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="mh-view">
          {loading ? <div className="mh-empty">Đang tải dữ liệu...</div> : null}
          {!loading && data ? <DashboardView view={view} user={user} data={data} /> : null}
          {!loading && !data ? (
            <div className="mh-empty">
              <h2>Chưa có dữ liệu</h2>
              <p>Hãy chạy `database/supabase_schema.sql` trong Supabase SQL Editor rồi tải lại trang.</p>
            </div>
          ) : null}
        </main>
      </section>
    </div>
  );
}

function RoleEntry({ onSelect }) {
  return (
    <main className="mh-entry">
      <section className="mh-entry-panel">
        <div className="mh-auth-brand">
          <span className="mh-mark">M</span>
          <div>
            <h1>MemberHub</h1>
            <p>Quản lý hội viên đa cửa hàng</p>
          </div>
        </div>
        <div className="mh-entry-copy">
          <h2>Chọn khu vực làm việc</h2>
          <p>Mỗi vai trò có dữ liệu và thao tác riêng, giống giao diện HTML cũ nhưng chạy bằng Next.js.</p>
        </div>
        <div className="mh-entry-grid">
          {[
            ["admin", "01", "Admin hệ thống", "Quản lý cửa hàng, tài khoản và dữ liệu toàn hệ thống."],
            ["owner", "02", "Chủ cửa hàng", "Quản lý khách hàng, dịch vụ, thẻ và giao dịch của cửa hàng."],
            ["customer", "03", "Khách hàng", "Xem thẻ thành viên, điểm tích lũy, lịch sử và ưu đãi."]
          ].map(([id, number, title, text]) => (
            <button className={`mh-role-card ${id}`} key={id} onClick={() => onSelect(id)} type="button">
              <span>{number}</span>
              <strong>{title}</strong>
              <small>{text}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function LoginScreen({ role, loading, status, onBack, onSubmit }) {
  const [email, password] = credentials[role] || ["", ""];

  return (
    <main className={`mh-auth role-${role}`}>
      <section className="mh-auth-panel">
        <button className="mh-back" type="button" onClick={onBack}>
          Quay lại
        </button>
        <div className="mh-auth-brand">
          <span className="mh-mark">M</span>
          <div>
            <p>{roleText[role]}</p>
            <h1>Đăng nhập {roleText[role]}</h1>
          </div>
        </div>
        <form className="mh-form" onSubmit={onSubmit}>
          <label>
            Email
            <input name="email" type="email" required defaultValue={email} />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" required defaultValue={password} />
          </label>
          {status ? <div className="mh-alert">{status}</div> : null}
          <button className="mh-primary" disabled={loading} type="submit">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

function DashboardView({ view, user, data }) {
  if (view === "overview") return <Overview data={data} />;
  if (view === "shop") return <DataTable rows={data.shops} columns={shopColumns} />;
  if (view === "shops") return <DataTable rows={data.shops} columns={shopColumns} />;
  if (view === "users") return <DataTable rows={data.users} columns={userColumns} />;
  if (view === "customers") return <DataTable rows={data.customers} columns={customerColumns} />;
  if (view === "services") return <DataTable rows={data.services} columns={serviceColumns} />;
  if (view === "cards") return user.role === "customer" ? <CustomerCards cards={data.cards} /> : <DataTable rows={data.cards} columns={cardColumns} />;
  if (view === "transactions") return <DataTable rows={data.transactions} columns={transactionColumns} />;
  if (view === "promotions") return <DataTable rows={data.promotions} columns={promotionColumns} />;
  if (view === "profile") return <Profile user={user} customers={data.customers} />;

  return null;
}

function Overview({ data }) {
  const revenue = data.transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const points = data.cards.reduce((sum, item) => sum + Number(item.points || 0), 0);

  return (
    <>
      <div className="mh-stats">
        <Stat label="Cửa hàng" value={data.shops.length} />
        <Stat label="Khách hàng" value={data.customers.length} />
        <Stat label="Thẻ thành viên" value={data.cards.length} />
        <Stat label="Doanh thu" value={money(revenue)} />
        <Stat label="Tổng điểm" value={points.toLocaleString("vi-VN")} />
      </div>
      <section className="mh-card">
        <h2>Giao dịch gần đây</h2>
        <DataTable rows={data.transactions.slice(0, 5)} columns={transactionColumns} compact />
      </section>
    </>
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

function CustomerCards({ cards }) {
  if (!cards.length) {
    return <div className="mh-empty">Chưa có thẻ thành viên.</div>;
  }

  return (
    <div className="mh-card-grid">
      {cards.map((card) => (
        <article className="mh-member-card" key={card.id}>
          <span>{card.shop_name}</span>
          <h2>{card.card_number}</h2>
          <div>
            <strong>{card.points} điểm</strong>
            <em>{card.tier}</em>
          </div>
          <p>Hạn thẻ: {card.expires_at || "Không giới hạn"}</p>
        </article>
      ))}
    </div>
  );
}

function Profile({ user, customers }) {
  const customer = customers[0];

  return (
    <section className="mh-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>{user.phone || "Chưa có số điện thoại"}</p>
      {customer ? (
        <div className="mh-profile-extra">
          <span>Cửa hàng: {customer.shop_name}</span>
          <span>Ngày sinh: {customer.birthday || "Chưa cập nhật"}</span>
          <span>Địa chỉ: {customer.address || "Chưa cập nhật"}</span>
        </div>
      ) : null}
    </section>
  );
}

function DataTable({ rows, columns, compact = false }) {
  if (!rows?.length) {
    return <div className="mh-empty">Chưa có dữ liệu.</div>;
  }

  return (
    <div className={`mh-table-wrap ${compact ? "compact" : ""}`}>
      <table className="mh-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key] || "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const shopColumns = [
  { key: "name", label: "Tên cửa hàng" },
  { key: "phone", label: "Điện thoại" },
  { key: "email", label: "Email" },
  { key: "address", label: "Địa chỉ" },
  { key: "status", label: "Trạng thái" }
];

const userColumns = [
  { key: "name", label: "Họ tên" },
  { key: "email", label: "Email" },
  { key: "role", label: "Vai trò" },
  { key: "phone", label: "Điện thoại" },
  { key: "status", label: "Trạng thái" }
];

const customerColumns = [
  { key: "name", label: "Khách hàng" },
  { key: "shop_name", label: "Cửa hàng" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Điện thoại" },
  { key: "birthday", label: "Ngày sinh" }
];

const serviceColumns = [
  { key: "name", label: "Dịch vụ" },
  { key: "shop_name", label: "Cửa hàng" },
  { key: "price", label: "Giá", render: (row) => money(row.price) },
  { key: "duration_minutes", label: "Thời lượng" },
  { key: "status", label: "Trạng thái" }
];

const cardColumns = [
  { key: "card_number", label: "Số thẻ" },
  { key: "customer_name", label: "Khách hàng" },
  { key: "shop_name", label: "Cửa hàng" },
  { key: "points", label: "Điểm" },
  { key: "tier", label: "Hạng" },
  { key: "status", label: "Trạng thái" }
];

const transactionColumns = [
  { key: "customer_name", label: "Khách hàng" },
  { key: "service_name", label: "Dịch vụ" },
  { key: "shop_name", label: "Cửa hàng" },
  { key: "amount", label: "Số tiền", render: (row) => money(row.amount) },
  { key: "points_delta", label: "Điểm" },
  { key: "note", label: "Ghi chú" }
];

const promotionColumns = [
  { key: "title", label: "Ưu đãi" },
  { key: "shop_name", label: "Cửa hàng" },
  { key: "discount_percent", label: "Giảm %" },
  { key: "start_date", label: "Bắt đầu" },
  { key: "end_date", label: "Kết thúc" },
  { key: "status", label: "Trạng thái" }
];

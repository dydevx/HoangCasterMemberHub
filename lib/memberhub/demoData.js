export const demoCredentials = {
  admin: { email: "admin@example.com", password: "Admin@123" },
  owner: { email: "owner@example.com", password: "Owner@123" },
  customer: { email: "customer@example.com", password: "Customer@123" }
};

export const demoUsers = [
  { id: 1, name: "System Admin", email: demoCredentials.admin.email, role: "admin", status: "active", phone: "0900000001", locale: "vi" },
  { id: 2, name: "Chủ Lumi Spa", email: demoCredentials.owner.email, role: "owner", status: "active", phone: "0900000002", locale: "vi" },
  { id: 3, name: "Nguyễn Minh Anh", email: demoCredentials.customer.email, role: "customer", status: "active", phone: "0900000003", locale: "vi" },
  { id: 4, name: "Chủ Nova Fitness", email: "nova.owner@example.com", role: "owner", status: "active", phone: "0900000004", locale: "vi" }
];

export const demoShops = [
  { id: 1, name: "Lumi Spa Quận 1", slug: "lumi-spa-quan-1", address: "12 Nguyễn Huệ, Quận 1, TP.HCM", phone: "028 1111 2222", email: "hello@lumispa.vn", owner_id: 2, status: "active", industry: "Spa" },
  { id: 2, name: "Nova Fitness Thủ Đức", slug: "nova-fitness-thu-duc", address: "88 Võ Văn Ngân, TP. Thủ Đức", phone: "028 3333 4444", email: "team@novafit.vn", owner_id: 4, status: "active", industry: "Gym" },
  { id: 3, name: "Pearl Nail Đà Nẵng", slug: "pearl-nail-studio", address: "45 Lê Lợi, Đà Nẵng", phone: "0236 111 999", email: "care@pearlnail.vn", owner_id: 2, status: "active", industry: "Nail Salon" }
];

export const demoCustomers = [
  { id: 1, user_id: 3, shop_id: 1, name: "Nguyễn Minh Anh", email: "customer@example.com", phone: "0900000003", birthday: "1996-05-14", gender: "Nữ", address: "Quận Bình Thạnh, TP.HCM", notes: "Ưu tiên lịch cuối tuần", avatar_url: "", status: "active", created_at: "2026-06-01T09:00:00Z" },
  { id: 2, user_id: null, shop_id: 1, name: "Trần Quốc Bảo", email: "bao.tran@example.com", phone: "0900000004", birthday: "1992-09-20", gender: "Nam", address: "Quận 3, TP.HCM", notes: "Ứng viên nâng hạng Gold", avatar_url: "", status: "active", created_at: "2026-06-03T10:00:00Z" },
  { id: 3, user_id: null, shop_id: 2, name: "Lê Thu Hà", email: "ha.le@example.com", phone: "0900000005", birthday: "1998-02-11", gender: "Nữ", address: "Thủ Đức, TP.HCM", notes: "Tập PT mỗi thứ ba", avatar_url: "", status: "active", created_at: "2026-06-07T11:00:00Z" },
  { id: 4, user_id: null, shop_id: 3, name: "Phạm Gia Linh", email: "linh.pham@example.com", phone: "0900000006", birthday: "1994-12-02", gender: "Nữ", address: "Hải Châu, Đà Nẵng", notes: "Thành viên nail art", avatar_url: "", status: "active", created_at: "2026-06-10T11:20:00Z" }
];

export const demoServices = [
  { id: 1, shop_id: 1, name: "Chăm sóc da cơ bản", price: 450000, duration_minutes: 60, description: "Làm sạch sâu, đắp mặt nạ và massage mặt.", image_url: "/assets/beauty-hero.png", status: "active" },
  { id: 2, shop_id: 1, name: "Massage đá nóng", price: 650000, duration_minutes: 75, description: "Liệu trình thư giãn toàn thân cao cấp.", image_url: "/assets/beauty-hero.png", status: "active" },
  { id: 3, shop_id: 2, name: "Huấn luyện cá nhân 1:1", price: 900000, duration_minutes: 60, description: "Huấn luyện riêng theo mục tiêu sức khỏe.", image_url: "/assets/beauty-hero.png", status: "active" },
  { id: 4, shop_id: 3, name: "Sơn gel chăm móng", price: 320000, duration_minutes: 50, description: "Chăm sóc móng và sơn gel bền màu.", image_url: "/assets/beauty-hero.png", status: "active" }
];

export const demoLevels = [
  { id: 1, shop_id: 1, name: "Bronze", min_points: 0, min_spend: 0, discount_percent: 0, benefits: "Base points and birthday message", status: "active" },
  { id: 2, shop_id: 1, name: "Silver", min_points: 100, min_spend: 1000000, discount_percent: 5, benefits: "Priority booking and 5% service discount", status: "active" },
  { id: 3, shop_id: 1, name: "Gold", min_points: 500, min_spend: 5000000, discount_percent: 12, benefits: "VIP booking, 12% discount, birthday gift", status: "active" },
  { id: 4, shop_id: 2, name: "Diamond", min_points: 1200, min_spend: 12000000, discount_percent: 18, benefits: "Dedicated coach review and premium offers", status: "active" }
];

export const demoCards = [
  { id: 1, customer_id: 1, shop_id: 1, card_number: "MC001IMPORT001", qr_payload: "memberhub://card/MC001IMPORT001", points: 720, tier: "Gold", total_spend: 7100000, issued_at: "2026-01-01", expires_at: "2027-12-31", status: "active" },
  { id: 2, customer_id: 2, shop_id: 1, card_number: "MC001IMPORT002", qr_payload: "memberhub://card/MC001IMPORT002", points: 180, tier: "Silver", total_spend: 1800000, issued_at: "2026-02-01", expires_at: "2027-12-31", status: "active" },
  { id: 3, customer_id: 3, shop_id: 2, card_number: "MC002FIT001", qr_payload: "memberhub://card/MC002FIT001", points: 1320, tier: "Diamond", total_spend: 14600000, issued_at: "2026-03-01", expires_at: "2027-12-31", status: "active" },
  { id: 4, customer_id: 4, shop_id: 3, card_number: "MC003NAIL001", qr_payload: "memberhub://card/MC003NAIL001", points: 260, tier: "Silver", total_spend: 2400000, issued_at: "2026-04-01", expires_at: "2027-12-31", status: "active" }
];

export const demoTransactions = [
  { id: 1, customer_id: 1, shop_id: 1, service_id: 1, price: 450000, discount: 0, tax: 0, amount: 450000, points_delta: 45, note: "Facial care points", created_at: "2026-06-11T08:00:00Z" },
  { id: 2, customer_id: 1, shop_id: 1, service_id: 2, price: 650000, discount: 97500, tax: 0, amount: 552500, points_delta: 55, note: "Gold member discount", created_at: "2026-06-17T09:00:00Z" },
  { id: 3, customer_id: 2, shop_id: 1, service_id: 1, price: 450000, discount: 0, tax: 0, amount: 450000, points_delta: 45, note: "New customer", created_at: "2026-06-18T10:00:00Z" },
  { id: 4, customer_id: 3, shop_id: 2, service_id: 3, price: 900000, discount: 162000, tax: 0, amount: 738000, points_delta: 73, note: "Diamond training session", created_at: "2026-06-18T13:00:00Z" },
  { id: 5, customer_id: 4, shop_id: 3, service_id: 4, price: 320000, discount: 16000, tax: 0, amount: 304000, points_delta: 30, note: "Gel manicure", created_at: "2026-06-19T03:00:00Z" }
];

export const demoPromotions = [
  { id: 1, shop_id: 1, title: "Gold Member Glow", description: "Discount for Gold tier and above.", type: "percent", discount_percent: 15, discount_amount: 0, service_id: 2, start_date: "2026-06-01", end_date: "2026-07-01", status: "active" },
  { id: 2, shop_id: 2, title: "First Training Month", description: "Intro offer for new training clients.", type: "percent", discount_percent: 10, discount_amount: 0, service_id: 3, start_date: "2026-06-01", end_date: "2026-07-15", status: "active" },
  { id: 3, shop_id: 3, title: "Nail Art Bundle", description: "Fixed discount for manicure bundles.", type: "amount", discount_percent: 0, discount_amount: 50000, service_id: 4, start_date: "2026-06-05", end_date: "2026-06-30", status: "active" }
];

export const demoActivityLogs = [
  { id: 1, shop_id: 1, actor_name: "System Admin", action: "created.membership_card", entity_type: "membership_card", entity_id: "MC001IMPORT001", created_at: "2026-06-18T09:00:00Z" },
  { id: 2, shop_id: 1, actor_name: "Lumi Spa Owner", action: "updated.promotion", entity_type: "promotion", entity_id: "1", created_at: "2026-06-18T12:15:00Z" },
  { id: 3, shop_id: 2, actor_name: "Nova Fitness Owner", action: "exported.report", entity_type: "report", entity_id: "monthly", created_at: "2026-06-19T01:10:00Z" }
];

export const demoNotifications = [
  { id: 1, shop_id: 1, user_id: 2, title: "Gold promotion is active", body: "15% offer is visible to Gold members.", status: "unread", created_at: "2026-06-18T08:00:00Z" },
  { id: 2, shop_id: 1, user_id: 3, title: "You earned 55 points", body: "Hot Stone Massage transaction was recorded.", status: "unread", created_at: "2026-06-17T09:10:00Z" },
  { id: 3, shop_id: 2, user_id: 4, title: "Revenue report ready", body: "June report has been refreshed.", status: "read", created_at: "2026-06-19T01:20:00Z" }
];

export const demoSettings = [
  { id: 1, shop_id: 1, key: "points_rate", value: "1 point per 10,000 VND" },
  { id: 2, shop_id: 1, key: "storage_bucket", value: "memberhub-assets" },
  { id: 3, shop_id: null, key: "auth_provider", value: "Supabase Auth ready" },
  { id: 4, shop_id: null, key: "rls", value: "shop_id policies enabled" }
];

export const supportedLanguages = [
  { id: "en", name: "English", enabled: true },
  { id: "vi", name: "Tiếng Việt", enabled: true },
  { id: "es", name: "Espanol", enabled: true },
  { id: "it", name: "Italiano", enabled: true },
  { id: "pt", name: "Portugues", enabled: true },
  { id: "nl", name: "Nederlands", enabled: true },
  { id: "pl", name: "Polski", enabled: true },
  { id: "cs", name: "Cestina", enabled: true },
  { id: "fr", name: "Francais", enabled: true },
  { id: "de", name: "Deutsch", enabled: true },
  { id: "sv", name: "Svenska", enabled: true },
  { id: "no", name: "Norsk", enabled: true },
  { id: "da", name: "Dansk", enabled: true },
  { id: "fi", name: "Suomi", enabled: true },
  { id: "el", name: "Greek", enabled: true },
  { id: "ro", name: "Romana", enabled: true },
  { id: "hu", name: "Magyar", enabled: true },
  { id: "sk", name: "Slovencina", enabled: true },
  { id: "sl", name: "Slovenscina", enabled: true },
  { id: "hr", name: "Hrvatski", enabled: true },
  { id: "bg", name: "Bulgarian", enabled: true },
  { id: "uk", name: "Ukrainian", enabled: true },
  { id: "ru", name: "Russian", enabled: true },
  { id: "tr", name: "Turkce", enabled: true },
  { id: "et", name: "Eesti", enabled: true },
  { id: "lv", name: "Latviesu", enabled: true },
  { id: "lt", name: "Lietuviu", enabled: true },
  { id: "ga", name: "Irish", enabled: true },
  { id: "is", name: "Islenska", enabled: true },
  { id: "ja", name: "Japanese", enabled: true },
  { id: "ko", name: "Korean", enabled: true }
];

export const demoLanguages = supportedLanguages;

export function getDemoUserById(id) {
  return demoUsers.find((user) => String(user.id) === String(id)) || null;
}

export function getDemoUserByEmail(email) {
  return demoUsers.find((user) => user.email.toLowerCase() === String(email || "").toLowerCase()) || null;
}

export function getDemoPasswordForRole(role) {
  return demoCredentials[role]?.password || "";
}

export function getDemoRawData() {
  return {
    shops: demoShops,
    users: demoUsers,
    customers: demoCustomers,
    services: demoServices,
    levels: demoLevels,
    cards: demoCards,
    transactions: demoTransactions,
    promotions: demoPromotions,
    activityLogs: demoActivityLogs,
    notifications: demoNotifications,
    settings: demoSettings,
    languages: demoLanguages
  };
}

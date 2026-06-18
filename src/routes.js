const { createCardNumber, createUser, monthRange, normalizeEmail, uniqueCustomerSlug, uniqueShopSlug, updateUserPassword } = require('./db');
const { signToken, verifyPassword, verifyToken } = require('./auth');
const { createQrSvg } = require('./qr');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function handleApi(req, res, db) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    const method = req.method || 'GET';

    if (method === 'POST' && path === '/api/auth/login') {
      return await login(req, res, db);
    }

    if (method === 'POST' && path === '/api/auth/register') {
      return await register(req, res, db);
    }

    if (method === 'GET' && path === '/api/public/shops') {
      return json(res, 200, {
        shops: await db.all(`
          SELECT id, name, slug
          FROM shops
          WHERE status = 'active'
          ORDER BY name
        `)
      });
    }

    if (method === 'GET' && path === '/api/qr') {
      return qr(res, url.searchParams.get('text'));
    }

    if (method === 'GET' && path.startsWith('/api/public/portal/')) {
      return json(res, 200, await publicPortal(db, path));
    }

    const user = await authenticate(req, db);

    if (method === 'GET' && path === '/api/me') {
      return json(res, 200, { user: publicUser(user), defaults: demoAccounts() });
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      return json(res, 200, { ok: true });
    }

    if (method === 'GET' && path === '/api/app-data') {
      return json(res, 200, await getAppData(db, user));
    }

    if (method === 'GET' && path === '/api/backup') {
      return json(res, 200, await backupData(db, user));
    }

    const purchaseMatch = path.match(/^\/api\/customer\/services\/(\d+)\/purchase$/);
    if (method === 'POST' && purchaseMatch) {
      return await purchaseCustomerService(req, res, db, user, Number(purchaseMatch[1]));
    }

    const route = routeMatch(path);
    if (route.resource === 'shops') return await handleShops(req, res, db, user, route);
    if (route.resource === 'users') return await handleUsers(req, res, db, user, route);
    if (route.resource === 'customers') return await handleCustomers(req, res, db, user, route);
    if (route.resource === 'services') return await handleServices(req, res, db, user, route);
    if (route.resource === 'cards') return await handleCards(req, res, db, user, route);
    if (route.resource === 'transactions') return await handleTransactions(req, res, db, user, route);
    if (route.resource === 'promotions') return await handlePromotions(req, res, db, user, route);

    if (method === 'PUT' && path === '/api/customer/profile') {
      return await handleCustomerProfile(req, res, db, user);
    }

    throw new HttpError(404, 'Khong tim thay API');
  } catch (error) {
    const status = error.status || 500;
    json(res, status, { error: status === 500 ? 'Loi server' : error.message });
    if (status === 500) {
      console.error(error);
    }
  }
}

async function login(req, res, db) {
  const body = await readJson(req);
  const user = await db.get('SELECT * FROM users WHERE email = ?', [normalizeEmail(body.email)]);

  if (!user || !verifyPassword(body.password || '', user.password_salt, user.password_hash)) {
    throw new HttpError(401, 'Email hoac mat khau khong dung');
  }

  if (body.role && user.role !== body.role) {
    throw new HttpError(403, 'Tai khoan khong thuoc khu vuc dang nhap nay');
  }

  if (user.status !== 'active') {
    throw new HttpError(403, 'Tai khoan dang bi khoa');
  }

  if (user.role === 'owner') {
    const shop = await db.get('SELECT status FROM shops WHERE owner_id = ? LIMIT 1', [user.id]);
    if (shop && shop.status !== 'active') {
      throw new HttpError(403, 'Cua hang dang bi khoa');
    }
  }

  json(res, 200, {
    token: signToken({ sub: user.id, role: user.role }),
    user: publicUser(user)
  });
}

async function register(req, res, db) {
  const body = await readJson(req);
  const role = body.role === 'owner' ? 'owner' : 'customer';
  const email = normalizeEmail(body.email);

  requireFields(body, ['name', 'email', 'password']);
  if (String(body.password).length < 6) {
    throw new HttpError(400, 'Mat khau can toi thieu 6 ky tu');
  }

  const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (existing && role === 'owner') {
    throw new HttpError(409, 'Email da duoc su dung');
  }
  if (existing && existing.role !== 'customer') {
    throw new HttpError(409, 'Email da thuoc tai khoan khong phai khach hang');
  }
  if (existing && !verifyPassword(body.password || '', existing.password_salt, existing.password_hash)) {
    throw new HttpError(401, 'Email da co tai khoan. Vui long nhap dung mat khau de dang ky them cua hang');
  }
  if (existing && existing.status !== 'active') {
    throw new HttpError(403, 'Tai khoan dang bi khoa');
  }

  const userId = await db.transaction(async (tx) => {
    let createdUserId = existing?.id || null;

    if (!createdUserId) {
      createdUserId = await createUser(tx, {
        name: clean(body.name),
        email,
        password: body.password,
        role,
        phone: body.phone || ''
      });
    } else {
      await tx.run(`
        UPDATE users
        SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        clean(body.name) || existing.name,
        clean(body.phone) || existing.phone || '',
        createdUserId
      ]);
    }

    if (role === 'owner') {
      requireFields(body, ['shop_name']);
      const shop = await tx.run(`
        INSERT INTO shops (name, address, phone, email, description, owner_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        clean(body.shop_name),
        clean(body.shop_address),
        clean(body.shop_phone || body.phone),
        clean(body.shop_email || body.email),
        clean(body.shop_description),
        createdUserId
      ]);
      await tx.run('UPDATE shops SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        await uniqueShopSlug(tx, body.shop_slug || body.shop_name, shop.lastInsertId),
        shop.lastInsertId
      ]);
    } else {
      const shopId = toId(body.shop_id, 'Vui long chon cua hang');
      const shop = await tx.get('SELECT id, status FROM shops WHERE id = ?', [shopId]);
      if (!shop) throw new HttpError(404, 'Cua hang khong ton tai');
      if (shop.status !== 'active') throw new HttpError(403, 'Cua hang dang bi khoa');

      const existingMembership = await tx.get(`
        SELECT id
        FROM customers
        WHERE user_id = ? AND shop_id = ?
        LIMIT 1
      `, [createdUserId, shopId]);
      if (existingMembership) {
        throw new HttpError(409, 'Tai khoan nay da la thanh vien cua cua hang da chon');
      }

      const customer = await tx.run(`
        INSERT INTO customers (user_id, shop_id, name, email, phone, birthday, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        createdUserId,
        shopId,
        clean(body.name),
        email,
        clean(body.phone),
        clean(body.birthday) || null,
        clean(body.address)
      ]);
      await tx.run('UPDATE customers SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        await uniqueCustomerSlug(tx, shopId, body.slug || body.name, customer.lastInsertId),
        customer.lastInsertId
      ]);

      await tx.run(`
        INSERT INTO membership_cards (customer_id, shop_id, card_number, points, tier, expires_at)
        VALUES (?, ?, ?, 0, 'Silver', ?)
      `, [customer.lastInsertId, shopId, createCardNumber(shopId), addYears(1)]);
    }

    return createdUserId;
  });

  const created = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  json(res, 201, {
    token: signToken({ sub: created.id, role: created.role }),
    user: publicUser(created)
  });
}

async function authenticate(req, db) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, 'Can dang nhap');

  let payload;
  try {
    payload = verifyToken(match[1]);
  } catch {
    throw new HttpError(401, 'Phien dang nhap khong hop le');
  }

  const user = await db.get('SELECT * FROM users WHERE id = ?', [payload.sub]);
  if (!user) throw new HttpError(401, 'Tai khoan khong ton tai');
  if (user.status !== 'active') throw new HttpError(403, 'Tai khoan dang bi khoa');
  return user;
}

async function getAppData(db, user) {
  if (user.role === 'admin') {
    const customers = await customersQuery(db);
    return {
      user: publicUser(user),
      role: user.role,
      stats: await adminStats(db),
      shops: await adminShops(db),
      users: await adminUsers(db),
      customers,
      services: await servicesQuery(db),
      cards: await cardsQuery(db),
      transactions: await transactionsQuery(db),
      promotions: await promotionsQuery(db),
      birthdayReminders: birthdayReminders(customers)
    };
  }

  if (user.role === 'owner') {
    const shop = await ownerShop(db, user);
    const customers = await customersQuery(db, shop.id);
    return {
      user: publicUser(user),
      role: user.role,
      shop,
      stats: await ownerStats(db, shop.id),
      shops: [shop],
      customers,
      services: await servicesQuery(db, shop.id),
      cards: await cardsQuery(db, shop.id),
      transactions: await transactionsQuery(db, shop.id),
      promotions: await promotionsQuery(db, shop.id),
      birthdayReminders: birthdayReminders(customers)
    };
  }

  return await customerAppData(db, user);
}

async function adminStats(db) {
  const tx = await db.get(`
    SELECT COUNT(*) AS totalTransactions, COALESCE(SUM(amount), 0) AS totalRevenue
    FROM transactions
  `);

  const [shops, customers, services, promotions] = await Promise.all([
    db.get('SELECT COUNT(*) AS total FROM shops'),
    db.get('SELECT COUNT(*) AS total FROM customers'),
    db.get('SELECT COUNT(*) AS total FROM services'),
    db.get(`
      SELECT COUNT(*) AS total
      FROM promotions
      WHERE status = 'active'
        AND (start_date IS NULL OR DATE(start_date) <= CURRENT_DATE)
        AND (end_date IS NULL OR DATE(end_date) >= CURRENT_DATE)
    `)
  ]);

  return {
    totalShops: Number(shops.total || 0),
    totalCustomers: Number(customers.total || 0),
    totalTransactions: Number(tx.totalTransactions || 0),
    totalRevenue: Number(tx.totalRevenue || 0),
    totalServices: Number(services.total || 0),
    activePromotions: Number(promotions.total || 0)
  };
}

async function ownerStats(db, shopId) {
  const range = monthRange();
  const [tx, month, customers, services, points] = await Promise.all([
    db.get(`
      SELECT COUNT(*) AS totalTransactions, COALESCE(SUM(amount), 0) AS totalRevenue
      FROM transactions
      WHERE shop_id = ?
    `, [shopId]),
    db.get(`
      SELECT COALESCE(SUM(amount), 0) AS monthlyRevenue
      FROM transactions
      WHERE shop_id = ? AND created_at >= ? AND created_at < ?
    `, [shopId, range.start, range.end]),
    db.get('SELECT COUNT(*) AS total FROM customers WHERE shop_id = ?', [shopId]),
    db.get('SELECT COUNT(*) AS total FROM services WHERE shop_id = ?', [shopId]),
    db.get('SELECT COALESCE(SUM(points), 0) AS total FROM membership_cards WHERE shop_id = ?', [shopId])
  ]);

  return {
    totalCustomers: Number(customers.total || 0),
    totalServices: Number(services.total || 0),
    totalTransactions: Number(tx.totalTransactions || 0),
    totalRevenue: Number(tx.totalRevenue || 0),
    monthlyRevenue: Number(month.monthlyRevenue || 0),
    totalPoints: Number(points.total || 0)
  };
}

async function adminShops(db) {
  return await db.all(`
    SELECT s.*, u.name AS owner_name, u.email AS owner_email
    FROM shops s
    LEFT JOIN users u ON u.id = s.owner_id
    ORDER BY s.created_at DESC
  `);
}

async function adminUsers(db) {
  return await db.all(`
    SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.created_at,
           s.id AS shop_id, s.name AS shop_name
    FROM users u
    LEFT JOIN shops s ON s.owner_id = u.id
    ORDER BY u.created_at DESC
  `);
}

async function customersQuery(db, shopId) {
  const sql = `
    SELECT c.*, s.name AS shop_name, s.slug AS shop_slug, u.email AS login_email,
           mc.points AS card_points, mc.tier AS card_tier
    FROM customers c
    JOIN shops s ON s.id = c.shop_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN membership_cards mc ON mc.id = (
      SELECT latest.id
      FROM membership_cards latest
      WHERE latest.customer_id = c.id AND latest.shop_id = c.shop_id
      ORDER BY latest.id DESC
      LIMIT 1
    )
    ${shopId ? 'WHERE c.shop_id = ?' : ''}
    ORDER BY c.created_at DESC
  `;
  return shopId ? await db.all(sql, [shopId]) : await db.all(sql);
}

async function backupData(db, user) {
  requireRole(user, 'admin');
  const tables = ['shops', 'customers', 'services', 'membership_cards', 'transactions', 'promotions'];
  const data = {};
  for (const table of tables) {
    data[table] = await db.all(`SELECT * FROM ${table} ORDER BY id`);
  }
  data.users = await db.all(`
    SELECT id, name, email, role, status, phone, created_at, updated_at
    FROM users
    ORDER BY id
  `);
  return {
    exportedAt: new Date().toISOString(),
    database: process.env.DB_NAME || 'memberhub',
    note: 'Password hashes and salts are intentionally excluded.',
    data
  };
}

async function servicesQuery(db, shopId) {
  const sql = `
    SELECT sv.*, s.name AS shop_name
    FROM services sv
    JOIN shops s ON s.id = sv.shop_id
    ${shopId ? 'WHERE sv.shop_id = ?' : ''}
    ORDER BY sv.created_at DESC
  `;
  return shopId ? await db.all(sql, [shopId]) : await db.all(sql);
}

async function cardsQuery(db, shopId) {
  const sql = `
    SELECT mc.*, c.name AS customer_name, c.email AS customer_email, c.slug AS customer_slug,
           s.name AS shop_name, s.slug AS shop_slug
    FROM membership_cards mc
    JOIN customers c ON c.id = mc.customer_id
    JOIN shops s ON s.id = mc.shop_id
    ${shopId ? 'WHERE mc.shop_id = ?' : ''}
    ORDER BY mc.created_at DESC
  `;
  return shopId ? await db.all(sql, [shopId]) : await db.all(sql);
}

async function transactionsQuery(db, shopId) {
  const sql = `
    SELECT t.*, c.name AS customer_name, c.email AS customer_email,
           sv.name AS service_name, s.name AS shop_name
    FROM transactions t
    JOIN customers c ON c.id = t.customer_id
    JOIN shops s ON s.id = t.shop_id
    LEFT JOIN services sv ON sv.id = t.service_id
    ${shopId ? 'WHERE t.shop_id = ?' : ''}
    ORDER BY t.created_at DESC
  `;
  return shopId ? await db.all(sql, [shopId]) : await db.all(sql);
}

async function promotionsQuery(db, shopId) {
  const sql = `
    SELECT p.*, s.name AS shop_name
    FROM promotions p
    JOIN shops s ON s.id = p.shop_id
    ${shopId ? 'WHERE p.shop_id = ?' : ''}
    ORDER BY p.created_at DESC
  `;
  return shopId ? await db.all(sql, [shopId]) : await db.all(sql);
}

async function customerAppData(db, user) {
  const records = await db.all(`
    SELECT c.*, s.name AS shop_name, s.slug AS shop_slug, s.status AS shop_status
    FROM customers c
    JOIN shops s ON s.id = c.shop_id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `, [user.id]);

  const cards = await db.all(`
    SELECT mc.*, c.name AS customer_name, c.slug AS customer_slug,
           s.name AS shop_name, s.slug AS shop_slug
    FROM membership_cards mc
    JOIN customers c ON c.id = mc.customer_id
    JOIN shops s ON s.id = mc.shop_id
    WHERE c.user_id = ?
    ORDER BY mc.created_at DESC
  `, [user.id]);

  const services = await db.all(`
    SELECT DISTINCT sv.*, s.name AS shop_name
    FROM services sv
    JOIN shops s ON s.id = sv.shop_id
    JOIN customers c ON c.shop_id = sv.shop_id
    WHERE c.user_id = ? AND sv.status = 'active' AND s.status = 'active'
    ORDER BY sv.name
  `, [user.id]);

  const transactions = await db.all(`
    SELECT t.*, c.name AS customer_name, sv.name AS service_name, s.name AS shop_name
    FROM transactions t
    JOIN customers c ON c.id = t.customer_id
    JOIN shops s ON s.id = t.shop_id
    LEFT JOIN services sv ON sv.id = t.service_id
    WHERE c.user_id = ?
    ORDER BY t.created_at DESC
  `, [user.id]);

  const promotions = await db.all(`
    SELECT DISTINCT p.*, s.name AS shop_name
    FROM promotions p
    JOIN shops s ON s.id = p.shop_id
    JOIN customers c ON c.shop_id = p.shop_id
    WHERE c.user_id = ?
      AND p.status = 'active'
      AND s.status = 'active'
      AND (p.start_date IS NULL OR DATE(p.start_date) <= CURRENT_DATE)
      AND (p.end_date IS NULL OR DATE(p.end_date) >= CURRENT_DATE)
    ORDER BY p.end_date
  `, [user.id]);
  const birthdayPromotions = records
    .map((record) => birthdayPromotion(record, { id: record.shop_id, name: record.shop_name }))
    .filter(Boolean);
  const allPromotions = [...birthdayPromotions, ...promotions];

  return {
    user: publicUser(user),
    role: user.role,
    profile: {
      ...publicUser(user),
      birthday: records[0]?.birthday || '',
      address: records[0]?.address || ''
    },
    customers: records,
    cards,
    services,
    transactions,
    promotions: allPromotions,
    notices: birthdayPromotions.map((promo) => ({
      type: 'birthday',
      title: promo.title,
      message: promo.description,
      shop_name: promo.shop_name
    })),
    stats: {
      totalPoints: cards.reduce((sum, card) => sum + Number(card.points || 0), 0),
      totalTransactions: transactions.length,
      totalSpent: transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      activePromotions: allPromotions.length
    }
  };
}

async function publicPortal(db, path) {
  const parts = path
    .replace(/^\/api\/public\/portal\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((item) => decodeURIComponent(item));

  const [shopSlug, customerSlug] = parts;
  if (shopSlug === 'm' && customerSlug && parts.length === 2) {
    return await publicPortalByCard(db, customerSlug);
  }

  if (!shopSlug || parts.length > 2) {
    throw new HttpError(404, 'Khong tim thay trang cong khai');
  }

  const shop = await db.get(`
    SELECT id, name, slug, address, phone, email, logo_data_url, description, status
    FROM shops
    WHERE slug = ? AND status = 'active'
    LIMIT 1
  `, [shopSlug]);

  if (!shop) throw new HttpError(404, 'Cua hang khong ton tai');

  const services = await activeServices(db, shop.id);
  const promotions = await activePromotions(db, shop.id);

  if (!customerSlug) {
    return {
      type: 'shop',
      shop,
      services,
      promotions
    };
  }

  const customer = await db.get(`
    SELECT id, name, slug, phone, email, birthday, status
    FROM customers
    WHERE shop_id = ? AND slug = ? AND status = 'active'
    LIMIT 1
  `, [shop.id, customerSlug]);

  if (!customer) throw new HttpError(404, 'Khach hang khong ton tai');

  return await publicCustomerData(db, shop, customer, services, promotions);
}

async function publicPortalByCard(db, cardNumber) {
  const record = await db.get(`
    SELECT mc.card_number, c.id AS customer_id, c.name AS customer_name, c.slug AS customer_slug,
           c.phone AS customer_phone, c.email AS customer_email, c.birthday AS customer_birthday,
           c.status AS customer_status, s.id AS shop_id, s.name AS shop_name, s.slug AS shop_slug,
           s.address AS shop_address, s.phone AS shop_phone, s.email AS shop_email,
           s.logo_data_url AS shop_logo_data_url,
           s.description AS shop_description, s.status AS shop_status
    FROM membership_cards mc
    JOIN customers c ON c.id = mc.customer_id
    JOIN shops s ON s.id = mc.shop_id
    WHERE mc.card_number = ?
      AND mc.status = 'active'
      AND c.status = 'active'
      AND s.status = 'active'
    LIMIT 1
  `, [clean(cardNumber)]);

  if (!record) throw new HttpError(404, 'Ma the khong ton tai hoac dang bi khoa');

  const shop = {
    id: record.shop_id,
    name: record.shop_name,
    slug: record.shop_slug,
    address: record.shop_address,
    phone: record.shop_phone,
    email: record.shop_email,
    logo_data_url: record.shop_logo_data_url,
    description: record.shop_description,
    status: record.shop_status
  };
  const customer = {
    id: record.customer_id,
    name: record.customer_name,
    slug: record.customer_slug,
    phone: record.customer_phone,
    email: record.customer_email,
    birthday: record.customer_birthday,
    status: record.customer_status
  };

  return await publicCustomerData(db, shop, customer);
}

async function publicCustomerData(db, shop, customer, services = null, promotions = null) {
  const activeShopServices = services || await activeServices(db, shop.id);
  const activeShopPromotions = promotions || await activePromotions(db, shop.id);
  const cards = await db.all(`
    SELECT card_number, points, tier, issued_at, expires_at, status
    FROM membership_cards
    WHERE shop_id = ? AND customer_id = ?
    ORDER BY id DESC
  `, [shop.id, customer.id]);

  const transactions = await db.all(`
    SELECT t.created_at, t.amount, t.points_delta, t.note, sv.name AS service_name
    FROM transactions t
    LEFT JOIN services sv ON sv.id = t.service_id
    WHERE t.shop_id = ? AND t.customer_id = ?
    ORDER BY t.created_at DESC
    LIMIT 20
  `, [shop.id, customer.id]);

  return {
    type: 'customer',
    shop,
    customer,
    cards,
    transactions,
    services: activeShopServices,
    promotions: withBirthdayPromotion(activeShopPromotions, customer, shop)
  };
}

async function activeServices(db, shopId) {
  return await db.all(`
    SELECT id, name, price, duration_minutes, description
    FROM services
    WHERE shop_id = ? AND status = 'active'
    ORDER BY name
  `, [shopId]);
}

async function activePromotions(db, shopId) {
  return await db.all(`
    SELECT id, title, description, discount_percent, start_date, end_date
    FROM promotions
    WHERE shop_id = ?
      AND status = 'active'
      AND (start_date IS NULL OR DATE(start_date) <= CURRENT_DATE)
      AND (end_date IS NULL OR DATE(end_date) >= CURRENT_DATE)
    ORDER BY end_date
  `, [shopId]);
}

function withBirthdayPromotion(promotions, customer, shop) {
  const promo = birthdayPromotion(customer, shop);
  return promo ? [promo, ...(promotions || [])] : promotions || [];
}

function birthdayPromotion(customer, shop) {
  const info = birthdayInfo(customer?.birthday);
  if (!info || info.daysUntil > 7) return null;

  const today = info.daysUntil === 0;
  const shopName = shop?.name || customer?.shop_name || '';
  return {
    id: `birthday-${customer.id}-${shop?.id || customer?.shop_id || ''}`,
    shop_id: shop?.id || customer?.shop_id || null,
    shop_name: shopName,
    title: today ? 'Uu dai sinh nhat hom nay' : 'Uu dai sinh nhat sap toi',
    description: today
      ? 'Chuc mung sinh nhat! Xuat trinh ma QR thanh vien de nhan uu dai sinh nhat tai cua hang.'
      : `Sinh nhat cua ban con ${info.daysUntil} ngay. Hay ghe ${shopName || 'cua hang'} de nhan uu dai sinh nhat.`,
    discount_percent: 20,
    start_date: localDateString(new Date()),
    end_date: info.nextDate,
    status: 'active',
    is_virtual: true,
    type: 'birthday',
    days_until: info.daysUntil
  };
}

function birthdayReminders(customers, days = 7) {
  return (customers || [])
    .map((customer) => {
      const info = birthdayInfo(customer.birthday);
      if (!info || info.daysUntil > days) return null;
      return {
        id: customer.id,
        name: customer.name,
        shop_name: customer.shop_name,
        phone: customer.phone,
        email: customer.email,
        birthday: customer.birthday,
        next_birthday: info.nextDate,
        days_until: info.daysUntil
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.days_until - right.days_until || String(left.name).localeCompare(String(right.name)))
    .slice(0, 12);
}

function birthdayInfo(value) {
  const dateText = String(value || '').slice(0, 10);
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), month, day);
  if (next < today) {
    next = new Date(today.getFullYear() + 1, month, day);
  }

  const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
  return {
    daysUntil,
    nextDate: localDateString(next)
  };
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function handleShops(req, res, db, user, route) {
  const method = req.method || 'GET';

  if (method === 'POST' && !route.id) {
    requireRole(user, 'admin');
    const body = await readJson(req);
    requireFields(body, ['name']);
    let ownerId = body.owner_id ? toId(body.owner_id, 'Chu cua hang khong hop le') : null;

    if (!ownerId && body.owner_email) {
      const existing = await db.get('SELECT id, role FROM users WHERE email = ?', [normalizeEmail(body.owner_email)]);
      if (existing && existing.role === 'admin') {
        throw new HttpError(409, 'Email nay thuoc tai khoan admin');
      }
      ownerId = existing?.id || await createUser(db, {
        name: clean(body.owner_name) || clean(body.name),
        email: body.owner_email,
        password: body.owner_password || 'Owner@123',
        role: 'owner',
        phone: body.owner_phone || body.phone || ''
      });
    }

    if (ownerId) {
      await assertOwnerAvailable(db, ownerId);
    }

    const result = await db.run(`
      INSERT INTO shops (name, address, phone, email, logo_data_url, description, owner_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      clean(body.name),
      clean(body.address),
      clean(body.phone),
      clean(body.email),
      cleanLogo(body.logo_data_url),
      clean(body.description),
      ownerId,
      body.status === 'locked' ? 'locked' : 'active'
    ]);

    if (ownerId) {
      await db.run("UPDATE users SET role = 'owner', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [ownerId]);
    }

    await db.run('UPDATE shops SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      await uniqueShopSlug(db, body.slug || body.name, result.lastInsertId),
      result.lastInsertId
    ]);

    return json(res, 201, { id: result.lastInsertId });
  }

  if (method === 'PUT' && route.id) {
    const body = await readJson(req);
    const shop = await db.get('SELECT * FROM shops WHERE id = ?', [route.id]);
    if (!shop) throw new HttpError(404, 'Cua hang khong ton tai');
    await assertShopAccess(db, user, shop.id);

    const hasOwnerField = Object.prototype.hasOwnProperty.call(body, 'owner_id');
    const ownerId = user.role === 'admin' && hasOwnerField
      ? (body.owner_id ? toId(body.owner_id, 'Chu cua hang khong hop le') : null)
      : shop.owner_id;
    const status = user.role === 'admin' && ['active', 'locked'].includes(body.status) ? body.status : shop.status;
    const slug = user.role === 'admin'
      ? await uniqueShopSlug(db, body.slug || body.name || shop.name, shop.id)
      : shop.slug;

    if (user.role === 'admin' && ownerId) {
      await assertOwnerAvailable(db, ownerId, shop.id);
    }

    await db.run(`
      UPDATE shops
      SET name = ?, slug = ?, address = ?, phone = ?, email = ?, logo_data_url = ?, description = ?, owner_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      clean(body.name) || shop.name,
      slug,
      clean(body.address),
      clean(body.phone),
      clean(body.email),
      body.logo_data_url ? cleanLogo(body.logo_data_url) : shop.logo_data_url,
      clean(body.description),
      ownerId || null,
      status,
      route.id
    ]);

    if (ownerId) {
      await db.run("UPDATE users SET role = 'owner', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [ownerId]);
    }

    if (user.role === 'admin' && shop.owner_id && status !== shop.status) {
      await db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status === 'locked' ? 'locked' : 'active', shop.owner_id]);
    }

    return json(res, 200, { ok: true });
  }

  if (method === 'PATCH' && route.id && route.action === 'status') {
    requireRole(user, 'admin');
    const body = await readJson(req);
    const status = body.status === 'locked' ? 'locked' : 'active';
    const shop = await db.get('SELECT id, owner_id FROM shops WHERE id = ?', [route.id]);
    if (!shop) throw new HttpError(404, 'Cua hang khong ton tai');

    await db.run('UPDATE shops SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, route.id]);
    if (shop.owner_id) {
      await db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status === 'locked' ? 'locked' : 'active', shop.owner_id]);
    }

    return json(res, 200, { ok: true });
  }

  if (method === 'DELETE' && route.id) {
    requireRole(user, 'admin');
    await db.run('DELETE FROM shops WHERE id = ?', [route.id]);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Phuong thuc khong duoc ho tro');
}

async function handleUsers(req, res, db, user, route) {
  const method = req.method || 'GET';
  requireRole(user, 'admin');

  if (method === 'POST' && !route.id) {
    const body = await readJson(req);
    requireFields(body, ['name', 'email', 'role']);
    const role = ['owner', 'customer'].includes(body.role) ? body.role : null;
    if (!role) throw new HttpError(400, 'Vai tro khong hop le');

    const id = await db.transaction(async (tx) => {
      const userId = await createUser(tx, {
        name: clean(body.name),
        email: body.email,
        password: body.password || (role === 'owner' ? 'Owner@123' : 'Customer@123'),
        role,
        status: body.status === 'locked' ? 'locked' : 'active',
        phone: body.phone || ''
      });

      if (role === 'customer') {
        const shopId = toId(body.shop_id, 'Can chon cua hang cho khach hang');
        const customer = await tx.run(`
          INSERT INTO customers (user_id, shop_id, name, email, phone, birthday, address, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          shopId,
          clean(body.name),
          normalizeEmail(body.email),
          clean(body.phone),
          clean(body.birthday) || null,
          clean(body.address),
          body.status === 'locked' ? 'locked' : 'active'
        ]);
        await tx.run('UPDATE customers SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
          await uniqueCustomerSlug(tx, shopId, body.slug || body.name, customer.lastInsertId),
          customer.lastInsertId
        ]);

        await tx.run(`
          INSERT INTO membership_cards (customer_id, shop_id, card_number, expires_at)
          VALUES (?, ?, ?, ?)
        `, [customer.lastInsertId, shopId, createCardNumber(shopId), addYears(1)]);
      }

      return userId;
    });

    return json(res, 201, { id });
  }

  if (method === 'PUT' && route.id) {
    const body = await readJson(req);
    const target = await db.get('SELECT * FROM users WHERE id = ?', [route.id]);
    if (!target) throw new HttpError(404, 'Nguoi dung khong ton tai');

    await db.run(`
      UPDATE users
      SET name = ?, email = ?, phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      clean(body.name) || target.name,
      normalizeEmail(body.email || target.email),
      clean(body.phone),
      body.status === 'locked' ? 'locked' : 'active',
      route.id
    ]);

    if (body.password) {
      await updateUserPassword(db, route.id, body.password);
    }

    return json(res, 200, { ok: true });
  }

  if (method === 'PATCH' && route.id && route.action === 'status') {
    const body = await readJson(req);
    if (Number(route.id) === Number(user.id)) throw new HttpError(400, 'Khong the khoa tai khoan dang dang nhap');
    const status = body.status === 'locked' ? 'locked' : 'active';
    await db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, route.id]);
    await db.run('UPDATE shops SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE owner_id = ?', [status === 'locked' ? 'locked' : 'active', route.id]);
    return json(res, 200, { ok: true });
  }

  if (method === 'DELETE' && route.id) {
    if (Number(route.id) === Number(user.id)) throw new HttpError(400, 'Khong the xoa tai khoan dang dang nhap');
    await db.run('DELETE FROM users WHERE id = ? AND role <> ?', [route.id, 'admin']);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Phuong thuc khong duoc ho tro');
}

async function handleCustomers(req, res, db, user, route) {
  const method = req.method || 'GET';
  requireStaff(user);

  if (method === 'POST' && !route.id) {
    const body = await readJson(req);
    requireFields(body, ['name']);
    const shopId = await scopedShopId(db, user, body.shop_id);

    const id = await db.transaction(async (tx) => {
      const userId = await getOrCreateCustomerUser(tx, body);
      if (userId) {
        const existingMembership = await tx.get(`
          SELECT id
          FROM customers
          WHERE user_id = ? AND shop_id = ?
          LIMIT 1
        `, [userId, shopId]);
        if (existingMembership) {
          throw new HttpError(409, 'Khach hang nay da la thanh vien cua cua hang');
        }
      }

      const customer = await tx.run(`
        INSERT INTO customers (user_id, shop_id, name, email, phone, birthday, address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        shopId,
        clean(body.name),
        normalizeEmail(body.email),
        clean(body.phone),
        clean(body.birthday) || null,
        clean(body.address),
        body.status === 'locked' ? 'locked' : 'active'
      ]);
      await tx.run('UPDATE customers SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        await uniqueCustomerSlug(tx, shopId, body.slug || body.name, customer.lastInsertId),
        customer.lastInsertId
      ]);

      const points = Number(body.points || 0);
      await tx.run(`
        INSERT INTO membership_cards (customer_id, shop_id, card_number, points, tier, expires_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
      `, [
        customer.lastInsertId,
        shopId,
        createCardNumber(shopId),
        points,
        tierFromPoints(points),
        clean(body.expires_at) || null
      ]);

      return customer.lastInsertId;
    });

    return json(res, 201, { id });
  }

  if (method === 'PUT' && route.id) {
    const body = await readJson(req);
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [route.id]);
    if (!customer) throw new HttpError(404, 'Khach hang khong ton tai');
    await assertShopAccess(db, user, customer.shop_id);

    const shopId = user.role === 'admin' && body.shop_id ? toId(body.shop_id, 'Cua hang khong hop le') : customer.shop_id;
    const email = normalizeEmail(body.email || customer.email);
    const slug = await uniqueCustomerSlug(db, shopId, body.slug || body.name || customer.name, customer.id);
    await db.run(`
      UPDATE customers
      SET shop_id = ?, name = ?, slug = ?, email = ?, phone = ?, birthday = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      shopId,
      clean(body.name) || customer.name,
      slug,
      email,
      clean(body.phone),
      clean(body.birthday) || null,
      clean(body.address),
      body.status === 'locked' ? 'locked' : 'active',
      route.id
    ]);

    if (customer.user_id) {
      await db.run(`
        UPDATE users
        SET name = ?, email = ?, phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        clean(body.name) || customer.name,
        email,
        clean(body.phone),
        body.status === 'locked' ? 'locked' : 'active',
        customer.user_id
      ]);
      if (body.password) {
        await updateUserPassword(db, customer.user_id, body.password);
      }
    }

    return json(res, 200, { ok: true });
  }

  if (method === 'DELETE' && route.id) {
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [route.id]);
    if (!customer) throw new HttpError(404, 'Khach hang khong ton tai');
    await assertShopAccess(db, user, customer.shop_id);
    await db.run('DELETE FROM customers WHERE id = ?', [route.id]);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Phuong thuc khong duoc ho tro');
}

async function handleServices(req, res, db, user, route) {
  const method = req.method || 'GET';
  requireStaff(user);

  if (method === 'POST' && !route.id) {
    const body = await readJson(req);
    requireFields(body, ['name']);
    const shopId = await scopedShopId(db, user, body.shop_id);
    const result = await db.run(`
      INSERT INTO services (shop_id, name, price, duration_minutes, description, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      shopId,
      clean(body.name),
      money(body.price),
      Number(body.duration_minutes || 30),
      clean(body.description),
      body.status === 'inactive' ? 'inactive' : 'active'
    ]);
    return json(res, 201, { id: result.lastInsertId });
  }

  if (method === 'PUT' && route.id) {
    const body = await readJson(req);
    const service = await db.get('SELECT * FROM services WHERE id = ?', [route.id]);
    if (!service) throw new HttpError(404, 'Dich vu khong ton tai');
    await assertShopAccess(db, user, service.shop_id);
    const shopId = user.role === 'admin' && body.shop_id ? toId(body.shop_id, 'Cua hang khong hop le') : service.shop_id;

    await db.run(`
      UPDATE services
      SET shop_id = ?, name = ?, price = ?, duration_minutes = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      shopId,
      clean(body.name) || service.name,
      money(body.price),
      Number(body.duration_minutes || service.duration_minutes || 30),
      clean(body.description),
      body.status === 'inactive' ? 'inactive' : 'active',
      route.id
    ]);

    return json(res, 200, { ok: true });
  }

  if (method === 'DELETE' && route.id) {
    const service = await db.get('SELECT * FROM services WHERE id = ?', [route.id]);
    if (!service) throw new HttpError(404, 'Dich vu khong ton tai');
    await assertShopAccess(db, user, service.shop_id);
    await db.run('DELETE FROM services WHERE id = ?', [route.id]);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Phuong thuc khong duoc ho tro');
}

async function handleCards(req, res, db, user, route) {
  const method = req.method || 'GET';
  requireStaff(user);

  if (method === 'POST' && !route.id) {
    const body = await readJson(req);
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [toId(body.customer_id, 'Can chon khach hang')]);
    if (!customer) throw new HttpError(404, 'Khach hang khong ton tai');
    await assertShopAccess(db, user, customer.shop_id);
    const points = Number(body.points || 0);

    const result = await db.run(`
      INSERT INTO membership_cards (customer_id, shop_id, card_number, points, tier, expires_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      customer.id,
      customer.shop_id,
      clean(body.card_number) || createCardNumber(customer.shop_id),
      points,
      body.tier || tierFromPoints(points),
      clean(body.expires_at) || null,
      ['active', 'locked', 'expired'].includes(body.status) ? body.status : 'active'
    ]);

    return json(res, 201, { id: result.lastInsertId });
  }

  if (method === 'PUT' && route.id) {
    const body = await readJson(req);
    const card = await db.get('SELECT * FROM membership_cards WHERE id = ?', [route.id]);
    if (!card) throw new HttpError(404, 'The thanh vien khong ton tai');
    await assertShopAccess(db, user, card.shop_id);
    const points = Number(body.points ?? card.points);

    await db.run(`
      UPDATE membership_cards
      SET points = ?, tier = ?, expires_at = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      points,
      body.tier || tierFromPoints(points),
      clean(body.expires_at) || card.expires_at,
      ['active', 'locked', 'expired'].includes(body.status) ? body.status : card.status,
      route.id
    ]);
    return json(res, 200, { ok: true });
  }

  if (method === 'DELETE' && route.id) {
    const card = await db.get('SELECT * FROM membership_cards WHERE id = ?', [route.id]);
    if (!card) throw new HttpError(404, 'The thanh vien khong ton tai');
    await assertShopAccess(db, user, card.shop_id);
    await db.run('DELETE FROM membership_cards WHERE id = ?', [route.id]);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Phuong thuc khong duoc ho tro');
}

async function handleTransactions(req, res, db, user, route) {
  const method = req.method || 'GET';
  requireStaff(user);

  if (method === 'POST' && !route.id) {
    const body = await readJson(req);
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [toId(body.customer_id, 'Can chon khach hang')]);
    if (!customer) throw new HttpError(404, 'Khach hang khong ton tai');
    await assertShopAccess(db, user, customer.shop_id);

    const service = body.service_id ? await db.get('SELECT * FROM services WHERE id = ?', [toId(body.service_id, 'Dich vu khong hop le')]) : null;
    if (service && Number(service.shop_id) !== Number(customer.shop_id)) {
      throw new HttpError(400, 'Dich vu khong thuoc cua hang cua khach hang');
    }

    const amount = body.amount === '' || body.amount === undefined ? Number(service?.price || 0) : money(body.amount);
    const pointsDelta = body.points_delta === '' || body.points_delta === undefined
      ? Math.floor(amount / 10000)
      : Number(body.points_delta || 0);

    const id = await db.transaction(async (tx) => {
      const transaction = await tx.run(`
        INSERT INTO transactions (customer_id, shop_id, service_id, amount, points_delta, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [customer.id, customer.shop_id, service?.id || null, amount, pointsDelta, clean(body.note)]);

      let card = await tx.get(`
        SELECT * FROM membership_cards
        WHERE customer_id = ? AND shop_id = ?
        ORDER BY id DESC
        LIMIT 1
      `, [customer.id, customer.shop_id]);

      if (!card) {
        const createdCard = await tx.run(`
          INSERT INTO membership_cards (customer_id, shop_id, card_number, points, tier, expires_at)
          VALUES (?, ?, ?, 0, 'Silver', ?)
        `, [customer.id, customer.shop_id, createCardNumber(customer.shop_id), addYears(1)]);
        card = await tx.get('SELECT * FROM membership_cards WHERE id = ?', [createdCard.lastInsertId]);
      }

      const nextPoints = Math.max(0, Number(card.points || 0) + pointsDelta);
      await tx.run(`
        UPDATE membership_cards
        SET points = ?, tier = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nextPoints, tierFromPoints(nextPoints), card.id]);

      return transaction.lastInsertId;
    });

    return json(res, 201, { id });
  }

  if (method === 'DELETE' && route.id) {
    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [route.id]);
    if (!tx) throw new HttpError(404, 'Giao dich khong ton tai');
    await assertShopAccess(db, user, tx.shop_id);
    await db.run('DELETE FROM transactions WHERE id = ?', [route.id]);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Phuong thuc khong duoc ho tro');
}

async function purchaseCustomerService(req, res, db, user, serviceId) {
  requireRole(user, 'customer');

  const service = await db.get(`
    SELECT sv.*, s.status AS shop_status
    FROM services sv
    JOIN shops s ON s.id = sv.shop_id
    WHERE sv.id = ?
    LIMIT 1
  `, [serviceId]);

  if (!service) throw new HttpError(404, 'Dich vu khong ton tai');
  if (service.status !== 'active' || service.shop_status !== 'active') {
    throw new HttpError(403, 'Dich vu hien khong kha dung');
  }

  const customer = await db.get(`
    SELECT *
    FROM customers
    WHERE user_id = ? AND shop_id = ? AND status = 'active'
    ORDER BY id DESC
    LIMIT 1
  `, [user.id, service.shop_id]);

  if (!customer) {
    throw new HttpError(403, 'Ban chua la thanh vien cua cua hang nay');
  }

  const amount = Number(service.price || 0);
  const pointsDelta = Math.floor(amount / 10000);

  const id = await db.transaction(async (tx) => {
    const transaction = await tx.run(`
      INSERT INTO transactions (customer_id, shop_id, service_id, amount, points_delta, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [customer.id, customer.shop_id, service.id, amount, pointsDelta, 'Khach hang mua dich vu']);

    let card = await tx.get(`
      SELECT *
      FROM membership_cards
      WHERE customer_id = ? AND shop_id = ?
      ORDER BY id DESC
      LIMIT 1
    `, [customer.id, customer.shop_id]);

    if (!card) {
      const createdCard = await tx.run(`
        INSERT INTO membership_cards (customer_id, shop_id, card_number, points, tier, expires_at)
        VALUES (?, ?, ?, 0, 'Silver', ?)
      `, [customer.id, customer.shop_id, createCardNumber(customer.shop_id), addYears(1)]);
      card = await tx.get('SELECT * FROM membership_cards WHERE id = ?', [createdCard.lastInsertId]);
    }

    const nextPoints = Math.max(0, Number(card.points || 0) + pointsDelta);
    await tx.run(`
      UPDATE membership_cards
      SET points = ?, tier = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [nextPoints, tierFromPoints(nextPoints), card.id]);

    return transaction.lastInsertId;
  });

  return json(res, 201, { id });
}

async function handlePromotions(req, res, db, user, route) {
  const method = req.method || 'GET';
  requireStaff(user);

  if (method === 'POST' && !route.id) {
    const body = await readJson(req);
    requireFields(body, ['title']);
    const shopId = await scopedShopId(db, user, body.shop_id);
    const result = await db.run(`
      INSERT INTO promotions (shop_id, title, description, discount_percent, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      shopId,
      clean(body.title),
      clean(body.description),
      Number(body.discount_percent || 0),
      clean(body.start_date) || null,
      clean(body.end_date) || null,
      body.status === 'inactive' ? 'inactive' : 'active'
    ]);
    return json(res, 201, { id: result.lastInsertId });
  }

  if (method === 'PUT' && route.id) {
    const body = await readJson(req);
    const promo = await db.get('SELECT * FROM promotions WHERE id = ?', [route.id]);
    if (!promo) throw new HttpError(404, 'Uu dai khong ton tai');
    await assertShopAccess(db, user, promo.shop_id);
    const shopId = user.role === 'admin' && body.shop_id ? toId(body.shop_id, 'Cua hang khong hop le') : promo.shop_id;

    await db.run(`
      UPDATE promotions
      SET shop_id = ?, title = ?, description = ?, discount_percent = ?, start_date = ?, end_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      shopId,
      clean(body.title) || promo.title,
      clean(body.description),
      Number(body.discount_percent || 0),
      clean(body.start_date) || null,
      clean(body.end_date) || null,
      body.status === 'inactive' ? 'inactive' : 'active',
      route.id
    ]);
    return json(res, 200, { ok: true });
  }

  if (method === 'DELETE' && route.id) {
    const promo = await db.get('SELECT * FROM promotions WHERE id = ?', [route.id]);
    if (!promo) throw new HttpError(404, 'Uu dai khong ton tai');
    await assertShopAccess(db, user, promo.shop_id);
    await db.run('DELETE FROM promotions WHERE id = ?', [route.id]);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Phuong thuc khong duoc ho tro');
}

async function handleCustomerProfile(req, res, db, user) {
  requireRole(user, 'customer');
  const body = await readJson(req);
  const email = normalizeEmail(body.email || user.email);

  await db.run(`
    UPDATE users
    SET name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    clean(body.name) || user.name,
    email,
    clean(body.phone),
    user.id
  ]);

  await db.run(`
    UPDATE customers
    SET name = ?, email = ?, phone = ?, birthday = ?, address = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [
    clean(body.name) || user.name,
    email,
    clean(body.phone),
    clean(body.birthday) || null,
    clean(body.address),
    user.id
  ]);

  const customerRows = await db.all('SELECT id, shop_id FROM customers WHERE user_id = ?', [user.id]);
  for (const customer of customerRows) {
    await db.run('UPDATE customers SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      await uniqueCustomerSlug(db, customer.shop_id, body.slug || body.name || user.name, customer.id),
      customer.id
    ]);
  }

  if (body.password) {
    await updateUserPassword(db, user.id, body.password);
  }

  json(res, 200, { ok: true });
}

async function getOrCreateCustomerUser(db, body) {
  if (!body.email) return null;

  const email = normalizeEmail(body.email);
  const existing = await db.get('SELECT id, role FROM users WHERE email = ?', [email]);
  if (existing) {
    if (existing.role !== 'customer') throw new HttpError(409, 'Email da thuoc tai khoan khong phai khach hang');
    return existing.id;
  }

  return await createUser(db, {
    name: clean(body.name),
    email,
    password: body.password || 'Customer@123',
    role: 'customer',
    phone: body.phone || '',
    status: body.status === 'locked' ? 'locked' : 'active'
  });
}

async function ownerShop(db, user) {
  const shop = await db.get(`
    SELECT s.*, u.name AS owner_name, u.email AS owner_email
    FROM shops s
    LEFT JOIN users u ON u.id = s.owner_id
    WHERE s.owner_id = ?
    LIMIT 1
  `, [user.id]);

  if (!shop) throw new HttpError(403, 'Tai khoan chu cua hang chua duoc gan cua hang');
  if (shop.status !== 'active') throw new HttpError(403, 'Cua hang dang bi khoa');
  return shop;
}

async function assertOwnerAvailable(db, ownerId, excludeShopId = null) {
  const target = await db.get('SELECT id, role, status FROM users WHERE id = ?', [ownerId]);
  if (!target) throw new HttpError(400, 'Tai khoan nguoi dung khong ton tai');
  if (target.role === 'admin') throw new HttpError(400, 'Khong the gan tai khoan admin lam chu cua hang');
  if (target.status !== 'active') throw new HttpError(400, 'Tai khoan nguoi dung dang bi khoa');

  const assignedShop = excludeShopId
    ? await db.get('SELECT id, name FROM shops WHERE owner_id = ? AND id <> ? LIMIT 1', [ownerId, excludeShopId])
    : await db.get('SELECT id, name FROM shops WHERE owner_id = ? LIMIT 1', [ownerId]);

  if (assignedShop) {
    throw new HttpError(409, 'Chu cua hang nay da duoc gan cho cua hang khac');
  }
}

async function scopedShopId(db, user, requestedShopId) {
  if (user.role === 'admin') {
    const id = toId(requestedShopId, 'Can chon cua hang');
    const shop = await db.get('SELECT id FROM shops WHERE id = ?', [id]);
    if (!shop) throw new HttpError(404, 'Cua hang khong ton tai');
    return id;
  }
  return (await ownerShop(db, user)).id;
}

async function assertShopAccess(db, user, shopId) {
  if (user.role === 'admin') return;
  if (user.role !== 'owner') throw new HttpError(403, 'Khong co quyen');

  const shop = await ownerShop(db, user);
  if (Number(shop.id) !== Number(shopId)) {
    throw new HttpError(403, 'Khong duoc truy cap du lieu cua cua hang khac');
  }
}

function requireStaff(user) {
  if (!['admin', 'owner'].includes(user.role)) throw new HttpError(403, 'Khong co quyen');
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw new HttpError(403, 'Khong co quyen');
}

function routeMatch(path) {
  const match = path.match(/^\/api\/(shops|users|customers|services|cards|transactions|promotions)(?:\/(\d+))?(?:\/([a-z-]+))?$/);
  if (!match) return {};
  return {
    resource: match[1],
    id: match[2] ? Number(match[2]) : null,
    action: match[3] || null
  };
}

function cleanLogo(value) {
  const text = clean(value);
  if (!text) return null;
  if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(text)) {
    throw new HttpError(400, 'Logo khong hop le');
  }
  if (text.length > 700000) {
    throw new HttpError(400, 'Logo qua lon');
  }
  return text;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new HttpError(413, 'Du lieu qua lon'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'JSON khong hop le'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function qr(res, text) {
  if (!String(text || '').trim()) {
    throw new HttpError(400, 'Thieu noi dung QR');
  }

  let svg;
  try {
    svg = createQrSvg(text);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new HttpError(400, 'Noi dung QR khong hop le hoac qua dai');
    }
    throw error;
  }
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=86400'
  });
  res.end(svg);
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => !String(body[field] || '').trim());
  if (missing.length) throw new HttpError(400, `Thieu thong tin: ${missing.join(', ')}`);
}

function toId(value, message) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new HttpError(400, message || 'ID khong hop le');
  return number;
}

function money(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new HttpError(400, 'So tien khong hop le');
  return Math.round(number);
}

function clean(value) {
  return String(value ?? '').trim();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone || ''
  };
}

function tierFromPoints(points) {
  const value = Number(points || 0);
  if (value >= 3000) return 'Diamond';
  if (value >= 1500) return 'Platinum';
  if (value >= 500) return 'Gold';
  return 'Silver';
}

function addYears(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + Number(years || 0));
  return date.toISOString().slice(0, 10);
}

function demoAccounts() {
  return [
    { role: 'Admin', email: 'admin@example.com', password: 'Admin@123' },
    { role: 'Chu cua hang', email: 'owner@example.com', password: 'Owner@123' },
    { role: 'Khach hang', email: 'customer@example.com', password: 'Customer@123' }
  ];
}

module.exports = {
  handleApi
};

const { hashPassword } = require('./auth');

async function createDatabase() {
  const client = String(process.env.DB_CLIENT || 'mariadb').toLowerCase();
  if (client !== 'mariadb' && client !== 'mysql') {
    throw new Error('Du an nay chi dung MariaDB/MySQL. Hay dat DB_CLIENT=mariadb trong .env');
  }
  return createMariaDb();
}

async function createMariaDb() {
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch {
    throw new Error('Can cai driver mysql2: chay npm.cmd install mysql2');
  }

  const database = process.env.DB_NAME || 'memberhub';
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    timezone: 'Z',
    dateStrings: true
  };

  if (process.env.DB_AUTO_CREATE !== 'false') {
    const setup = await mysql.createConnection(connectionConfig);
    await setup.query(`
      CREATE DATABASE IF NOT EXISTS \`${escapeIdentifier(database)}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);
    await setup.end();
  }

  const pool = mysql.createPool({
    ...connectionConfig,
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0
  });
  const db = mariaAdapter(pool);
  await migrateMariaDb(db);
  await seed(db);
  await ensureSlugs(db);
  return db;
}

function mariaAdapter(poolOrConnection) {
  const execute = async (sql, params = []) => {
    const [result] = await poolOrConnection.execute(sql, arrayParams(params));
    return result;
  };

  const query = async (sql, params = []) => {
    const [result] = await poolOrConnection.query(sql, arrayParams(params));
    return result;
  };

  return {
    dialect: 'mariadb',
    async get(sql, params = []) {
      const rows = await execute(sql, params);
      return rows[0];
    },
    async all(sql, params = []) {
      return execute(sql, params);
    },
    async run(sql, params = []) {
      const result = await execute(sql, params);
      return {
        lastInsertId: Number(result.insertId || 0),
        lastInsertRowid: Number(result.insertId || 0),
        changes: result.affectedRows || 0
      };
    },
    async exec(sql) {
      await query(sql);
    },
    async transaction(fn) {
      const connection = await poolOrConnection.getConnection();
      const tx = mariaAdapter(connection);
      try {
        await connection.beginTransaction();
        const result = await fn(tx);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async close() {
      if (typeof poolOrConnection.end === 'function') {
        await poolOrConnection.end();
      }
    }
  };
}

async function migrateMariaDb(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(160) NOT NULL,
      email VARCHAR(190) NOT NULL,
      password_hash CHAR(128) NOT NULL,
      password_salt CHAR(32) NOT NULL,
      role ENUM('admin', 'owner', 'customer') NOT NULL,
      status ENUM('active', 'locked') NOT NULL DEFAULT 'active',
      phone VARCHAR(40) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      KEY idx_users_role (role),
      KEY idx_users_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS shops (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(180) NOT NULL,
      slug VARCHAR(190) NULL,
      address VARCHAR(255) NULL,
      phone VARCHAR(40) NULL,
      email VARCHAR(190) NULL,
      logo_data_url MEDIUMTEXT NULL,
      description TEXT NULL,
      owner_id INT UNSIGNED NULL,
      status ENUM('active', 'locked') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_shops_slug (slug),
      KEY idx_shops_owner (owner_id),
      KEY idx_shops_status (status),
      CONSTRAINT fk_shops_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS customers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NULL,
      shop_id INT UNSIGNED NOT NULL,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(190) NULL,
      email VARCHAR(190) NULL,
      phone VARCHAR(40) NULL,
      birthday DATE NULL,
      address VARCHAR(255) NULL,
      status ENUM('active', 'locked') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_customers_user (user_id),
      KEY idx_customers_shop (shop_id),
      KEY idx_customers_email (email),
      UNIQUE KEY uq_customers_shop_slug (shop_id, slug),
      CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_customers_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS services (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      shop_id INT UNSIGNED NOT NULL,
      name VARCHAR(180) NOT NULL,
      price INT UNSIGNED NOT NULL DEFAULT 0,
      duration_minutes INT UNSIGNED NOT NULL DEFAULT 30,
      description TEXT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_services_shop (shop_id),
      KEY idx_services_status (status),
      CONSTRAINT fk_services_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS membership_cards (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_id INT UNSIGNED NOT NULL,
      shop_id INT UNSIGNED NOT NULL,
      card_number VARCHAR(40) NOT NULL,
      points INT NOT NULL DEFAULT 0,
      tier ENUM('Silver', 'Gold', 'Platinum', 'Diamond') NOT NULL DEFAULT 'Silver',
      issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATE NULL,
      status ENUM('active', 'locked', 'expired') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_cards_number (card_number),
      KEY idx_cards_customer (customer_id),
      KEY idx_cards_shop (shop_id),
      CONSTRAINT fk_cards_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      CONSTRAINT fk_cards_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS transactions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_id INT UNSIGNED NOT NULL,
      shop_id INT UNSIGNED NOT NULL,
      service_id INT UNSIGNED NULL,
      amount INT UNSIGNED NOT NULL DEFAULT 0,
      points_delta INT NOT NULL DEFAULT 0,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_transactions_customer (customer_id),
      KEY idx_transactions_shop (shop_id),
      KEY idx_transactions_service (service_id),
      KEY idx_transactions_created_at (created_at),
      CONSTRAINT fk_transactions_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      CONSTRAINT fk_transactions_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      CONSTRAINT fk_transactions_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS promotions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      shop_id INT UNSIGNED NOT NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NULL,
      discount_percent INT UNSIGNED NOT NULL DEFAULT 0,
      start_date DATE NULL,
      end_date DATE NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_promotions_shop (shop_id),
      KEY idx_promotions_status (status),
      CONSTRAINT fk_promotions_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await addMariaColumnIfMissing(db, 'shops', 'slug', 'VARCHAR(190) NULL AFTER name');
  await addMariaColumnIfMissing(db, 'shops', 'logo_data_url', 'MEDIUMTEXT NULL AFTER email');
  await addMariaColumnIfMissing(db, 'customers', 'slug', 'VARCHAR(190) NULL AFTER name');
  await addMariaIndexIfMissing(db, 'shops', 'uq_shops_slug', 'CREATE UNIQUE INDEX uq_shops_slug ON shops(slug)');
  await addMariaIndexIfMissing(db, 'customers', 'uq_customers_shop_slug', 'CREATE UNIQUE INDEX uq_customers_shop_slug ON customers(shop_id, slug)');
  await addMariaIndexIfMissing(db, 'customers', 'uq_customers_shop_user', 'CREATE UNIQUE INDEX uq_customers_shop_user ON customers(shop_id, user_id)');
  await addMariaIndexIfMissing(db, 'customers', 'idx_customers_shop_birthday', 'CREATE INDEX idx_customers_shop_birthday ON customers(shop_id, birthday)');
  await addMariaIndexIfMissing(db, 'membership_cards', 'idx_cards_shop_customer', 'CREATE INDEX idx_cards_shop_customer ON membership_cards(shop_id, customer_id)');
  await addMariaIndexIfMissing(db, 'transactions', 'idx_transactions_shop_created', 'CREATE INDEX idx_transactions_shop_created ON transactions(shop_id, created_at)');
  await addMariaIndexIfMissing(db, 'promotions', 'idx_promotions_shop_status_dates', 'CREATE INDEX idx_promotions_shop_status_dates ON promotions(shop_id, status, start_date, end_date)');
}

async function seed(db) {
  const row = await db.get('SELECT COUNT(*) AS total FROM users');
  if (Number(row.total) > 0) {
    return;
  }

  await db.transaction(async (tx) => {
    const adminId = await createUser(tx, {
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'Admin@123',
      role: 'admin',
      phone: '0900000001'
    });

    const ownerId = await createUser(tx, {
      name: 'Chu Lumi Spa',
      email: 'owner@example.com',
      password: 'Owner@123',
      role: 'owner',
      phone: '0900000002'
    });

    const customerUserId = await createUser(tx, {
      name: 'Nguyen Minh Anh',
      email: 'customer@example.com',
      password: 'Customer@123',
      role: 'customer',
      phone: '0900000003'
    });

    const shop = await tx.run(`
      INSERT INTO shops (name, address, phone, email, description, owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'Lumi Spa Quan 1',
      '12 Nguyen Hue, Quan 1, TP.HCM',
      '028 1111 2222',
      'hello@lumispa.vn',
      'Cham soc da, massage thu gian va goi thanh vien theo diem.',
      ownerId
    ]);
    const shopId = shop.lastInsertId;

    const secondShop = await tx.run(`
      INSERT INTO shops (name, address, phone, email, description, owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'Nova Fitness Thu Duc',
      '88 Vo Van Ngan, TP. Thu Duc',
      '028 3333 4444',
      'team@novafit.vn',
      'Phong tap va dich vu huan luyen ca nhan.',
      null
    ]);
    const secondShopId = secondShop.lastInsertId;

    const customer = await tx.run(`
      INSERT INTO customers (user_id, shop_id, name, email, phone, birthday, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      customerUserId,
      shopId,
      'Nguyen Minh Anh',
      'customer@example.com',
      '0900000003',
      '1996-05-14',
      'Quan Binh Thanh, TP.HCM'
    ]);
    const customerId = customer.lastInsertId;

    const walkInCustomer = await tx.run(`
      INSERT INTO customers (shop_id, name, email, phone, birthday, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      shopId,
      'Tran Quoc Bao',
      'bao.tran@example.com',
      '0900000004',
      '1992-09-20',
      'Quan 3, TP.HCM'
    ]);
    const walkInCustomerId = walkInCustomer.lastInsertId;

    const service = await tx.run(`
      INSERT INTO services (shop_id, name, price, duration_minutes, description)
      VALUES (?, ?, ?, ?, ?)
    `, [shopId, 'Cham soc da co ban', 450000, 60, 'Lam sach sau, mat na va massage mat.']);
    const serviceId = service.lastInsertId;

    const premiumService = await tx.run(`
      INSERT INTO services (shop_id, name, price, duration_minutes, description)
      VALUES (?, ?, ?, ?, ?)
    `, [shopId, 'Massage da nong', 650000, 75, 'Lieu trinh thu gian toan than.']);
    const premiumServiceId = premiumService.lastInsertId;

    await tx.run(`
      INSERT INTO services (shop_id, name, price, duration_minutes, description)
      VALUES (?, ?, ?, ?, ?)
    `, [secondShopId, 'Goi PT 1:1', 900000, 60, 'Tap luyen ca nhan hoa theo muc tieu.']);

    await tx.run(`
      INSERT INTO membership_cards (customer_id, shop_id, card_number, points, tier, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [customerId, shopId, createCardNumber(shopId), 720, 'Gold', '2027-12-31']);

    await tx.run(`
      INSERT INTO membership_cards (customer_id, shop_id, card_number, points, tier, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [walkInCustomerId, shopId, createCardNumber(shopId), 120, 'Silver', '2027-12-31']);

    await tx.run(`
      INSERT INTO transactions (customer_id, shop_id, service_id, amount, points_delta, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [customerId, shopId, serviceId, 450000, 45, 'Tich diem tu dich vu cham soc da.', dateTimeOffset(-8)]);

    await tx.run(`
      INSERT INTO transactions (customer_id, shop_id, service_id, amount, points_delta, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [customerId, shopId, premiumServiceId, 650000, 65, 'Khach hang su dung goi premium.', dateTimeOffset(-2)]);

    await tx.run(`
      INSERT INTO transactions (customer_id, shop_id, service_id, amount, points_delta, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [walkInCustomerId, shopId, serviceId, 450000, 45, 'Khach moi.', dateTimeOffset(-1)]);

    await tx.run(`
      INSERT INTO promotions (shop_id, title, description, discount_percent, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [shopId, 'Uu dai hoi vien Gold', 'Giam gia cho khach hang hang Gold tro len.', 15, dateOffset(-3), dateOffset(20)]);

    await tx.run(`
      INSERT INTO promotions (shop_id, title, description, discount_percent, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [secondShopId, 'Thang tap thu dau tien', 'Uu dai cho khach hang dang ky moi.', 10, dateOffset(0), dateOffset(30)]);

    if (!adminId) {
      throw new Error('Khong the tao tai khoan admin mau');
    }
  });
}

async function createUser(db, input) {
  const { hash, salt } = hashPassword(input.password || 'ChangeMe@123');
  const result = await db.run(`
    INSERT INTO users (name, email, password_hash, password_salt, role, status, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    input.name,
    normalizeEmail(input.email),
    hash,
    salt,
    input.role,
    input.status || 'active',
    input.phone || ''
  ]);
  return result.lastInsertId;
}

async function updateUserPassword(db, userId, password) {
  const { hash, salt } = hashPassword(password);
  await db.run(`
    UPDATE users
    SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [hash, salt, userId]);
}

async function addMariaColumnIfMissing(db, table, column, definition) {
  const existing = await db.get(`
    SELECT COUNT(*) AS total
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [table, column]);

  if (!Number(existing.total || 0)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function addMariaIndexIfMissing(db, table, indexName, createSql) {
  const existing = await db.get(`
    SELECT COUNT(*) AS total
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
  `, [table, indexName]);

  if (!Number(existing.total || 0)) {
    await db.exec(createSql);
  }
}

async function ensureSlugs(db) {
  const shops = await db.all(`
    SELECT id, name, slug
    FROM shops
    WHERE slug IS NULL OR slug = ''
    ORDER BY id
  `);

  for (const shop of shops) {
    await db.run('UPDATE shops SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      await uniqueShopSlug(db, shop.slug || shop.name, shop.id),
      shop.id
    ]);
  }

  const customers = await db.all(`
    SELECT id, shop_id, name, slug
    FROM customers
    WHERE slug IS NULL OR slug = ''
    ORDER BY id
  `);

  for (const customer of customers) {
    await db.run('UPDATE customers SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      await uniqueCustomerSlug(db, customer.shop_id, customer.slug || customer.name, customer.id),
      customer.id
    ]);
  }
}

async function uniqueShopSlug(db, value, excludeId = null) {
  return uniqueSlug(db, {
    table: 'shops',
    value,
    fallback: 'Shop',
    excludeId
  });
}

async function uniqueCustomerSlug(db, shopId, value, excludeId = null) {
  return uniqueSlug(db, {
    table: 'customers',
    value,
    fallback: 'Customer',
    shopId,
    excludeId
  });
}

async function uniqueSlug(db, options) {
  const base = createSlug(options.value, options.fallback);
  let suffix = 1;
  let candidate = base;

  while (await slugExists(db, options, candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

async function slugExists(db, options, slug) {
  const params = [slug];
  let sql = `SELECT id FROM ${options.table} WHERE slug = ?`;

  if (options.shopId) {
    sql += ' AND shop_id = ?';
    params.push(options.shopId);
  }

  if (options.excludeId) {
    sql += ' AND id <> ?';
    params.push(options.excludeId);
  }

  sql += ' LIMIT 1';
  return Boolean(await db.get(sql, params));
}

function createSlug(value, fallback = 'Item') {
  const text = String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '');

  return text || fallback;
}

function createCardNumber(shopId) {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `MC${String(shopId).padStart(3, '0')}${Date.now().toString().slice(-6)}${random}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function dateTimeOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function monthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString().slice(0, 19).replace('T', ' '),
    end: end.toISOString().slice(0, 19).replace('T', ' ')
  };
}

function arrayParams(params) {
  if (Array.isArray(params)) {
    return params;
  }
  if (params === undefined || params === null) {
    return [];
  }
  return [params];
}

function escapeIdentifier(value) {
  return String(value).replaceAll('`', '``');
}

module.exports = {
  createCardNumber,
  createSlug,
  createDatabase,
  createUser,
  monthRange,
  normalizeEmail,
  uniqueCustomerSlug,
  uniqueShopSlug,
  updateUserPassword
};

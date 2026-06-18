const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const secretPath = path.join(dataDir, 'auth-secret.txt');

function ensureSecret() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(secretPath)) {
    fs.writeFileSync(secretPath, crypto.randomBytes(48).toString('hex'), 'utf8');
  }

  return fs.readFileSync(secretPath, 'utf8').trim();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signToken(payload, ttlSeconds = 60 * 60 * 12) {
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = encodeJson({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  });
  const signature = crypto
    .createHmac('sha256', ensureSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Token khong hop le');
  }

  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', ensureSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Chu ky token khong hop le');
  }

  const payload = decodeJson(body);
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token da het han');
  }

  return payload;
}

module.exports = {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken
};

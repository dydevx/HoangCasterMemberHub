import crypto from "node:crypto";
import { normalizeRole } from "@/lib/memberhub/access";

const tokenSecret =
  process.env.MEMBERHUB_AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "memberhub-local-dev-secret";

export function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(String(expectedHash || ""), "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

export function hashPassword(password) {
  const password_salt = crypto.randomBytes(16).toString("hex");
  const password_hash = crypto.scryptSync(String(password || ""), password_salt, 64).toString("hex");

  return { password_hash, password_salt };
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

export function signToken(payload, ttlSeconds = 60 * 60 * 12) {
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const body = encodeJson({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  });
  const signature = crypto
    .createHmac("sha256", tokenSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Token khong hop le");
  }

  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac("sha256", tokenSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Chu ky token khong hop le");
  }

  const payload = decodeJson(body);
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token da het han");
  }

  return payload;
}

export function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    status: user.status,
    phone: user.phone,
    locale: user.locale || "vi",
    avatar_url: user.avatar_url || user.avatarUrl || null
  };
}

function missingColumn(error, column) {
  const message = error?.message || "";
  return message.includes(`'${column}' column`) || message.includes(`column ${column}`) || message.includes(`.${column}`);
}

async function readMemberUserById(supabase, id) {
  const result = await supabase
    .from("member_users")
    .select("id,name,email,role,status,phone,locale,avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (missingColumn(result.error, "avatar_url")) {
    return supabase
      .from("member_users")
      .select("id,name,email,role,status,phone,locale")
      .eq("id", id)
      .maybeSingle();
  }

  return result;
}

export async function requireMemberUser(request, supabase) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return { error: "Can dang nhap", status: 401 };
  }

  try {
    const payload = verifyToken(match[1]);

    if (!supabase || payload.demo) {
      return { error: "Server chua cau hinh Supabase.", status: 500 };
    }

    const { data, error } = await readMemberUserById(supabase, payload.sub);

    if (error || !data) {
      return { error: "Tai khoan khong ton tai", status: 401 };
    }

    if (data.status !== "active") {
      return { error: "Tai khoan dang bi khoa", status: 403 };
    }

    return { user: { ...data, role: normalizeRole(data.role) } };
  } catch {
    return { error: "Token khong hop le", status: 401 };
  }
}

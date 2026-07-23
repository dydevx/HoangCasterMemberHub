import { publicUser, signToken, verifyPassword } from "@/lib/memberhub/auth";
import { normalizeRole, roleMatches } from "@/lib/memberhub/access";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";

const loginSchema = z.object({
  role: z.enum(["admin", "owner", "customer", "super_admin", "store_owner"]).optional().or(z.literal("")),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1)
});

export async function POST(request) {
  const rateLimit = checkRateLimit(request, { key: "login", limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Qua nhieu lan dang nhap. Vui long thu lai sau." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  const supabase = createSupabaseServerClient({ useServiceRole: true });
  const authClient = createSupabaseServerClient();

  const body = await request.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Du lieu dang nhap khong hop le" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const role = parsed.data.role || "";

  if (!supabase) {
    return NextResponse.json({ error: "Server chua cau hinh Supabase." }, { status: 500 });
  }

  const { data: authData } = authClient
    ? await authClient.auth.signInWithPassword({ email, password })
    : { data: null };

  const { data: user, error } = await supabase
    .from("member_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  const passwordMatches = user && verifyPassword(password, user.password_salt, user.password_hash);
  const supabaseAuthMatches = Boolean(authData?.user);

  if (error || !user || (!passwordMatches && !supabaseAuthMatches)) {
    return NextResponse.json({ error: "Email hoac mat khau khong dung" }, { status: 401 });
  }

  if (role && !roleMatches(user.role, role)) {
    return NextResponse.json({ error: "Tai khoan khong thuoc khu vuc dang nhap nay" }, { status: 403 });
  }

  if (user.status !== "active") {
    return NextResponse.json({ error: "Tai khoan dang bi khoa" }, { status: 403 });
  }

  try {
    return NextResponse.json({
      authProvider: supabaseAuthMatches ? "supabase" : "memberhub",
      emailVerified: authData?.user?.email_confirmed_at ? true : null,
      token: signToken({ sub: user.id, role: normalizeRole(user.role) }),
      user: publicUser(user)
    });
  } catch {
    return NextResponse.json({ error: "Server chua cau hinh bao mat dang nhap." }, { status: 500 });
  }
}

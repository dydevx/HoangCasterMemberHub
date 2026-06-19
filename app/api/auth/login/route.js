import { publicUser, signToken, verifyPassword } from "@/lib/memberhub/auth";
import { normalizeRole, roleMatches } from "@/lib/memberhub/access";
import { getDemoPasswordForRole, getDemoUserByEmail } from "@/lib/memberhub/demoData";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  role: z.enum(["admin", "owner", "customer", "super_admin", "store_owner"]).optional().or(z.literal("")),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1)
});

export async function POST(request) {
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
    const demoUser = getDemoUserByEmail(email);
    const demoPassword = getDemoPasswordForRole(demoUser?.role);

    if (!demoUser || password !== demoPassword) {
      return NextResponse.json({ error: "Email hoac mat khau khong dung" }, { status: 401 });
    }

    if (role && !roleMatches(demoUser.role, role)) {
      return NextResponse.json({ error: "Tai khoan khong thuoc khu vuc dang nhap nay" }, { status: 403 });
    }

    return NextResponse.json({
      demo: true,
      warning: "Supabase is not configured. Running local demo data.",
      token: signToken({ sub: demoUser.id, role: normalizeRole(demoUser.role), demo: true }),
      user: publicUser(demoUser)
    });
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

  return NextResponse.json({
    authProvider: supabaseAuthMatches ? "supabase" : "memberhub",
    emailVerified: authData?.user?.email_confirmed_at ? true : null,
    token: signToken({ sub: user.id, role: normalizeRole(user.role) }),
    user: publicUser(user)
  });
}

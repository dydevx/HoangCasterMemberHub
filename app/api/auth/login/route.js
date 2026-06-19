import { publicUser, signToken, verifyPassword } from "@/lib/memberhub/auth";
import { getDemoPasswordForRole, getDemoUserByEmail } from "@/lib/memberhub/demoData";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(request) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "");

  if (!supabase) {
    const demoUser = getDemoUserByEmail(email);
    const demoPassword = getDemoPasswordForRole(demoUser?.role);

    if (!demoUser || password !== demoPassword) {
      return NextResponse.json({ error: "Email hoac mat khau khong dung" }, { status: 401 });
    }

    if (role && demoUser.role !== role) {
      return NextResponse.json({ error: "Tai khoan khong thuoc khu vuc dang nhap nay" }, { status: 403 });
    }

    return NextResponse.json({
      demo: true,
      warning: "Supabase is not configured. Running local demo data.",
      token: signToken({ sub: demoUser.id, role: demoUser.role, demo: true }),
      user: publicUser(demoUser)
    });
  }

  const { data: user, error } = await supabase
    .from("member_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error || !user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return NextResponse.json({ error: "Email hoac mat khau khong dung" }, { status: 401 });
  }

  if (role && user.role !== role) {
    return NextResponse.json({ error: "Tai khoan khong thuoc khu vuc dang nhap nay" }, { status: 403 });
  }

  if (user.status !== "active") {
    return NextResponse.json({ error: "Tai khoan dang bi khoa" }, { status: 403 });
  }

  return NextResponse.json({
    token: signToken({ sub: user.id, role: user.role }),
    user: publicUser(user)
  });
}

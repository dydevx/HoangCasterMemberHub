import { publicUser, signToken, verifyPassword } from "@/lib/memberhub/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(request) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  if (!supabase) {
    return NextResponse.json({ error: "Server chua cau hinh Supabase." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "");

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

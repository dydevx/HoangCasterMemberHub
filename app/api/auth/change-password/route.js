import {
  hashPassword,
  requireMemberUser,
  verifyPassword
} from "@/lib/memberhub/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Mat khau moi phai co it nhat 8 ky tu" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient({ useServiceRole: true });
  const authClient = createSupabaseServerClient();
  const auth = await requireMemberUser(request, supabase);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { currentPassword, newPassword } = parsed.data;

  if (!supabase) {
    return NextResponse.json({ error: "Server chua cau hinh Supabase." }, { status: 500 });
  }

  const { data: user, error } = await supabase
    .from("member_users")
    .select("id,email,password_hash,password_salt")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: "Tai khoan khong ton tai" }, { status: 404 });
  }

  const memberPasswordMatches = verifyPassword(currentPassword, user.password_salt, user.password_hash);
  const { data: authSignInData } =
    !memberPasswordMatches && authClient
      ? await authClient.auth.signInWithPassword({ email: user.email, password: currentPassword })
      : { data: null };

  if (!memberPasswordMatches && !authSignInData?.user) {
    return NextResponse.json({ error: "Mat khau hien tai khong dung" }, { status: 401 });
  }

  const passwordPayload = hashPassword(newPassword);
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
  const authUser = listError
    ? null
    : authUsers?.users?.find((item) => item.email?.toLowerCase() === user.email.toLowerCase());

  if (authUser) {
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword
    });

    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
    }
  }

  const { error: updateError } = await supabase
    .from("member_users")
    .update(passwordPayload)
    .eq("id", auth.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

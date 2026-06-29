import { publicUser, requireMemberUser } from "@/lib/memberhub/auth";
import { isCustomer } from "@/lib/memberhub/access";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

const avatarMaxLength = 1200000;

function normalizeAvatar(value) {
  if (value === null || value === undefined || value === "") return { value: null };

  const avatar = String(value);
  if (avatar.length > avatarMaxLength) {
    return { error: "Ảnh đại diện quá lớn. Hãy chọn ảnh nhỏ hơn 900KB." };
  }

  if (!avatar.startsWith("data:image/")) {
    return { error: "Ảnh đại diện phải là tệp hình ảnh hợp lệ." };
  }

  return { value: avatar };
}

function missingAvatarColumn(error) {
  const message = error?.message || "";
  return message.includes("'avatar_url' column") || message.includes("column avatar_url") || message.includes(".avatar_url");
}

export async function GET(request) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  const auth = await requireMemberUser(request, supabase);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    demo: auth.demo || false,
    user: publicUser(auth.user)
  });
}

export async function PATCH(request) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });

  const auth = await requireMemberUser(request, supabase);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const avatar = normalizeAvatar(body.avatar_url);
  if (avatar.error) {
    return NextResponse.json({ error: avatar.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("member_users")
    .update({ avatar_url: avatar.value })
    .eq("id", auth.user.id)
    .select("id,name,email,role,status,phone,locale,avatar_url")
    .single();

  if (error) {
    if (missingAvatarColumn(error)) {
      return NextResponse.json({
        error: "Database chưa có cột avatar_url. Hãy chạy file database/safe_memberhub_migration.sql."
      }, { status: 400 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (isCustomer(data)) {
    await supabase
      .from("customers")
      .update({ avatar_url: avatar.value })
      .eq("user_id", data.id);
  }

  return NextResponse.json({ user: publicUser(data) });
}

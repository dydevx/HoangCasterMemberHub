import { requireMemberUser } from "@/lib/memberhub/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

async function setPresence(request, online) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });
  const auth = await requireMemberUser(request, supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase
    .from("member_users")
    .update({ last_seen_at: online ? new Date().toISOString() : null })
    .eq("id", auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ online });
}

export async function POST(request) {
  return setPresence(request, true);
}

export async function DELETE(request) {
  return setPresence(request, false);
}

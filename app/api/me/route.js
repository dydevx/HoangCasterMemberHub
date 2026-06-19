import { publicUser, requireMemberUser } from "@/lib/memberhub/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

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

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { z } from "zod";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const contactSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().optional().or(z.literal("")),
  productId: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal(""))
}).refine((value) => Boolean(value.email || value.phone), {
  message: "Email or phone is required"
});

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Du lieu gui len khong hop le." }, { status: 400 });
  }

  const website = cleanText(payload.website);

  if (website) {
    return NextResponse.json({ ok: true });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Du lieu gui len khong hop le." }, { status: 400 });
  }

  const fullName = parsed.data.fullName;
  const email = (parsed.data.email || "").toLowerCase();
  const phone = parsed.data.phone || "";
  const message = parsed.data.message || "";
  const productId = parsed.data.productId || null;

  const supabase =
    createSupabaseServerClient({ useServiceRole: true }) || createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { message: "Server chua cau hinh bien moi truong Supabase." },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("contacts").insert({
    product_id: productId,
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    message,
    source: "website"
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Cam on ban. Yeu cau da duoc ghi nhan."
  });
}

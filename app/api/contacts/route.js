import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Du lieu gui len khong hop le." }, { status: 400 });
  }

  const fullName = cleanText(payload.fullName);
  const email = cleanText(payload.email).toLowerCase();
  const phone = cleanText(payload.phone);
  const message = cleanText(payload.message);
  const productId = cleanText(payload.productId) || null;
  const website = cleanText(payload.website);

  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (fullName.length < 2) {
    return NextResponse.json({ message: "Vui long nhap ho ten." }, { status: 400 });
  }

  if (!email && !phone) {
    return NextResponse.json({ message: "Vui long nhap email hoac so dien thoai." }, { status: 400 });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: "Email khong hop le." }, { status: 400 });
  }

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

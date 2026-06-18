import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const productSelect =
  "id,title,slug,category,summary,description,price,currency,image_url,is_published,created_at";

export async function getPublishedProducts() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      products: [],
      error: "Chua cau hinh bien moi truong Supabase.",
      isConfigured: false
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return {
    products: data ?? [],
    error: error?.message ?? null,
    isConfigured: true
  };
}

export async function getProductBySlug(slug) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      product: null,
      error: "Chua cau hinh bien moi truong Supabase.",
      isConfigured: false
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return {
    product: data,
    error: error?.message ?? null,
    isConfigured: true
  };
}

export function formatPrice(price, currency = "VND") {
  if (price === null || price === undefined) {
    return "Lien he";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2
  }).format(Number(price));
}

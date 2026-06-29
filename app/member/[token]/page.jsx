import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";

function money(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateText(value) {
  if (!value) return "-";
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${Number(match[3])}/${Number(match[2])}/${match[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7) return "";
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

function nextLevel(levels, card) {
  const sorted = [...levels].sort((left, right) => Number(left.min_points || 0) - Number(right.min_points || 0));
  return sorted.find((level) => Number(level.min_points || 0) > Number(card.points || 0)) || null;
}

async function readMember(token) {
  const supabase = createSupabaseServerClient({ useServiceRole: true });
  if (!supabase) return null;

  const { data: card, error: cardError } = await supabase
    .from("membership_cards")
    .select("id,customer_id,shop_id,card_number,points,tier,total_spend,updated_at,created_at,status")
    .eq("secure_token", token)
    .maybeSingle();

  if (cardError || !card || card.status !== "active") return null;

  const [{ data: customer }, { data: shop }, { data: levels }] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,phone,status")
      .eq("id", card.customer_id)
      .eq("shop_id", card.shop_id)
      .maybeSingle(),
    supabase
      .from("shops")
      .select("id,name,logo_data_url,status")
      .eq("id", card.shop_id)
      .maybeSingle(),
    supabase
      .from("membership_levels")
      .select("name,min_points,min_spend,benefits,status")
      .eq("shop_id", card.shop_id)
      .eq("status", "active")
  ]);

  if (!customer || !shop) return null;

  return { card, customer, shop, levels: levels || [] };
}

export default async function PublicMemberPage({ params }) {
  const { token } = await params;
  const data = await readMember(token);
  if (!data) notFound();

  const target = nextLevel(data.levels, data.card);
  const progress = target
    ? Math.min(100, Math.round((Number(data.card.points || 0) / Math.max(1, Number(target.min_points || 1))) * 100))
    : 100;
  const currentBenefits = data.levels.find((level) => level.name === data.card.tier)?.benefits;

  return (
    <main className="mh-public-member">
      <section className="mh-public-card">
        <div className="mh-public-shop">
          {data.shop.logo_data_url ? <img src={data.shop.logo_data_url} alt="" /> : null}
          <span>{data.shop.name}</span>
        </div>
        <h1>{data.customer.name}</h1>
        {maskPhone(data.customer.phone) ? <p>{maskPhone(data.customer.phone)}</p> : null}
        <div className="mh-public-number">{data.card.card_number}</div>
        <div className="mh-public-stats">
          <article>
            <span>Điểm hiện tại</span>
            <strong>{Number(data.card.points || 0).toLocaleString("vi-VN")}</strong>
          </article>
          <article>
            <span>Hạng hiện tại</span>
            <strong>{data.card.tier}</strong>
          </article>
          <article>
            <span>Tổng chi tiêu</span>
            <strong>{money(data.card.total_spend)}</strong>
          </article>
        </div>
        <div className="mh-progress">
          <div style={{ width: `${progress}%` }} />
        </div>
        <p>
          {target
            ? `Còn ${Math.max(0, Number(target.min_points || 0) - Number(data.card.points || 0)).toLocaleString("vi-VN")} điểm để lên hạng ${target.name}.`
            : "Bạn đang ở hạng cao nhất hiện có."}
        </p>
        {currentBenefits ? <div className="mh-public-benefits">{currentBenefits}</div> : null}
        <small>Cập nhật gần nhất: {dateText(data.card.updated_at || data.card.created_at)}</small>
      </section>
    </main>
  );
}

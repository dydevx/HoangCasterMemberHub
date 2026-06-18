import { ContactForm } from "@/components/ContactForm";
import { StatusBanner } from "@/components/StatusBanner";
import { formatPrice, getProductBySlug } from "@/lib/products";
import { ArrowLeft, CalendarDays, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { product } = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Khong tim thay | HoangCaster Member Hub"
    };
  }

  return {
    title: `${product.title} | HoangCaster Member Hub`,
    description: product.summary
  };
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const { product, error, isConfigured } = await getProductBySlug(slug);

  if (!product && isConfigured && !error) {
    notFound();
  }

  if (!product) {
    return (
      <section className="content-band detail-empty">
        <StatusBanner
          tone="warning"
          title="Chưa tải được trang chi tiết"
          message={error || "Không tìm thấy sản phẩm."}
        />
        <Link className="secondary-button fit-button" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Về trang chủ
        </Link>
      </section>
    );
  }

  return (
    <section className="detail-layout content-band">
      <div className="detail-media">
        <img src={product.image_url || "/assets/beauty-hero.png"} alt={product.title} />
      </div>

      <article className="detail-content">
        <Link className="back-link" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Về danh sách
        </Link>
        <p className="eyebrow">{product.category}</p>
        <h1>{product.title}</h1>
        <p className="lead-text">{product.summary}</p>
        <div className="meta-row">
          <span>
            <Tag size={18} aria-hidden="true" />
            {formatPrice(product.price, product.currency)}
          </span>
          <span>
            <CalendarDays size={18} aria-hidden="true" />
            Cập nhật {new Date(product.created_at).toLocaleDateString("vi-VN")}
          </span>
        </div>
        <div className="rich-text">
          {(product.description || product.summary || "")
            .split("\n")
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
        </div>
      </article>

      <aside className="detail-form" id="order">
        <ContactForm productId={product.id} productName={product.title} />
      </aside>
    </section>
  );
}

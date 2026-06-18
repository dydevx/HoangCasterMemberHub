import { ContactForm } from "@/components/ContactForm";
import { ProductCard } from "@/components/ProductCard";
import { StatusBanner } from "@/components/StatusBanner";
import { getPublishedProducts } from "@/lib/products";
import { ArrowRight, BadgeCheck, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { products, error, isConfigured } = await getPublishedProducts();
  const featured = products[0];

  return (
    <>
      <section className="hero-section">
        <div className="hero-media" aria-hidden="true">
          <img src="/assets/beauty-hero.png" alt="" />
        </div>
        <div className="hero-content layout-grid">
          <div className="hero-copy">
            <p className="eyebrow">HoangCaster Member Hub</p>
            <h1>Website sản phẩm và dịch vụ kết nối trực tiếp Supabase.</h1>
            <p>
              Hiển thị danh mục, trang chi tiết và tiếp nhận liên hệ/đặt hàng với
              dữ liệu lưu trong PostgreSQL trên Supabase.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="#products">
                Xem danh sách
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="secondary-button" href="#contact">
                Gửi liên hệ
              </Link>
            </div>
          </div>
          <div className="hero-panel">
            <div>
              <span className="panel-label">Trạng thái dữ liệu</span>
              <strong>{isConfigured ? "Supabase ready" : "Cần cấu hình env"}</strong>
            </div>
            <div className="signal-list">
              <span>
                <Database size={18} aria-hidden="true" />
                PostgreSQL
              </span>
              <span>
                <ShieldCheck size={18} aria-hidden="true" />
                RLS policies
              </span>
              <span>
                <BadgeCheck size={18} aria-hidden="true" />
                Vercel deploy
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="content-band" id="products">
        <div className="section-heading">
          <p className="eyebrow">Danh mục</p>
          <h2>Sản phẩm, dịch vụ và bài viết nổi bật</h2>
          <p>
            Nội dung bên dưới được đọc từ bảng <code>products</code> trên Supabase.
          </p>
        </div>

        {error ? <StatusBanner tone="warning" title="Chưa tải được dữ liệu" message={error} /> : null}

        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Chưa có dữ liệu hiển thị</h3>
            <p>
              Chạy file <code>database/supabase_schema.sql</code> trong Supabase SQL
              Editor, thêm biến môi trường rồi refresh trang.
            </p>
          </div>
        )}
      </section>

      <section className="content-band contact-band" id="contact">
        <div className="contact-copy">
          <p className="eyebrow">Liên hệ</p>
          <h2>{featured ? `Quan tâm ${featured.title}?` : "Gửi yêu cầu tư vấn"}</h2>
          <p>
            Form này gửi dữ liệu tới route server của Next.js, sau đó lưu vào bảng
            <code> contacts</code> trong Supabase.
          </p>
        </div>
        <ContactForm productId={featured?.id} productName={featured?.title} />
      </section>
    </>
  );
}

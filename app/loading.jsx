export default function Loading() {
  return (
    <section className="content-band">
      <div className="section-heading">
        <p className="eyebrow">Đang tải</p>
        <h2>Đang lấy dữ liệu từ Supabase</h2>
      </div>
      <div className="product-grid">
        {[1, 2, 3].map((item) => (
          <div className="skeleton-card" key={item} />
        ))}
      </div>
    </section>
  );
}

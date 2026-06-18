import Link from "next/link";

export default function NotFound() {
  return (
    <section className="content-band detail-empty">
      <div className="empty-state">
        <h1>Không tìm thấy nội dung</h1>
        <p>Sản phẩm hoặc dịch vụ này chưa được xuất bản.</p>
      </div>
      <Link className="primary-button fit-button" href="/">
        Về trang chủ
      </Link>
    </section>
  );
}

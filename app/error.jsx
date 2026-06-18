"use client";

import { StatusBanner } from "@/components/StatusBanner";

export default function Error({ error, reset }) {
  return (
    <section className="content-band detail-empty">
      <StatusBanner
        tone="error"
        title="Có lỗi khi hiển thị trang"
        message={error?.message || "Vui lòng thử lại."}
      />
      <button className="primary-button fit-button" onClick={reset}>
        Thử lại
      </button>
    </section>
  );
}

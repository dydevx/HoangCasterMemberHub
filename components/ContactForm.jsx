"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState } from "react";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  message: "",
  website: ""
};

export function ContactForm({ productId, productName }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, productId })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Khong gui duoc yeu cau.");
      }

      setForm(initialForm);
      setStatus({
        type: "success",
        message: result.message || "Da gui thanh cong."
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Co loi xay ra. Vui long thu lai."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={submitForm}>
      <div className="form-heading">
        <span className="form-icon">
          <Send size={20} aria-hidden="true" />
        </span>
        <div>
          <h3>Gửi yêu cầu</h3>
          <p>{productName ? `Sản phẩm quan tâm: ${productName}` : "Chúng tôi sẽ phản hồi sớm."}</p>
        </div>
      </div>

      <label>
        Họ tên
        <input
          name="fullName"
          value={form.fullName}
          onChange={updateField}
          autoComplete="name"
          required
          placeholder="Nguyen Van A"
        />
      </label>

      <div className="form-row">
        <label>
          Email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Số điện thoại
          <input
            name="phone"
            value={form.phone}
            onChange={updateField}
            autoComplete="tel"
            placeholder="090..."
          />
        </label>
      </div>

      <label>
        Nội dung
        <textarea
          name="message"
          value={form.message}
          onChange={updateField}
          rows={5}
          placeholder="Tôi muốn được tư vấn thêm..."
        />
      </label>

      <input
        className="hidden-field"
        name="website"
        value={form.website}
        onChange={updateField}
        tabIndex={-1}
        autoComplete="off"
      />

      {status.type !== "idle" ? (
        <div className={`inline-message ${status.type}`} role={status.type === "error" ? "alert" : "status"}>
          {status.type === "success" ? <CheckCircle2 size={18} aria-hidden="true" /> : null}
          <span>{status.message}</span>
        </div>
      ) : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
        {isSubmitting ? "Đang gửi" : "Gửi yêu cầu"}
      </button>
    </form>
  );
}

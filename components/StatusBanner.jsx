import { AlertCircle, CheckCircle2 } from "lucide-react";

export function StatusBanner({ tone = "info", title, message }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`status-banner ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}

import { Layers3 } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">
          <Layers3 size={22} aria-hidden="true" />
        </span>
        <span>HoangCaster</span>
      </Link>
      <nav aria-label="Dieu huong chinh">
        <Link href="/#products">Danh mục</Link>
        <Link href="/#contact">Liên hệ</Link>
      </nav>
    </header>
  );
}

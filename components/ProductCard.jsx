import { formatPrice } from "@/lib/products";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <a className="product-image" href={`/products/${product.slug}`}>
        <img src={product.image_url || "/assets/beauty-hero.png"} alt={product.title} />
      </a>
      <div className="product-body">
        <div className="product-kicker">
          <span>{product.category}</span>
          <strong>{formatPrice(product.price, product.currency)}</strong>
        </div>
        <h3>{product.title}</h3>
        <p>{product.summary}</p>
        <Link className="text-link" href={`/products/${product.slug}`}>
          Xem chi tiết
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

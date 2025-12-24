import { Metadata } from "next";
import { ProductPageClient } from "./ProductPageClient";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Extract a readable name from the slug
  const productName = slug
    .split("-")
    .slice(0, -1) // Remove the ID part
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: productName || "Product",
    description: `Check out ${productName} at Dark Point - Your destination for elite gaming gear and tech.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return <ProductPageClient slug={slug} />;
}

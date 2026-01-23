export interface ProductImage {
  id: string;
  src: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  value?: string;
  displayName?: string; // Custom display name set in admin
  color?: string;
  size?: string;
  price: number;
  compareAtPrice?: number;
  image?: ProductImage | string;
  stock?: number;
  sku?: string;
  inStock?: boolean;
  isHidden?: boolean; // Whether this variant is hidden on the website
  attributes?: Record<string, string>; // Multi-dimensional attributes like { "Size": "M", "Style": "A" }
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  categoryId?: string;
  tags: string[];
  images: ProductImage[];
  variants?: ProductVariant[];
  variantGroupName?: string; // Custom name for variant options (e.g., "Wood Type" instead of "Options")
  rating: number;
  reviewCount: number;
  inStock: boolean;
  featured?: boolean;
  weight?: number;
  supplier?: {
    id: string;
    name: string;
    location: string;
  };
  shippingInfo?: {
    processingTime: string;
    shippingTime: string;
    freeShipping: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  author: string;
  authorImage?: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  helpful: number;
}

export type ProductSortOption = 
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "rating"
  | "newest";

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  search?: string;
}


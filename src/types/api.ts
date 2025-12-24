// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// CJDropshipping API Types
export interface CJProduct {
  pid: string;
  productName: string;
  productNameEn: string;
  productImage: string;
  productImages: string[];
  categoryId: string;
  sellPrice: number;
  sourcePrice: number;
  productWeight: number;
  packageWeight: number;
  productSku: string;
  variants: CJVariant[];
  description: string;
  sourceFrom: string;
  sellPoint: string;
  remark: string;
  entryTime: string;
  updateTime: string;
}

export interface CJVariant {
  vid: string;
  variantName: string;
  variantNameEn: string;
  variantValue: string;
  variantValueEn: string;
  variantImage: string;
  variantSku: string;
  variantKey: string;
  sellPrice: number;
  sourcePrice: number;
  quantity: number;
  remark: string;
}

export interface CJCategory {
  categoryId: string;
  categoryName: string;
  parentId?: string;
  level: number;
  slug?: string;
}

// Product API Response (transformed from CJ)
export interface ProductApiResponse {
  success: boolean;
  data: TransformedProduct[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface SingleProductApiResponse {
  success: boolean;
  data: TransformedProduct;
  error?: string;
}

export interface TransformedProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  categoryId: string;
  tags: string[];
  images: Array<{ id: string; src: string; alt: string }>;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  featured: boolean;
  weight: number;
  supplier: {
    id: string;
    name: string;
    location: string;
  };
  shippingInfo: {
    processingTime: string;
    shippingTime: string;
    freeShipping: boolean;
  };
  variants: TransformedVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface TransformedVariant {
  id: string;
  name: string;
  value: string;
  price: number;
  stock: number;
  sku: string;
  image?: string;
}

// Category API Response
export interface CategoryApiResponse {
  success: boolean;
  data: CJCategory[];
  grouped?: {
    main: CJCategory[];
    sub: CJCategory[];
    detailed: CJCategory[];
  };
  source: 'cjdropshipping' | 'fallback';
}

// Search API Response
export interface SearchApiResponse {
  products: TransformedProduct[];
  total: number;
  page: number;
  limit: number;
  query: string;
  error?: string;
}



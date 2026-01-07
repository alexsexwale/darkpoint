import axios, { AxiosInstance, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { env } from '@/config/env';
import type { CJProduct, CJVariant, ApiResponse } from '@/types';

type CJAuthTokens = {
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
};

const GLOBAL_TOKENS_KEY = '__CJ_AUTH_TOKENS__';
const GLOBAL_AUTH_INFLIGHT_KEY = '__CJ_AUTH_INFLIGHT__';

class CJDropshippingAPI {
  private client: AxiosInstance;
  private authClient: AxiosInstance;

  private userId: string;
  private key: string;
  private secret: string;
  
  private email: string;
  private password: string;
  private tokens: CJAuthTokens | null;

  constructor() {
    this.userId = env.cjDropshipping.userId;
    this.key = env.cjDropshipping.key;
    this.secret = env.cjDropshipping.secret;
    this.email = env.cjDropshipping.email;
    this.password = env.cjDropshipping.password;
    this.tokens = (globalThis as Record<string, unknown>)[GLOBAL_TOKENS_KEY] as CJAuthTokens | null || null;

    // Normalize base URL (ensure https and /api2.0 suffix)
    let baseUrl = (env.cjDropshipping.apiUrl || '').trim();
    if (!baseUrl) baseUrl = 'https://developers.cjdropshipping.com/api2.0';
    if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;
    try {
      const u = new URL(baseUrl);
      if (u.hostname === 'api.cjdropshipping.com' || u.hostname === 'api2.cjdropshipping.com') {
        u.hostname = 'developers.cjdropshipping.com';
        baseUrl = u.toString();
      }
    } catch {
      // Ignore URL parsing errors
    }
    if (!/\/api2\.0$/i.test(baseUrl)) baseUrl = baseUrl.replace(/\/$/, '') + '/api2.0';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Darkpoint/1.0',
      },
    });

    this.authClient = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Darkpoint/1.0',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      await this.ensureAccessToken();

      if (config.headers && this.tokens?.accessToken) {
        config.headers['CJ-Access-Token'] = this.tokens.accessToken;
      }
      if (this.userId && this.key && this.secret) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const sign = this.generateSignature(timestamp);
        if (config.headers) {
          config.headers['CJ-Access-Timestamp'] = timestamp;
          config.headers['CJ-Access-Sign'] = sign;
        }
      }
      if (config.headers) {
        config.headers['User-Agent'] = 'Darkpoint/1.0';
      }

      return config;
    });
  }

  private generateSignature(timestamp: string): string {
    const message = `${this.userId}${timestamp}${this.key}${this.secret}`;
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  private isTokenExpired(iso: string | undefined | null): boolean {
    if (!iso) return true;
    const expires = new Date(iso).getTime() - 60 * 1000; // safety margin
    return Date.now() >= expires;
  }

  private async ensureAccessToken(): Promise<void> {
    // Use cached tokens if available
    if (!this.tokens) {
      await this.login();
      return;
    }
    if (this.isTokenExpired(this.tokens.accessTokenExpiryDate) && !this.isTokenExpired(this.tokens.refreshTokenExpiryDate)) {
      await this.refreshAccessToken();
      return;
    }
    if (this.isTokenExpired(this.tokens.refreshTokenExpiryDate)) {
      await this.login();
    }
  }

  private async login(): Promise<void> {
    if (!this.email || !this.password) {
      throw new Error('CJDropshipping credentials are not configured. Set CJ_DROPSHIPPING_EMAIL and CJ_DROPSHIPPING_PASSWORD in .env.local');
    }

    const existing = (globalThis as Record<string, unknown>)[GLOBAL_AUTH_INFLIGHT_KEY] as Promise<void> | undefined;
    if (existing) {
      await existing; // wait for ongoing login
      this.tokens = (globalThis as Record<string, unknown>)[GLOBAL_TOKENS_KEY] as CJAuthTokens | null || this.tokens;
      return;
    }

    const inflight = (async () => {
      const { data } = await this.authClient.post('/v1/authentication/getAccessToken', {
        email: this.email,
        password: this.password,
      });
      if (data?.result && data?.data) {
        this.tokens = {
          accessToken: data.data.accessToken,
          accessTokenExpiryDate: data.data.accessTokenExpiryDate,
          refreshToken: data.data.refreshToken,
          refreshTokenExpiryDate: data.data.refreshTokenExpiryDate,
        };
        (globalThis as Record<string, unknown>)[GLOBAL_TOKENS_KEY] = this.tokens;
      } else {
        throw new Error(`CJ login failed: ${data?.message || 'Unknown error'}`);
      }
    })();
    (globalThis as Record<string, unknown>)[GLOBAL_AUTH_INFLIGHT_KEY] = inflight;
    try {
      await inflight;
    } finally {
      (globalThis as Record<string, unknown>)[GLOBAL_AUTH_INFLIGHT_KEY] = undefined;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      await this.login();
      return;
    }
    const { data } = await this.authClient.post('/v1/authentication/refreshAccessToken', {
      refreshToken: this.tokens.refreshToken,
    });
    if (data?.result && data?.data) {
      this.tokens = {
        accessToken: data.data.accessToken,
        accessTokenExpiryDate: data.data.accessTokenExpiryDate,
        refreshToken: data.data.refreshToken,
        refreshTokenExpiryDate: data.data.refreshTokenExpiryDate,
      };
      (globalThis as Record<string, unknown>)[GLOBAL_TOKENS_KEY] = this.tokens;
    } else {
      await this.login();
    }
  }

  // Get product list with pagination and filters
  async getProducts(params: {
    pageNum?: number;
    pageSize?: number;
    categoryId?: string;
    keywords?: string;
    sourceFrom?: string;
  } = {}): Promise<ApiResponse<CJProduct[]>> {
    try {
      const response: AxiosResponse = await this.client.get('/v1/product/list', {
        params: {
          pageNum: params.pageNum || 1,
          pageSize: params.pageSize || 20,
          categoryId: params.categoryId,
          productName: params.keywords,
          sourceFrom: params.sourceFrom,
        },
      });

      if (response.data.result || response.data.success) {
        const list = response.data.data?.list || response.data.data || [];
        return {
          success: true,
          data: Array.isArray(list) ? list : [],
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch products',
        };
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('CJDropshipping API Error:', err?.response?.data || err?.message);
      return {
        success: false,
        error: err?.response?.data?.message || err?.message || 'API request failed',
      };
    }
  }

  // Get single product details
  async getProduct(productId: string): Promise<ApiResponse<CJProduct>> {
    try {
      const response: AxiosResponse = await this.client.get('/v1/product/query', {
        params: { pid: productId },
      });

      if (response.data.result || response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Product not found',
        };
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('CJDropshipping API Error:', err?.response?.data || err?.message);
      return {
        success: false,
        error: err?.response?.data?.message || err?.message || 'API request failed',
      };
    }
  }

  // Get product variants
  async getProductVariants(productId: string): Promise<ApiResponse<CJVariant[]>> {
    try {
      const response: AxiosResponse = await this.client.get('/v1/product/variant/query', {
        params: { pid: productId },
      });

      if (response.data.result || response.data.success) {
        return {
          success: true,
          data: response.data.data || [],
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch variants',
        };
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('CJDropshipping API Error:', err?.response?.data || err?.message);
      return {
        success: false,
        error: err?.response?.data?.message || err?.message || 'API request failed',
      };
    }
  }

  // Get categories
  async getCategories(): Promise<ApiResponse<Array<{
    categoryId: string;
    categoryName: string;
    parentId?: string;
    level: number;
  }>>> {
    try {
      const response: AxiosResponse = await this.client.get('/v1/product/getCategory');

      if (response.data.result || response.data.success) {
        const raw = response.data.data || [];
        const flattened: Array<{ categoryId: string; categoryName: string; parentId?: string; level: number }> = [];
        
        // CJ returns first/second/third levels nested
        for (const first of raw) {
          const firstName = first.categoryFirstName;
          const firstList = first.categoryFirstList || [];
          for (const second of firstList) {
            const secondName = second.categorySecondName;
            const secondList = second.categorySecondList || [];
            for (const third of secondList) {
              flattened.push({
                categoryId: third.categoryId,
                categoryName: third.categoryName,
                parentId: secondName || firstName,
                level: 3,
              });
            }
          }
        }
        return { success: true, data: flattened };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch categories',
        };
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('CJDropshipping API Error:', err?.response?.data || err?.message);
      return {
        success: false,
        error: err?.response?.data?.message || err?.message || 'API request failed',
      };
    }
  }
}

// Create singleton instance
export const cjDropshipping = new CJDropshippingAPI();

// Helper function to transform CJ product to our product format
export const transformCJProduct = (cjProduct: CJProduct): {
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
  variants: Array<{
    id: string;
    name: string;
    value: string;
    price: number;
    stock: number;
    sku: string;
    image?: string;
  }>;
  createdAt: string;
  updatedAt: string;
} => {
  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v ?? '0'));
    return Number.isFinite(n) ? n : 0;
  };

  const productName = cjProduct.productNameEn || cjProduct.productName || 'Unnamed Product';
  const slug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + cjProduct.pid;

  // Transform images - handle various formats from CJ API
  const parseImages = (rawImages: unknown): string[] => {
    if (!rawImages) return [];
    
    // If it's already an array
    if (Array.isArray(rawImages)) {
      return rawImages.flatMap((img) => parseImages(img));
    }
    
    // If it's a string
    if (typeof rawImages === 'string') {
      const trimmed = rawImages.trim();
      
      // Check if it's a JSON stringified array like '["url1", "url2"]'
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.filter((url): url is string => typeof url === 'string' && url.startsWith('http'));
          }
        } catch {
          // Not valid JSON, try other methods
        }
      }
      
      // Check if it's comma-separated URLs
      if (trimmed.includes(',') && trimmed.includes('http')) {
        return trimmed.split(',')
          .map((url) => url.trim())
          .filter((url) => url.startsWith('http'));
      }
      
      // Single URL
      if (trimmed.startsWith('http')) {
        return [trimmed];
      }
    }
    
    return [];
  };
  
  // Combine productImages and productImage, then dedupe
  let allImages: string[] = [];
  
  if (cjProduct.productImages) {
    allImages = [...allImages, ...parseImages(cjProduct.productImages)];
  }
  
  if (cjProduct.productImage) {
    allImages = [...allImages, ...parseImages(cjProduct.productImage)];
  }
  
  // Remove duplicates and invalid URLs
  const uniqueImages = [...new Set(allImages)].filter((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
  
  const images = uniqueImages.map((src: string, index: number) => ({
    id: `${cjProduct.pid}-${index}`,
    src,
    alt: `${productName} - Image ${index + 1}`,
  }));

  // Calculate price with markup (e.g., 2.5x markup for profit margin)
  const basePrice = toNum(cjProduct.sellPrice);
  const price = Math.ceil(basePrice * 2.5 * 100) / 100; // 2.5x markup, rounded to 2 decimals
  const originalPrice = toNum(cjProduct.sourcePrice);
  const compareAtPrice = originalPrice > basePrice ? Math.ceil(originalPrice * 3 * 100) / 100 : undefined;

  return {
    id: cjProduct.pid,
    slug,
    name: productName,
    description: cjProduct.description || cjProduct.sellPoint || productName,
    shortDescription: cjProduct.sellPoint || cjProduct.description?.slice(0, 150) || productName,
    price,
    compareAtPrice,
    category: mapCJCategory(cjProduct.categoryId, productName),
    categoryId: cjProduct.categoryId,
    tags: extractTags(productName, cjProduct.description || ''),
    images: images.length > 0 ? images : [{ id: `${cjProduct.pid}-0`, src: '/images/placeholder.png', alt: productName }],
    rating: 4 + Math.random(), // Random rating between 4-5
    reviewCount: Math.floor(Math.random() * 100) + 10, // Random review count
    inStock: true,
    featured: Math.random() > 0.7, // 30% chance to be featured
    weight: toNum(cjProduct.productWeight) || 0,
    supplier: {
      id: 'cjdropshipping',
      name: 'CJDropshipping',
      location: cjProduct.sourceFrom || 'China',
    },
    shippingInfo: {
      processingTime: '1-3 days',
      shippingTime: '7-15 days',
      freeShipping: price > 500, // Free shipping for orders over R500
    },
    variants: (cjProduct.variants || []).map(transformCJVariant),
    createdAt: cjProduct.entryTime || new Date().toISOString(),
    updatedAt: cjProduct.updateTime || new Date().toISOString(),
  };
};

export const transformCJVariant = (cjVariant: CJVariant): {
  id: string;
  name: string;
  value: string;
  price: number;
  stock: number;
  sku: string;
  image?: string;
} => {
  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v ?? '0'));
    return Number.isFinite(n) ? n : 0;
  };
  
  return {
    id: cjVariant.vid,
    name: cjVariant.variantNameEn || cjVariant.variantName || '',
    value: cjVariant.variantValueEn || cjVariant.variantValue || '',
    price: Math.ceil(toNum(cjVariant.sellPrice) * 2.5 * 100) / 100,
    stock: cjVariant.quantity || 100,
    sku: cjVariant.variantSku || '',
    image: cjVariant.variantImage,
  };
};

// Map CJ category IDs to our categories based on product name
function mapCJCategory(categoryId: string, productName?: string): string {
  const text = `${categoryId || ''} ${productName || ''}`.toLowerCase();
  
  // Check for gaming-related products first (highest priority for our store)
  if (/gaming|game|controller|gamepad|joystick|console|arcade|nintendo|xbox|playstation|ps[45]|rgb.*keyboard|mechanical.*keyboard/i.test(text)) {
    return 'gaming';
  }
  
  // Audio products
  if (/headset|headphone|earphone|earbud|speaker|microphone|mic|audio|sound|bluetooth.*speaker/i.test(text)) {
    return 'audio';
  }
  
  // Hardware/Peripherals
  if (/keyboard|mouse|webcam|camera|monitor|laptop|computer|hub|dock|adapter|usb/i.test(text)) {
    return 'hardware';
  }
  
  // Wearables
  if (/watch|band|bracelet|fitness|tracker|wearable|smart.*watch/i.test(text)) {
    return 'wearables';
  }
  
  // Tech & Gadgets
  if (/led|light|lamp|ring.*light|smart|portable|mini|gadget|projector|fan|cooler/i.test(text)) {
    return 'gadgets';
  }
  
  // Accessories
  if (/case|cover|cable|charger|stand|holder|mount|bag|pouch|sleeve|strap/i.test(text)) {
    return 'accessories';
  }
  
  // Merchandise
  if (/hoodie|shirt|tshirt|t-shirt|cap|hat|mug|cup|poster|backpack|apparel/i.test(text)) {
    return 'merchandise';
  }
  
  // Default to gadgets for gaming/tech store
  return 'gadgets';
}

// Extract relevant tags from product name and description
function extractTags(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const tagKeywords = [
    'gaming', 'wireless', 'bluetooth', 'led', 'rgb', 'usb', 'portable',
    'rechargeable', 'waterproof', 'noise cancelling', 'mechanical',
    'ergonomic', 'adjustable', 'foldable', 'mini', 'professional',
    'hd', '4k', 'smart', 'fast charging', 'magnetic', 'premium'
  ];
  
  return tagKeywords.filter(tag => text.includes(tag)).slice(0, 5);
}



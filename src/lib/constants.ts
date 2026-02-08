// Site configuration
export const SITE_NAME = "Darkpoint";
export const SITE_DESCRIPTION = "Your ultimate destination for elite gaming gear, cutting-edge tech & exclusive merchandise";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://darkpoint.co.za";

// Navigation links
export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Store", href: "/store" },
  { label: "Cart", href: "/cart" },
  { label: "Account", href: "/account" },
] as const;

// Social links
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/darkpointza",
  instagram: "https://instagram.com/darkpointza",
  facebook: "https://facebook.com/darkpointza",
  discord: "https://discord.gg/MRS2Y7rcDF",
} as const;

// Audio settings
export const AUDIO_CONFIG = {
  defaultVolume: 50,
  fadeInDuration: 1000,
  fadeOutDuration: 1000,
} as const;

// Animation settings
export const ANIMATION_CONFIG = {
  preloaderDuration: 1.2,
  preloaderFrames: 23,
  pageTransitionDuration: 0.3,
} as const;

// Product categories - aligned with CJ Dropshipping search terms
export const PRODUCT_CATEGORIES = [
  { id: "all", label: "All Products", description: "Browse our complete collection" },
  { id: "gaming", label: "Gaming Gear", description: "Controllers, gamepads, and gaming accessories" },
  { id: "hardware", label: "Peripherals", description: "Keyboards, mice, webcams, and more" },
  { id: "audio", label: "Audio", description: "Headsets, earphones, speakers, and microphones" },
  { id: "gadgets", label: "Tech & Gadgets", description: "LED lights, smart devices, and cool tech" },
  { id: "accessories", label: "Accessories", description: "Cases, cables, chargers, and stands" },
  { id: "wearables", label: "Wearables", description: "Smart watches, fitness bands, and trackers" },
  { id: "merchandise", label: "Merch", description: "Apparel, bags, and lifestyle products" },
] as const;

// Currency - South African Rands
export const DEFAULT_CURRENCY = "ZAR";
export const CURRENCY_SYMBOL = "R";
export const CURRENCY_LOCALE = "en-ZA";

// Pagination
export const PRODUCTS_PER_PAGE = 12;

// Shipping - configurable via environment variables
// Tiered shipping: Free above threshold, reduced between, full below
export const FREE_SHIPPING_THRESHOLD = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD) || 1050;
export const BELOW_590_THRESHOLD = Number(process.env.NEXT_PUBLIC_BELOW_590_SHIPPING_THRESHOLD) || 590;
export const STANDARD_SHIPPING_FEE = Number(process.env.NEXT_PUBLIC_STANDARD_SHIPPING_FEE) || 150;
export const BETWEEN_590_AND_1050_SHIPPING_FEE = Number(process.env.NEXT_PUBLIC_BETWEEN_590_AND_1050_SHIPPING_FEE) || 75;

// VIP Tiered free shipping thresholds
export const VIP_FREE_SHIPPING_THRESHOLD = Number(process.env.NEXT_PUBLIC_VIP_FREE_SHIPPING_THRESHOLD) || 300; // Legacy fallback
export const VIP_BRONZE_FREE_SHIPPING_THRESHOLD = Number(process.env.NEXT_PUBLIC_VIP_BRONZE_FREE_SHIPPING_THRESHOLD) || 950;
export const VIP_GOLD_FREE_SHIPPING_THRESHOLD = Number(process.env.NEXT_PUBLIC_VIP_GOLD_FREE_SHIPPING_THRESHOLD) || 850;
export const VIP_PLATINUM_FREE_SHIPPING_THRESHOLD = Number(process.env.NEXT_PUBLIC_VIP_PLATNIUM_FREE_SHIPPING_THRESHOLD) || 750;

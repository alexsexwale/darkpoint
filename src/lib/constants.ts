// Site configuration
export const SITE_NAME = "Dark Point";
export const SITE_DESCRIPTION = "Your ultimate destination for elite gaming gear, cutting-edge tech & exclusive merchandise";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://darkpoint.co.za";

// Navigation links
export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Store", href: "/store" },
  { label: "News", href: "/news" },
  { label: "Cart", href: "/cart" },
  { label: "Account", href: "/account" },
] as const;

// Social links
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/darkpointza",
  instagram: "https://instagram.com/darkpointza",
  facebook: "https://facebook.com/darkpointza",
  discord: "https://discord.gg/darkpoint",
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

// Shipping
export const FREE_SHIPPING_THRESHOLD = 500; // R500 for regular users
export const VIP_FREE_SHIPPING_THRESHOLD = 300; // R300 for VIP badge holders
export const STANDARD_SHIPPING_FEE = 65; // R65

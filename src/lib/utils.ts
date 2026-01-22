import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number, currency: string = "ZAR"): string {
  // Use consistent formatting to avoid hydration mismatch
  // Format as "RX,XXX.XX" manually to ensure server/client consistency
  const formatted = price.toFixed(2);
  return `R${formatted}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("Failed to save to localStorage");
  }
}

// Color/Colour mappings for variant parsing
const COLOUR_MAP: Record<string, string> = {
  black: "Black",
  white: "White",
  red: "Red",
  blue: "Blue",
  green: "Green",
  orange: "Orange",
  yellow: "Yellow",
  pink: "Pink",
  purple: "Purple",
  gray: "Grey",
  grey: "Grey",
  brown: "Brown",
  navy: "Navy",
  gold: "Gold",
  silver: "Silver",
  beige: "Beige",
  cyan: "Cyan",
  teal: "Teal",
  coral: "Coral",
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

/**
 * Extract a short, human-readable variant display name from a variant object.
 * Handles long CJ Dropshipping variant names by extracting just the colour/size/value.
 */
export function getVariantDisplayName(variant: { name?: string; value?: string } | null | undefined): string {
  if (!variant) return "";
  
  let rawValue = variant.value || variant.name || "";
  if (!rawValue) return "";
  
  const trimmed = rawValue.trim();
  const lowerValue = trimmed.toLowerCase();
  
  // Check for known colours first
  for (const [colourKey, colourName] of Object.entries(COLOUR_MAP)) {
    // Check if the value ends with the colour name
    if (lowerValue.endsWith(colourKey) || lowerValue === colourKey) {
      return colourName;
    }
    // Check if it contains the colour as a separate word
    const regex = new RegExp(`\\b${colourKey}\\b`, 'i');
    if (regex.test(lowerValue)) {
      return colourName;
    }
  }
  
  // Check for sizes
  for (const size of SIZE_ORDER) {
    if (lowerValue.endsWith(size.toLowerCase()) || lowerValue === size.toLowerCase()) {
      return size;
    }
  }
  
  // Check for storage sizes (GB/TB)
  const storageMatch = trimmed.match(/(\d+\s*(?:GB|TB|gb|tb))\s*$/i);
  if (storageMatch) {
    return storageMatch[1].toUpperCase().replace(/\s/g, '');
  }
  
  // If it's short enough, use as is
  if (trimmed.length <= 20) {
    return trimmed;
  }
  
  // Extract the last word as a fallback
  const words = trimmed.split(/[\s_-]+/);
  const lastWord = words[words.length - 1];
  
  // Check if last word is a known colour
  if (COLOUR_MAP[lastWord.toLowerCase()]) {
    return COLOUR_MAP[lastWord.toLowerCase()];
  }
  
  // Return last word if short, or truncate
  return lastWord.length <= 15 ? lastWord : lastWord.slice(0, 15) + "…";
}


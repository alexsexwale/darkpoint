import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, ProductVariant } from "@/types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

interface CartActions {
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

interface CartGetters {
  itemCount: () => number;
  subtotal: () => number;
  getItem: (productId: string, variantId?: string) => CartItem | undefined;
}

type CartStore = CartState & CartActions & CartGetters;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      isOpen: false,

      // Actions
      addItem: (product, quantity = 1, variant) => {
        const items = get().items;
        const itemId = variant ? `${product.id}-${variant.id}` : product.id;
        const existingItem = items.find((item) => item.id === itemId);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === itemId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                id: itemId,
                product,
                variant,
                quantity,
                addedAt: new Date().toISOString(),
              },
            ],
          });
        }
      },

      removeItem: (itemId) => {
        set({
          items: get().items.filter((item) => item.id !== itemId),
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      toggleCart: () => {
        set({ isOpen: !get().isOpen });
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      // Getters
      itemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      subtotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.variant?.price ?? item.product.price;
          return total + price * item.quantity;
        }, 0);
      },

      getItem: (productId, variantId) => {
        const itemId = variantId ? `${productId}-${variantId}` : productId;
        return get().items.find((item) => item.id === itemId);
      },
    }),
    {
      name: "darkpoint-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);



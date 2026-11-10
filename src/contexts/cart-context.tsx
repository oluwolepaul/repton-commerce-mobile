import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  addCartLine,
  createCart,
  getCart,
  removeCartLine,
  updateCartLine,
  type ShopifyCart,
} from '@/lib/shopify';

type CartContextValue = {
  cart: ShopifyCart | null;
  isUpdating: boolean;
  isRestoring: boolean;
  clearCart: () => Promise<void>;
  addVariant: (variantId: string, quantity: number, minimumQuantity: number, minimumLabel: string, increment: number) => Promise<void>;
  setLineQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_ID_STORAGE_KEY = 'repton-group.shopify-cart-id';

function readStoredCartId() {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.localStorage?.getItem(CART_ID_STORAGE_KEY) ?? null);
  return SecureStore.getItemAsync(CART_ID_STORAGE_KEY);
}

async function writeStoredCartId(cartId: string | null) {
  if (Platform.OS === 'web') {
    if (cartId) globalThis.localStorage?.setItem(CART_ID_STORAGE_KEY, cartId);
    else globalThis.localStorage?.removeItem(CART_ID_STORAGE_KEY);
    return;
  }
  if (cartId) await SecureStore.setItemAsync(CART_ID_STORAGE_KEY, cartId);
  else await SecureStore.deleteItemAsync(CART_ID_STORAGE_KEY);
}

async function saveCartId(cart: ShopifyCart) {
  try {
    await writeStoredCartId(cart.totalQuantity > 0 ? cart.id : null);
  } catch {
    // Keep shopping available if local storage is temporarily unavailable.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    const restoreCart = async () => {
      try {
        const savedCartId = await readStoredCartId();
        if (savedCartId) {
          const savedCart = await getCart(savedCartId);
          if (savedCart?.totalQuantity) {
            if (active) setCart(savedCart);
          } else {
            await writeStoredCartId(null);
          }
        }
      } catch {
        // Keep the saved ID so the app can retry restoring the cart next time.
      } finally {
        if (active) setIsRestoring(false);
      }
    };
    void restoreCart();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isUpdating,
      isRestoring,
      async clearCart() {
        setCart(null);
        try { await writeStoredCartId(null); } catch { /* Clear the visible bag even if storage is temporarily unavailable. */ }
      },
      async addVariant(variantId, quantity, minimumQuantity, minimumLabel, increment) {
        setIsUpdating(true);
        try {
          const nextCart = cart
            ? await addCartLine(cart.id, variantId, quantity, minimumQuantity, minimumLabel, increment)
            : await createCart(variantId, quantity, minimumQuantity, minimumLabel, increment);
          setCart(nextCart);
          await saveCartId(nextCart);
        } finally {
          setIsUpdating(false);
        }
      },
      async setLineQuantity(lineId, quantity) {
        if (!cart) return;
        setIsUpdating(true);
        try {
          const nextCart = quantity <= 0
            ? await removeCartLine(cart.id, lineId)
            : await updateCartLine(cart.id, lineId, quantity);
          setCart(nextCart);
          await saveCartId(nextCart);
        } finally {
          setIsUpdating(false);
        }
      },
      async removeLine(lineId) {
        if (!cart) return;
        setIsUpdating(true);
        try {
          const nextCart = await removeCartLine(cart.id, lineId);
          setCart(nextCart);
          await saveCartId(nextCart);
        } finally {
          setIsUpdating(false);
        }
      },
    }),
    [cart, isRestoring, isUpdating],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider.');
  return value;
}

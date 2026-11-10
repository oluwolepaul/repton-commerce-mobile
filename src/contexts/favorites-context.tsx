import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORE_URL, type StoreProduct } from '@/lib/shopify';

const STORAGE_KEY = 'repton-group.saved-products.v1';

type FavoritesContextValue = {
  products: StoreProduct[];
  isReady: boolean;
  toggleFavorite: (product: StoreProduct) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function isStoreProduct(value: unknown): value is StoreProduct {
  if (!value || typeof value !== 'object') return false;
  const product = value as Partial<StoreProduct>;
  return typeof product.id === 'string'
    && typeof product.handle === 'string'
    && typeof product.title === 'string'
    && (product.category === 'Cement' || product.category === 'Steel' || product.category === 'Binding wire');
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isReady, setIsReady] = useState(false);
  const productsRef = useRef<StoreProduct[]>([]);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored || !active) return;
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const saved = parsed.filter(isStoreProduct);
          productsRef.current = saved;
          setProducts(saved);
        }
      })
      .catch(() => {
        // Keep saved products available in this session if local storage cannot be read.
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => { active = false; };
  }, []);

  const toggleFavorite = useCallback(async (product: StoreProduct) => {
    if (!isReady) return;
    const previous = productsRef.current;
    const next = previous.some((saved) => saved.id === product.id)
      ? previous.filter((saved) => saved.id !== product.id)
      : [product, ...previous];
    productsRef.current = next;
    setProducts(next);

    const write = writeQueue.current.catch(() => undefined).then(async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    });
    writeQueue.current = write;
    try {
      await write;
    } catch (error) {
      if (productsRef.current === next) {
        productsRef.current = previous;
        setProducts(previous);
      }
      throw error;
    }
  }, [isReady]);

  const value = useMemo(() => ({ products, isReady, toggleFavorite }), [isReady, products, toggleFavorite]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used within FavoritesProvider.');
  return value;
}

export function toFavoriteProduct(product: {
  id: string;
  handle: string;
  title: string;
  category: StoreProduct['category'];
  description: string;
  imageUrl: string | null;
  priceLabel: string;
  availableForSale: boolean;
  variantId: string | null;
}): StoreProduct {
  return { ...product, detail: product.description, productUrl: `${STORE_URL}/products/${product.handle}` };
}

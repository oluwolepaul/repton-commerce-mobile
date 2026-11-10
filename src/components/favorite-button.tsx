import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useFavorites } from '@/contexts/favorites-context';
import type { StoreProduct } from '@/lib/shopify';

export function FavoriteButton({ product }: { product: StoreProduct }) {
  const { products, isReady, toggleFavorite } = useFavorites();
  const saved = products.some((savedProduct) => savedProduct.id === product.id);

  const toggle = () => {
    void toggleFavorite(product).catch(() => {
      Alert.alert('Could not update saved products', 'Please try again in a moment.');
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${product.title} from saved products` : `Save ${product.title}`}
      accessibilityState={{ selected: saved, disabled: !isReady }}
      disabled={!isReady}
      onPress={toggle}
      style={({ pressed }) => [styles.button, saved && styles.saved, pressed && styles.pressed, !isReady && styles.disabled]}>
      <Text style={[styles.icon, saved && styles.savedIcon]}>{saved ? '♥' : '♡'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  saved: { backgroundColor: '#FFF5F3', borderColor: '#EEDBD8' },
  icon: { color: '#74716F', fontSize: 21, lineHeight: 25 },
  savedIcon: { color: '#D71920' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
});

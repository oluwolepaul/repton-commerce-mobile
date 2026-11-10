import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { FavoriteButton } from '@/components/favorite-button';
import type { StoreProduct } from '@/lib/shopify';

export function StoreProductCard({ product, layout = 'carousel' }: { product: StoreProduct; layout?: 'carousel' | 'grid' }) {
  return (
    <View style={[styles.card, layout === 'grid' && styles.gridCard]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${product.title} on the Repton Group store`}
        onPress={() => router.push({ pathname: '/explore/[handle]', params: { handle: product.handle, category: product.category } })}
        style={({ pressed }) => pressed && styles.pressed}>
        <View style={styles.imageFrame}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} resizeMode="contain" style={styles.image} />
          ) : (
            <Text style={styles.imagePlaceholder}>REPTON</Text>
          )}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{product.category}</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>
        <Text numberOfLines={1} style={styles.detail}>
          {product.detail}
        </Text>
        <Text style={styles.price}>{product.priceLabel}</Text>
        <Text style={styles.action}>{product.availableForSale ? 'VIEW DETAILS ↗' : 'CHECK AVAILABILITY ↗'}</Text>
      </Pressable>
      <View style={styles.favoriteButton}><FavoriteButton product={product} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 182,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE7E4',
  },
  gridCard: { width: '48%' },
  favoriteButton: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  imageFrame: {
    height: 118,
    borderRadius: 13,
    backgroundColor: '#F7F6F4',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { color: '#737373', fontWeight: '900', letterSpacing: 1 },
  tag: {
    position: 'absolute',
    left: 7,
    top: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#FFF4F3',
  },
  tagText: { color: '#D71920', fontSize: 10, fontWeight: '600' },
  title: {
    minHeight: 38,
    color: '#171717',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 11,
  },
  detail: { color: '#74716F', fontSize: 11, marginTop: 3 },
  price: { color: '#171717', fontSize: 14, fontWeight: '700', marginTop: 9 },
  action: { color: '#D71920', fontSize: 10, fontWeight: '600', marginTop: 9, marginBottom: 4 },
  pressed: { opacity: 0.82 },
});

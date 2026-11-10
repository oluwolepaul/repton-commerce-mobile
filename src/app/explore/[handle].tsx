import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { FavoriteButton } from '@/components/favorite-button';
import { useCart } from '@/contexts/cart-context';
import { toFavoriteProduct } from '@/contexts/favorites-context';
import {
  formatCartPrice,
  getProductDetails,
  type StoreCategory,
  type StoreProductDetails,
  type StoreVariant,
} from '@/lib/shopify';

function categoryFromParam(value?: string): StoreCategory {
  if (value === 'Cement' || value === 'Steel') return value;
  return 'Binding wire';
}

function minimumForCategory(category: StoreCategory) {
  if (category === 'Cement') return { quantity: 300, label: '300 bags' };
  if (category === 'Steel') return { quantity: 1, label: '1 tonne' };
  return { quantity: 1, label: '1 kg' };
}

function minimumForVariant(variant: StoreVariant, category: StoreCategory) {
  const categoryMinimum = minimumForCategory(category);
  const increment = Math.max(1, variant.quantityRule.increment);
  const requestedMinimum = Math.max(variant.quantityRule.minimum, categoryMinimum.quantity);
  const minimumQuantity = Math.ceil(requestedMinimum / increment) * increment;
  return { minimumQuantity, increment, label: categoryMinimum.label };
}

export default function ProductDetailScreen() {
  const { handle, category: categoryParam } = useLocalSearchParams<{ handle: string; category?: string }>();
  const category = categoryFromParam(categoryParam);
  const { addVariant, isRestoring, isUpdating } = useCart();
  const [product, setProduct] = useState<StoreProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState('1');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    getProductDetails(handle)
      .then((details) => {
        if (!active) return;
        if (!details) {
          setFailed(true);
          return;
        }
        setProduct(details);
        const firstAvailable = details.variants.find((variant) => variant.availableForSale) ?? details.variants[0];
        setSelectedVariantId(firstAvailable?.id ?? null);
        if (firstAvailable) {
          const initialQuantity = minimumForVariant(firstAvailable, category).minimumQuantity;
          setQuantity(initialQuantity);
          setQuantityInput(String(initialQuantity));
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, handle]);

  const selectedVariant = useMemo(
    () => product?.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [product, selectedVariantId],
  );
  const quantityRule = selectedVariant ? minimumForVariant(selectedVariant, category) : null;
  const maximum = selectedVariant?.quantityRule.maximum ?? null;
  const available = Boolean(
    selectedVariant?.availableForSale
      && quantityRule
      && quantity >= quantityRule.minimumQuantity
      && (quantity - quantityRule.minimumQuantity) % quantityRule.increment === 0
      && (maximum === null || quantity <= maximum),
  );
  const estimatedTotal = selectedVariant
    ? formatCartPrice(String(Number(selectedVariant.price.amount) * quantity), selectedVariant.price.currencyCode)
    : '';
  const heroImage = product?.images[0];
  const savedProduct = product ? toFavoriteProduct({
    id: product.id,
    handle: product.handle,
    title: product.title,
    category,
    description: product.description,
    imageUrl: heroImage?.url ?? null,
    priceLabel: selectedVariant ? formatCartPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode) : '',
    availableForSale: product.variants.some((variant) => variant.availableForSale),
    variantId: product.variants.find((variant) => variant.availableForSale)?.id ?? null,
  }) : null;

  const chooseVariant = (variant: StoreVariant) => {
    setSelectedVariantId(variant.id);
    const nextQuantity = minimumForVariant(variant, category).minimumQuantity;
    setQuantity(nextQuantity);
    setQuantityInput(String(nextQuantity));
    setAdded(false);
  };

  const updateQuantity = (nextQuantity: number) => {
    setQuantity(nextQuantity);
    setQuantityInput(String(nextQuantity));
    setAdded(false);
  };

  const commitQuantityInput = () => {
    if (!quantityRule) return;
    const requested = Number.parseInt(quantityInput, 10);
    const safeRequested = Number.isFinite(requested) ? Math.max(quantityRule.minimumQuantity, requested) : quantity;
    const steppedQuantity = quantityRule.minimumQuantity
      + Math.ceil((safeRequested - quantityRule.minimumQuantity) / quantityRule.increment) * quantityRule.increment;
    const maxAllowed = maximum === null
      ? steppedQuantity
      : Math.max(
        quantityRule.minimumQuantity,
        quantityRule.minimumQuantity + Math.floor((maximum - quantityRule.minimumQuantity) / quantityRule.increment) * quantityRule.increment,
      );
    updateQuantity(Math.min(steppedQuantity, maxAllowed));
  };

  const handleAddToBag = async () => {
    if (!selectedVariant || !quantityRule || !available) return;
    try {
      await addVariant(
        selectedVariant.id,
        quantity,
        quantityRule.minimumQuantity,
        quantityRule.label,
        quantityRule.increment,
      );
      setAdded(true);
      Alert.alert('Added to your bag', `${quantity} × ${product?.title ?? 'product'}`);
    } catch {
      Alert.alert('Could not add this item', 'Please try again in a moment.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹  Back to shop</Text>
        </Pressable>

        {loading ? (
          <View style={styles.messageCard}>
            <ActivityIndicator color={COLORS.red} />
            <Text style={styles.body}>Loading live product details…</Text>
          </View>
        ) : failed || !product ? (
          <View style={styles.messageCard}>
            <Text style={styles.title}>Product details unavailable</Text>
            <Text style={styles.body}>Please return to the Shop and try again.</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroImageFrame}>
              {heroImage ? (
                <Image source={{ uri: heroImage.url }} resizeMode="contain" style={styles.heroImage} />
              ) : (
                <Text style={styles.imagePlaceholder}>REPTON GROUP</Text>
              )}
              <View style={styles.categoryPill}><Text style={styles.categoryPillText}>{category}</Text></View>
              {savedProduct ? <View style={styles.favoritePosition}><FavoriteButton product={savedProduct} /></View> : null}
            </View>

            {product.images.length > 1 ? (
              <ScrollView horizontal contentContainerStyle={styles.thumbnailRow} showsHorizontalScrollIndicator={false}>
                {product.images.slice(1).map((image) => (
                  <View key={image.url} style={styles.thumbnailFrame}>
                    <Image source={{ uri: image.url }} resizeMode="contain" style={styles.thumbnail} />
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <Text style={styles.eyebrow}>Live from Shopify</Text>
            <Text style={styles.title}>{product.title}</Text>
            {selectedVariant ? (
              <Text style={styles.price}>{formatCartPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)}</Text>
            ) : null}

            <View style={styles.minimumNotice}>
              <Text style={styles.minimumTitle}>Minimum order: {minimumForCategory(category).label}</Text>
              <Text style={styles.minimumBody}>
                {category === 'Cement'
                  ? 'Cement is ordered in bags. The quantity below starts at Repton’s 300-bag minimum.'
                  : category === 'Steel'
                    ? 'Reinforcement is ordered by the tonne. The quantity below starts at Repton’s 1-tonne minimum.'
                    : 'Binding wire is priced by the kilogram. Confirm the final amount at checkout.'}
              </Text>
            </View>

            {product.variants.length > 1 ? (
              <View style={styles.optionSection}>
                <Text style={styles.sectionTitle}>Choose an option</Text>
                <View style={styles.variantList}>
                  {product.variants.map((variant) => {
                    const selected = selectedVariantId === variant.id;
                    return (
                      <Pressable
                        key={variant.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled: !variant.availableForSale }}
                        disabled={!variant.availableForSale}
                        onPress={() => chooseVariant(variant)}
                        style={[styles.variantChip, selected && styles.variantChipActive, !variant.availableForSale && styles.variantChipDisabled]}>
                        <Text style={[styles.variantText, selected && styles.variantTextActive]}>
                          {variant.title}{!variant.availableForSale ? ' · unavailable' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : selectedVariant && selectedVariant.title !== 'Default Title' ? (
              <View style={styles.selectedOption}>
                <Text style={styles.sectionTitle}>Option</Text>
                <Text style={styles.selectedOptionText}>{selectedVariant.title}</Text>
              </View>
            ) : null}

            {selectedVariant && quantityRule ? (
              <View style={styles.quantitySection}>
                <View style={styles.quantityHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <Text style={styles.quantityHint}>Minimum {quantityRule.minimumQuantity} · step {quantityRule.increment}</Text>
                  </View>
                  <View style={styles.quantityControl}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Decrease quantity"
                      disabled={quantity <= quantityRule.minimumQuantity}
                      onPress={() => updateQuantity(Math.max(quantityRule.minimumQuantity, quantity - quantityRule.increment))}
                      style={styles.quantityButton}>
                      <Text style={styles.quantityButtonText}>−</Text>
                    </Pressable>
                    <TextInput
                      accessibilityLabel="Product quantity"
                      keyboardType="number-pad"
                      selectTextOnFocus
                      value={quantityInput}
                      onChangeText={(value) => {
                        const digits = value.replace(/\D/g, '');
                        setQuantityInput(digits);
                        if (digits) {
                          setQuantity(Number(digits));
                          setAdded(false);
                        }
                      }}
                      onBlur={commitQuantityInput}
                      onSubmitEditing={commitQuantityInput}
                      returnKeyType="done"
                      style={styles.quantityValue}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Increase quantity"
                      disabled={Boolean(maximum && quantity + quantityRule.increment > maximum)}
                      onPress={() => updateQuantity(quantity + quantityRule.increment)}
                      style={styles.quantityButton}>
                      <Text style={styles.quantityButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Estimated product total</Text>
                  <Text style={styles.totalValue}>{estimatedTotal}</Text>
                </View>
                <Text style={styles.totalDisclaimer}>Shipping and any final price adjustments are confirmed by Shopify at checkout.</Text>
              </View>
            ) : null}

            {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={!available || isUpdating || isRestoring}
              onPress={() => void handleAddToBag()}
              style={({ pressed }) => [styles.addButton, (!available || isUpdating || isRestoring) && styles.addButtonDisabled, pressed && styles.pressed]}>
              <Text style={styles.addButtonText}>
                {isRestoring ? 'Restoring your bag…' : isUpdating ? 'Adding…' : added ? 'Added · Add again' : available ? 'Add to bag' : 'Currently unavailable'}
              </Text>
            </Pressable>
            {maximum && quantityRule && quantityRule.minimumQuantity > maximum ? (
              <Text style={styles.unavailableHint}>This variant’s maximum quantity is below the minimum order.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = { red: '#D71920', paleRed: '#FFF5F3', redLine: '#EEDBD8', ink: '#171717', muted: '#74716F', paper: '#FFFFFF', line: '#EAE7E4', background: '#FAF9F7' };

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  page: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 38 },
  backButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingRight: 14 },
  backText: { color: COLORS.red, fontSize: 12, fontWeight: '500' },
  heroImageFrame: { height: 260, overflow: 'hidden', marginTop: 8, borderRadius: 22, backgroundColor: '#F7F6F4', borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },
  imagePlaceholder: { color: COLORS.muted, fontWeight: '900', letterSpacing: 1 },
  categoryPill: { position: 'absolute', left: 13, top: 13, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  categoryPillText: { color: COLORS.red, fontSize: 11, fontWeight: '500' },
  favoritePosition: { position: 'absolute', top: 13, right: 13 },
  thumbnailRow: { gap: 9, paddingTop: 11 },
  thumbnailFrame: { width: 62, height: 62, overflow: 'hidden', borderRadius: 12, backgroundColor: '#F7F6F4', borderWidth: 1, borderColor: COLORS.line },
  thumbnail: { width: '100%', height: '100%' },
  eyebrow: { color: COLORS.red, fontSize: 10, fontWeight: '700', letterSpacing: 0.55, marginTop: 22 },
  title: { color: COLORS.ink, fontSize: 25, lineHeight: 32, fontWeight: '700', letterSpacing: -0.35, marginTop: 6 },
  price: { color: COLORS.ink, fontSize: 19, fontWeight: '700', marginTop: 8 },
  minimumNotice: { marginTop: 16, padding: 15, borderRadius: 15, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  minimumTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  minimumBody: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  optionSection: { marginTop: 21 },
  sectionTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  variantList: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 11 },
  variantChip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.paper },
  variantChipActive: { borderColor: COLORS.redLine, backgroundColor: COLORS.paleRed },
  variantChipDisabled: { opacity: 0.45 },
  variantText: { color: COLORS.ink, fontSize: 12, fontWeight: '500' },
  variantTextActive: { color: COLORS.red, fontWeight: '600' },
  selectedOption: { marginTop: 20, gap: 8 },
  selectedOptionText: { color: COLORS.muted, fontSize: 13 },
  quantitySection: { marginTop: 21, padding: 16, borderRadius: 17, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  quantityHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityHint: { color: COLORS.muted, fontSize: 11, marginTop: 5 },
  quantityControl: { height: 42, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line },
  quantityButton: { width: 36, height: 37, alignItems: 'center', justifyContent: 'center' },
  quantityButtonText: { color: COLORS.ink, fontSize: 19, fontWeight: '700' },
  quantityValue: { width: 48, height: 38, textAlign: 'center', color: COLORS.ink, fontSize: 13, fontWeight: '600', paddingHorizontal: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: COLORS.line },
  totalLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  totalValue: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  totalDisclaimer: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
  description: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 18 },
  addButton: { minHeight: 54, marginTop: 21, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.red },
  addButtonDisabled: { backgroundColor: '#A6A6A6' },
  addButtonText: { color: COLORS.paper, fontSize: 13, fontWeight: '600' },
  unavailableHint: { color: COLORS.red, fontSize: 12, lineHeight: 18, marginTop: 9 },
  messageCard: { alignItems: 'center', gap: 11, marginTop: 25, padding: 24, borderRadius: 18, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  body: { color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.82 },
});

import { useState } from 'react';
import {
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
import { useCart } from '@/contexts/cart-context';
import { isCheckoutNativeModuleAvailable, presentCheckout } from '@/lib/native-checkout';
import { estimateCartDelivery, formatCartPrice, type DeliveryOptionEstimate, type ShopifyCartLine } from '@/lib/shopify';

function CartItem({ line }: { line: ShopifyCartLine }) {
  const { isUpdating, removeLine, setLineQuantity } = useCart();
  const image = line.merchandise.product.featuredImage?.url;
  const variant = line.merchandise.title === 'Default Title' ? '' : line.merchandise.title;
  const minimumQuantity = Number(line.attributes.find((attribute) => attribute.key === 'minimum_quantity')?.value ?? 1);
  const increment = Math.max(1, Number(line.attributes.find((attribute) => attribute.key === 'quantity_increment')?.value ?? 1));
  const minimumLabel = line.attributes.find((attribute) => attribute.key === 'minimum_order_label')?.value;

  const update = async (nextQuantity: number) => {
    try {
      await setLineQuantity(line.id, nextQuantity);
    } catch {
      Alert.alert('Could not update your bag', 'Please try again in a moment.');
    }
  };

  const remove = async () => {
    try {
      await removeLine(line.id);
    } catch {
      Alert.alert('Could not remove this item', 'Please try again in a moment.');
    }
  };

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        <View style={styles.imageFrame}>
          {image ? <Image source={{ uri: image }} resizeMode="contain" style={styles.image} /> : null}
        </View>
        <View style={styles.itemCopy}>
          <Text numberOfLines={2} style={styles.itemTitle}>{line.merchandise.product.title}</Text>
          {variant ? <Text style={styles.variant}>{variant}</Text> : null}
          <Text style={styles.itemPrice}>{formatCartPrice(line.merchandise.price.amount, line.merchandise.price.currencyCode)}</Text>
          {minimumLabel ? <Text style={styles.minimumNote}>Minimum order: {minimumLabel}</Text> : null}
        </View>
      </View>
      <View style={styles.itemActions}>
        <View style={styles.quantityControl}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={isUpdating || line.quantity <= minimumQuantity} onPress={() => void update(line.quantity - increment)} style={styles.quantityButton}>
            <Text style={styles.quantityButtonText}>−</Text>
          </Pressable>
          <Text style={styles.quantity}>{line.quantity}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={isUpdating} onPress={() => void update(line.quantity + increment)} style={styles.quantityButton}>
            <Text style={styles.quantityButtonText}>+</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" disabled={isUpdating} onPress={() => void remove()}>
          <Text style={styles.removeAction}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const { cart, clearCart, isRestoring, isUpdating } = useCart();
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'idle' | 'loading' | 'rates' | 'none' | 'error'>('idle');
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionEstimate[]>([]);
  const [deliveryError, setDeliveryError] = useState('');
  const nativeCheckoutAvailable = isCheckoutNativeModuleAvailable();
  const lines = cart?.lines.edges.map(({ node }) => node) ?? [];

  const checkDelivery = async () => {
    if (!cart || !deliveryCity.trim() || !deliveryState.trim()) return;
    setDeliveryStatus('loading');
    setDeliveryError('');
    setDeliveryOptions([]);
    try {
      const options = await estimateCartDelivery(cart.id, {
        city: deliveryCity,
        state: deliveryState,
        street: deliveryStreet,
        postalCode: deliveryPostalCode,
      });
      setDeliveryOptions(options);
      setDeliveryStatus(options.length ? 'rates' : 'none');
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : 'Delivery could not be checked right now.');
      setDeliveryStatus('error');
    }
  };

  const openCheckout = async () => {
    if (!cart?.checkoutUrl) return;
    setOpeningCheckout(true);
    try {
      await presentCheckout(cart.checkoutUrl, {
        onCompleted: () => {
          void clearCart();
          Alert.alert('Order placed', 'Thank you. Your Repton Group order has been placed.');
        },
        onError: () => {
          Alert.alert('Checkout could not continue', 'Please close checkout and try again. Your items are still in your bag.');
        },
      });
    } catch {
      Alert.alert('Unable to open checkout', 'Please try again in a moment.');
    } finally {
      setOpeningCheckout(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Repton Group</Text>
        <Text style={styles.title}>Your bag</Text>
        {lines.length ? (
          <>
            <Text style={styles.subtitle}>{cart?.totalQuantity} {cart?.totalQuantity === 1 ? 'item' : 'items'}</Text>
            <View style={styles.lineList}>
              {lines.map((line) => <CartItem key={line.id} line={line} />)}
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.deliveryTitle}>Check delivery to your area</Text>
              <Text style={styles.deliveryIntro}>Enter your city and state to check Repton’s current delivery options and charges.</Text>
              <TextInput
                accessibilityLabel="Delivery city"
                placeholder="City or town"
                placeholderTextColor="#8A8A8A"
                value={deliveryCity}
                onChangeText={(value) => { setDeliveryCity(value); setDeliveryStatus('idle'); }}
                autoCapitalize="words"
                style={styles.deliveryField}
              />
              <TextInput
                accessibilityLabel="Delivery state"
                placeholder="State (e.g. Lagos)"
                placeholderTextColor="#8A8A8A"
                value={deliveryState}
                onChangeText={(value) => { setDeliveryState(value); setDeliveryStatus('idle'); }}
                autoCapitalize="words"
                style={styles.deliveryField}
              />
              <TextInput
                accessibilityLabel="Optional street or area"
                placeholder="Street or area (optional)"
                placeholderTextColor="#8A8A8A"
                value={deliveryStreet}
                onChangeText={(value) => { setDeliveryStreet(value); setDeliveryStatus('idle'); }}
                autoCapitalize="words"
                style={styles.deliveryField}
              />
              <TextInput
                accessibilityLabel="Optional delivery postal code"
                placeholder="Postal code (optional)"
                placeholderTextColor="#8A8A8A"
                value={deliveryPostalCode}
                onChangeText={(value) => { setDeliveryPostalCode(value); setDeliveryStatus('idle'); }}
                keyboardType="number-pad"
                style={styles.deliveryField}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!deliveryCity.trim() || !deliveryState.trim() || deliveryStatus === 'loading'}
                onPress={() => void checkDelivery()}
                style={({ pressed }) => [styles.deliveryCheckButton, pressed && styles.pressed, (!deliveryCity.trim() || !deliveryState.trim() || deliveryStatus === 'loading') && styles.deliveryCheckDisabled]}>
                <Text style={styles.deliveryCheckText}>{deliveryStatus === 'loading' ? 'Checking delivery…' : 'Check delivery'}</Text>
              </Pressable>
              {deliveryStatus === 'rates' ? (
                <View style={styles.deliveryResult}>
                  <Text style={styles.deliverySuccess}>Delivery options for {deliveryCity.trim()}, {deliveryState.trim()}</Text>
                  {deliveryOptions.map((option, index) => (
                    <View key={`${option.title ?? 'delivery'}-${index}`} style={styles.deliveryRateRow}>
                      <View style={styles.deliveryRateCopy}>
                        <Text style={styles.deliveryRateTitle}>{option.title ?? 'Delivery'}</Text>
                        {option.description ? <Text style={styles.deliveryRateDescription}>{option.description}</Text> : null}
                      </View>
                      <Text style={styles.deliveryRatePrice}>{formatCartPrice(option.estimatedCost.amount, option.estimatedCost.currencyCode)}</Text>
                    </View>
                  ))}
                </View>
              ) : deliveryStatus === 'none' ? (
                <Text style={styles.deliveryNoRate}>No automatic delivery option was returned for this location. Repton may still be able to arrange delivery for your order; please contact the team to confirm.</Text>
              ) : deliveryStatus === 'error' ? (
                <Text accessibilityRole="alert" style={styles.deliveryError}>{deliveryError}</Text>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>
                  {cart ? formatCartPrice(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode) : ''}
                </Text>
              </View>
              <Text style={styles.shippingNote}>Any delivery estimate is based on your current bag and location. Confirm the final delivery charge and order details at checkout.</Text>
              <Text style={styles.checkoutModeNote}>
                {nativeCheckoutAvailable ? 'Secure Shopify checkout opens in the app.' : 'This build uses browser checkout. Install a Repton app build with Shopify’s native checkout module for the in-app sheet.'}
              </Text>
              <Pressable accessibilityRole="button" disabled={isUpdating || openingCheckout} onPress={() => void openCheckout()} style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressed]}>
                <Text style={styles.checkoutButtonText}>{openingCheckout ? 'Opening checkout…' : 'Continue to checkout  ↗'}</Text>
              </Pressable>
            </View>
          </>
        ) : isRestoring ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Restoring your bag…</Text>
            <Text style={styles.emptyBody}>Your saved Shopify items will appear here shortly.</Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>▱</Text></View>
            <Text style={styles.emptyTitle}>Your bag is empty</Text>
            <Text style={styles.emptyBody}>Add cement or reinforcement from the Shop tab to get started.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF9F7' },
  page: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 38 },
  eyebrow: { color: '#D71920', fontSize: 10, fontWeight: '700', letterSpacing: 0.55 },
  title: { color: '#171717', fontSize: 30, fontWeight: '700', letterSpacing: -0.45, marginTop: 6 },
  subtitle: { color: '#74716F', fontSize: 14, lineHeight: 20, marginTop: 5 },
  lineList: { gap: 12, marginTop: 19 },
  itemCard: { padding: 14, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  imageFrame: { width: 78, height: 78, borderRadius: 13, overflow: 'hidden', backgroundColor: '#F7F6F4', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  itemCopy: { flex: 1 },
  itemTitle: { color: '#171717', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  variant: { color: '#74716F', fontSize: 12, marginTop: 4 },
  itemPrice: { color: '#171717', fontSize: 14, fontWeight: '700', marginTop: 7 },
  minimumNote: { color: '#74716F', fontSize: 11, marginTop: 5 },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EAE7E4', borderRadius: 11, overflow: 'hidden' },
  quantityButton: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  quantityButtonText: { color: '#171717', fontSize: 18, fontWeight: '700' },
  quantity: { minWidth: 30, textAlign: 'center', color: '#171717', fontSize: 13, fontWeight: '600' },
  removeAction: { color: '#D71920', fontSize: 11, fontWeight: '500', padding: 9 },
  summaryCard: { marginTop: 19, padding: 17, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  deliveryTitle: { color: '#171717', fontSize: 16, fontWeight: '600' },
  deliveryIntro: { color: '#74716F', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 11 },
  deliveryField: { minHeight: 48, paddingHorizontal: 13, marginTop: 8, borderWidth: 1, borderColor: '#EAE7E4', borderRadius: 12, backgroundColor: '#FFFFFF', color: '#171717', fontSize: 13 },
  deliveryCheckButton: { minHeight: 44, marginTop: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F3' },
  deliveryCheckText: { color: '#D71920', fontSize: 12, fontWeight: '600' },
  deliveryCheckDisabled: { opacity: 0.5 },
  deliveryResult: { marginTop: 13, padding: 13, borderRadius: 13, backgroundColor: '#FAF9F7' },
  deliverySuccess: { color: '#256B46', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  deliveryRateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#EAE7E4' },
  deliveryRateCopy: { flex: 1 },
  deliveryRateTitle: { color: '#171717', fontSize: 13, fontWeight: '600' },
  deliveryRateDescription: { color: '#74716F', fontSize: 12, lineHeight: 17, marginTop: 4 },
  deliveryRatePrice: { color: '#171717', fontSize: 13, fontWeight: '600' },
  deliveryNoRate: { color: '#6F5100', fontSize: 12, lineHeight: 18, marginTop: 11, padding: 12, borderRadius: 11, backgroundColor: '#FFF8E7' },
  deliveryError: { color: '#B4232A', fontSize: 12, lineHeight: 18, marginTop: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtotalLabel: { color: '#171717', fontSize: 14, fontWeight: '600' },
  subtotalValue: { color: '#171717', fontSize: 18, fontWeight: '700' },
  shippingNote: { color: '#74716F', fontSize: 12, lineHeight: 18, marginTop: 9 },
  checkoutModeNote: { color: '#74716F', fontSize: 11, lineHeight: 16, marginTop: 10 },
  checkoutButton: { minHeight: 54, marginTop: 17, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D71920' },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 29, marginTop: 30, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  emptyMark: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#FFF5F3', alignItems: 'center', justifyContent: 'center' },
  emptyMarkText: { color: '#D71920', fontSize: 31, fontWeight: '700' },
  emptyTitle: { color: '#171717', fontSize: 19, fontWeight: '600', marginTop: 15 },
  emptyBody: { maxWidth: 280, color: '#74716F', textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 7 },
  pressed: { opacity: 0.82 },
});

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { useCart } from '@/contexts/cart-context';
import { useCustomerAccount } from '@/contexts/customer-account-context';
import type { CustomerAddress, CustomerAddressInput, CustomerOrder } from '@/lib/customer-account-api';

const COLORS = { red: '#D71920', black: '#171717', gray: '#74716F', paper: '#FFFFFF', background: '#FAF9F7', line: '#EAE7E4', paleRed: '#FFF5F3', green: '#176B43' };
const EMPTY_ADDRESS: CustomerAddressInput = { firstName: '', lastName: '', address1: '', address2: '', city: '', zoneCode: '', countryCode: 'NG', phoneNumber: '' };

function orderStatus(order: CustomerOrder) {
  const fulfillment = order.fulfillmentStatus?.replaceAll('_', ' ').toLowerCase();
  if (fulfillment && fulfillment !== 'unfulfilled') return fulfillment.replace(/\b\w/g, (letter) => letter.toUpperCase());
  return order.financialStatus?.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Order received';
}

function money(amount: string, currency: string) {
  const value = Number(amount);
  return Number.isFinite(value) ? `${currency} ${value.toLocaleString()}` : `${currency} ${amount}`;
}

function AddressFields({ value, onChange }: { value: CustomerAddressInput; onChange: (key: keyof CustomerAddressInput, text: string) => void }) {
  const fields: { key: keyof CustomerAddressInput; label: string }[] = [
    { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' },
    { key: 'phoneNumber', label: 'Phone number' }, { key: 'address1', label: 'Street address' },
    { key: 'address2', label: 'Apartment, suite or landmark (optional)' }, { key: 'city', label: 'City' },
    { key: 'zoneCode', label: 'State (for example, Lagos)' },
  ];
  return <View style={styles.formFields}>{fields.map(({ key, label }) => (
    <TextInput key={key} accessibilityLabel={label} placeholder={label} placeholderTextColor="#8A8A8A" value={String(value[key] ?? '')} onChangeText={(text) => onChange(key, text)} style={styles.input} />
  ))}</View>;
}

function ActionButton({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, pressed && styles.pressed, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text></Pressable>;
}

export default function AccountScreen() {
  const { profile, isLoading, isWorking, error, isSignedIn, signIn, signOut, refresh, saveProfile, saveAddress } = useCustomerAccount();
  const { addVariant, isUpdating: cartUpdating } = useCart();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [addressDraft, setAddressDraft] = useState<CustomerAddressInput | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | undefined>();
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const orders = useMemo(() => profile?.orders.edges.map(({ node }) => node) ?? [], [profile]);
  const addresses = profile?.addresses.edges.map(({ node }) => node) ?? [];

  const handleSignIn = async () => {
    setMessage('');
    try { await signIn(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Sign-in could not be completed. Please try again.'); }
  };

  const startProfileEdit = () => {
    setFirstName(profile?.firstName ?? '');
    setLastName(profile?.lastName ?? '');
    setEditingProfile(true);
    setMessage('');
  };

  const handleProfileSave = async () => {
    try {
      await saveProfile(firstName.trim(), lastName.trim());
      setEditingProfile(false);
      setMessage('Your profile has been updated.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Your profile could not be updated.'); }
  };

  const startAddressEdit = (address?: CustomerAddress) => {
    setEditingAddressId(address?.id);
    setAddressDraft(address ? {
      firstName: address.firstName ?? '', lastName: address.lastName ?? '', company: address.company ?? '',
      address1: address.address1 ?? '', address2: address.address2 ?? '', city: address.city ?? '',
      zoneCode: address.zoneCode ?? '', countryCode: address.countryCode ?? 'NG', zip: address.zip ?? '', phoneNumber: address.phoneNumber ?? '',
    } : { ...EMPTY_ADDRESS });
    setMessage('');
  };

  const handleAddressSave = async () => {
    if (!addressDraft?.firstName?.trim() || !addressDraft.address1?.trim() || !addressDraft.city?.trim() || !addressDraft.zoneCode?.trim() || !addressDraft.phoneNumber?.trim()) {
      setMessage('Please add a first name, street address, city, state, and phone number.');
      return;
    }
    const cleanAddress = Object.fromEntries(Object.entries(addressDraft).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])) as CustomerAddressInput;
    try {
      await saveAddress(cleanAddress, editingAddressId, !editingAddressId && addresses.length === 0);
      setAddressDraft(null);
      setEditingAddressId(undefined);
      setMessage('Your address has been saved.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'The address could not be saved.'); }
  };

  const handleReorder = async (order: CustomerOrder) => {
    const lines = order.lineItems.edges.map(({ node }) => node).filter((line) => !!line.variantId);
    if (!lines.length) {
      setMessage(`Items from ${order.name} are no longer available to add from this order.`);
      return;
    }
    setReorderingId(order.id);
    setMessage('');
    try {
      for (const line of lines) {
        const attributes = Object.fromEntries(line.customAttributes.map(({ key, value }) => [key, value]));
        const minimum = Math.max(1, Number(attributes.minimum_quantity) || 1);
        const increment = Math.max(1, Number(attributes.quantity_increment) || 1);
        const quantity = Math.max(minimum, line.quantity);
        const adjustedQuantity = minimum + Math.ceil((quantity - minimum) / increment) * increment;
        await addVariant(line.variantId!, adjustedQuantity, minimum, attributes.minimum_order_label || '', increment);
      }
      setMessage(`${order.name} items have been added to your bag.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Some items could not be added. Check your bag and try again.');
    } finally { setReorderingId(null); }
  };

  const openTracking = async (url: string) => {
    try { await WebBrowser.openBrowserAsync(url); }
    catch { Alert.alert('Tracking unavailable', 'This tracking link could not be opened right now.'); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Repton Group</Text>
        <Text style={styles.title}>My account</Text>
        <Text style={styles.subtitle}>Manage your details, delivery addresses, and orders in one place.</Text>

        {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
        {!message && error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {isLoading ? <View style={styles.loading}><ActivityIndicator color={COLORS.red} /><Text style={styles.muted}>Loading your account…</Text></View> : null}

        {!isLoading && !isSignedIn ? (
          <View style={styles.card}>
            <View style={styles.iconCircle}><Text style={styles.accountIcon}>R</Text></View>
            <Text style={styles.cardTitle}>Welcome to your Repton account</Text>
            <Text style={styles.cardBody}>Sign in securely with the same Shopify customer account you use on reptongroup.ng. Your password stays with Shopify.</Text>
            <ActionButton title={isWorking ? 'Connecting…' : 'Sign in or create account'} onPress={() => void handleSignIn()} disabled={isWorking} />
          </View>
        ) : null}

        {profile ? <>
          <View style={styles.card}>
            <View style={styles.sectionHeading}><View style={styles.flex}><Text style={styles.sectionTitle}>Profile</Text><Text style={styles.sectionSubtitle}>{profile.emailAddress?.emailAddress ?? 'Your Repton customer account'}</Text></View>
              {!editingProfile ? <Pressable accessibilityRole="button" onPress={startProfileEdit}><Text style={styles.link}>Edit</Text></Pressable> : null}
            </View>
            {editingProfile ? <>
              <TextInput accessibilityLabel="First name" placeholder="First name" placeholderTextColor="#8A8A8A" value={firstName} onChangeText={setFirstName} style={styles.input} />
              <TextInput accessibilityLabel="Last name" placeholder="Last name" placeholderTextColor="#8A8A8A" value={lastName} onChangeText={setLastName} style={styles.input} />
              <View style={styles.buttonRow}><ActionButton title="Save profile" onPress={() => void handleProfileSave()} disabled={isWorking} /><ActionButton title="Cancel" secondary onPress={() => setEditingProfile(false)} /></View>
            </> : <Text style={styles.profileName}>{[profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.displayName}</Text>}
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeading}><View style={styles.flex}><Text style={styles.sectionTitle}>Saved addresses</Text><Text style={styles.sectionSubtitle}>Your delivery details for future orders.</Text></View>
              {!addressDraft ? <Pressable accessibilityRole="button" onPress={() => startAddressEdit()}><Text style={styles.link}>+ Add</Text></Pressable> : null}
            </View>
            {addressDraft ? <View style={styles.card}>
              <Text style={styles.addressTitle}>{editingAddressId ? 'Edit address' : 'Add delivery address'}</Text>
              <AddressFields value={addressDraft} onChange={(key, text) => setAddressDraft((current) => current ? { ...current, [key]: text } : current)} />
              <View style={styles.buttonRow}><ActionButton title="Save address" onPress={() => void handleAddressSave()} disabled={isWorking} /><ActionButton title="Cancel" secondary onPress={() => { setAddressDraft(null); setEditingAddressId(undefined); }} /></View>
            </View> : addresses.length ? addresses.map((address) => <View key={address.id} style={styles.addressCard}>
              <View style={styles.sectionHeading}><Text style={styles.addressTitle}>{[address.firstName, address.lastName].filter(Boolean).join(' ') || 'Delivery address'}</Text><Pressable accessibilityRole="button" onPress={() => startAddressEdit(address)}><Text style={styles.link}>Edit</Text></Pressable></View>
              <Text style={styles.addressText}>{[address.company, address.address1, address.address2, address.city, address.zoneCode, address.phoneNumber].filter(Boolean).join('\n')}</Text>
            </View>) : <View style={styles.emptyCard}><Text style={styles.muted}>No saved addresses yet.</Text></View>}
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeading}><View style={styles.flex}><Text style={styles.sectionTitle}>Your orders</Text><Text style={styles.sectionSubtitle}>Recent purchases and delivery progress.</Text></View>
              <Pressable accessibilityRole="button" disabled={isWorking} onPress={() => void refresh()}><Text style={styles.link}>Refresh</Text></Pressable>
            </View>
            {orders.length ? orders.map((order) => {
              const tracking = order.fulfillments.edges.flatMap(({ node }) => node.trackingInformation).filter((item) => !!item.url);
              const estimatedDelivery = order.fulfillments.edges.map(({ node }) => node.estimatedDeliveryAt).find(Boolean);
              return <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderTop}><View style={styles.flex}><Text style={styles.orderName}>{order.name}</Text><Text style={styles.orderDate}>{new Date(order.processedAt).toLocaleDateString()}</Text></View><View style={styles.statusPill}><Text style={styles.statusText}>{orderStatus(order)}</Text></View></View>
                <Text style={styles.orderTotal}>{money(order.totalPrice.amount, order.totalPrice.currencyCode)}</Text>
                {estimatedDelivery ? <Text style={styles.orderMeta}>Estimated delivery {new Date(estimatedDelivery).toLocaleDateString()}</Text> : null}
                {tracking.map((item, index) => <Pressable key={`${item.number}-${index}`} accessibilityRole="link" onPress={() => void openTracking(item.url!)}><Text style={styles.trackingLink}>{item.company ? `${item.company} tracking` : 'Track delivery'}{item.number ? ` · ${item.number}` : ''}  ›</Text></Pressable>)}
                <Text style={styles.itemSummary}>{order.lineItems.edges.map(({ node }) => `${node.name} × ${node.quantity}`).join('\n')}</Text>
                <ActionButton title={reorderingId === order.id ? 'Adding items…' : 'Reorder these items'} onPress={() => void handleReorder(order)} disabled={cartUpdating || !!reorderingId} secondary />
              </View>;
            }) : <View style={styles.emptyCard}><Text style={styles.muted}>No orders found on this account yet.</Text></View>}
          </View>

          <ActionButton title="Sign out" onPress={() => void signOut()} secondary />
          <Text style={styles.securityNote}>Account details and orders are provided by Shopify. Never share your password or sign-in code.</Text>
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  page: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 38 },
  eyebrow: { color: COLORS.red, fontSize: 11, fontWeight: '700', letterSpacing: 0.55 },
  title: { color: COLORS.black, fontSize: 30, fontWeight: '700', letterSpacing: -0.45, marginTop: 6 },
  subtitle: { color: COLORS.gray, fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 360, marginBottom: 18 },
  card: { padding: 18, marginTop: 12, borderRadius: 18, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  iconCircle: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: COLORS.paleRed },
  accountIcon: { color: COLORS.red, fontSize: 25, fontWeight: '900' },
  cardTitle: { color: COLORS.black, fontSize: 19, lineHeight: 26, fontWeight: '600', textAlign: 'center', marginTop: 16 },
  cardBody: { color: COLORS.gray, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  button: { minHeight: 49, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, marginTop: 16, borderRadius: 13, backgroundColor: COLORS.red },
  buttonText: { color: COLORS.paper, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  secondaryButton: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  secondaryButtonText: { color: COLORS.black },
  buttonRow: { flexDirection: 'row', gap: 10 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  sectionBlock: { marginTop: 23 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 9 },
  flex: { flex: 1 },
  sectionTitle: { color: COLORS.black, fontSize: 17, fontWeight: '600' },
  sectionSubtitle: { color: COLORS.gray, fontSize: 12, lineHeight: 17, marginTop: 3 },
  link: { color: COLORS.red, fontSize: 12, fontWeight: '600', padding: 7 },
  profileName: { color: COLORS.black, fontSize: 17, fontWeight: '600', marginTop: 14 },
  input: { minHeight: 48, paddingHorizontal: 13, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#FCFCFC', color: COLORS.black, fontSize: 13 },
  formFields: { gap: 0 },
  addressCard: { padding: 15, marginTop: 8, borderRadius: 15, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  addressTitle: { color: COLORS.black, fontSize: 14, fontWeight: '600' },
  addressText: { color: COLORS.gray, fontSize: 13, lineHeight: 19, marginTop: 8 },
  emptyCard: { padding: 17, marginTop: 7, borderRadius: 14, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  orderCard: { padding: 16, marginTop: 9, borderRadius: 16, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  orderName: { color: COLORS.black, fontSize: 15, fontWeight: '600' },
  orderDate: { color: COLORS.gray, fontSize: 11, marginTop: 4 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: '#EAF6EF' },
  statusText: { color: COLORS.green, fontSize: 10, fontWeight: '600' },
  orderTotal: { color: COLORS.black, fontSize: 15, fontWeight: '600', marginTop: 12 },
  orderMeta: { color: COLORS.gray, fontSize: 12, marginTop: 6 },
  trackingLink: { color: COLORS.red, fontSize: 12, fontWeight: '600', marginTop: 9 },
  itemSummary: { color: COLORS.gray, fontSize: 12, lineHeight: 18, marginTop: 12 },
  message: { color: COLORS.green, fontSize: 12, lineHeight: 18, padding: 12, marginBottom: 7, borderRadius: 12, backgroundColor: '#EAF6EF' },
  error: { color: COLORS.red, fontSize: 12, lineHeight: 18, padding: 12, marginBottom: 7, borderRadius: 12, backgroundColor: COLORS.paleRed },
  loading: { padding: 30, alignItems: 'center', gap: 10 },
  muted: { color: COLORS.gray, fontSize: 13, lineHeight: 19 },
  securityNote: { color: COLORS.gray, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 17, paddingHorizontal: 12 },
});

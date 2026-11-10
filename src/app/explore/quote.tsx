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
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';

import { getCatalogPage, type CatalogCursors, type StoreCategory, type StoreProduct } from '@/lib/shopify';

type QuoteLine = { product: StoreProduct; quantity: string };
type QuoteAttachment = { name: string; uri: string; size?: number };

const SALES_EMAIL = 'info@reptongroup.ng';
const CATEGORIES: ('All' | StoreCategory)[] = ['All', 'Cement', 'Steel', 'Binding wire'];

function minimumFor(product: StoreProduct) {
  if (product.category === 'Cement') return { quantity: 300, unit: 'bags' };
  if (product.category === 'Steel') return { quantity: 1, unit: 'tonnes' };
  return { quantity: 1, unit: 'kg' };
}

export default function BulkQuoteScreen() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [cursors, setCursors] = useState<CatalogCursors>({
    cement: null,
    reinforcement: null,
    bindingWire: null,
    hasMoreCement: true,
    hasMoreReinforcement: true,
    hasMoreBindingWire: true,
  });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState<'All' | StoreCategory>('All');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<QuoteAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    getCatalogPage()
      .then((page) => {
        if (!active) return;
        setProducts(page.products);
        setCursors(page.nextCursors);
        setHasMore(page.hasMore);
        setCatalogState('ready');
      })
      .catch(() => {
        if (active) setCatalogState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const query = normalize(search);
    const compactQuery = query.replace(/\s/g, '');
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const searchable = normalize(`${product.title} ${product.detail} ${product.category}`);
      const matchesSearch = !query || searchable.includes(query) || searchable.replace(/\s/g, '').includes(compactQuery);
      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);

  const selectedIds = useMemo(() => new Set(lines.map(({ product }) => product.id)), [lines]);

  const addProduct = (product: StoreProduct) => {
    setFormError('');
    setLines((current) => {
      if (current.some((line) => line.product.id === product.id)) return current;
      return [...current, { product, quantity: String(minimumFor(product).quantity) }];
    });
  };

  const updateQuantity = (productId: string, value: string) => {
    setLines((current) => current.map((line) => (
      line.product.id === productId ? { ...line, quantity: value.replace(/[^\d]/g, '') } : line
    )));
    setFormError('');
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await getCatalogPage(cursors);
      setProducts((current) => {
        const existing = new Set(current.map((product) => product.id));
        return [...current, ...page.products.filter((product) => !existing.has(product.id))];
      });
      setCursors(page.nextCursors);
      setHasMore(page.hasMore);
    } catch {
      Alert.alert('More products could not load', 'Check your connection and try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const chooseAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;
      if (file.size && file.size > 12 * 1024 * 1024) {
        Alert.alert('File is too large', 'Please choose a file smaller than 12 MB.');
        return;
      }
      setAttachment({ name: file.name, uri: file.uri, size: file.size });
    } catch {
      Alert.alert('File could not be attached', 'Please try selecting the materials list again.');
    }
  };

  const submitQuoteRequest = async () => {
    if (lines.length === 0) {
      setFormError('Add at least one product to your quote list.');
      return;
    }
    if (!name.trim() || !phone.trim() || !email.trim() || !deliveryLocation.trim()) {
      setFormError('Please complete your name, phone, email, and delivery location.');
      return;
    }
    const invalidLine = lines.find((line) => Number(line.quantity) < minimumFor(line.product).quantity);
    if (invalidLine) {
      const minimum = minimumFor(invalidLine.product);
      setFormError(`${invalidLine.product.title} has a minimum request quantity of ${minimum.quantity} ${minimum.unit}.`);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError('Enter a valid email address so Repton can reply.');
      return;
    }

    setSending(true);
    setFormError('');
    try {
      if (!(await MailComposer.isAvailableAsync())) {
        setFormError('No email account is set up on this device. Add an email account, then try again.');
        return;
      }
      const itemLines = lines.map(({ product, quantity }) => {
        const { unit } = minimumFor(product);
        return `• ${product.title}${product.detail ? ` (${product.detail})` : ''} — ${quantity} ${unit}`;
      });
      const body = [
        'Bulk materials quotation request',
        '',
        `Name: ${name.trim()}`,
        `Phone: ${phone.trim()}`,
        `Reply email: ${email.trim()}`,
        `Delivery location: ${deliveryLocation.trim()}`,
        '',
        'Materials requested:',
        ...itemLines,
        '',
        `Additional details: ${notes.trim() || 'None provided'}`,
        attachment ? `Attached materials list: ${attachment.name}` : 'No materials list attached.',
      ].join('\n');

      await MailComposer.composeAsync({
        recipients: [SALES_EMAIL],
        subject: `Bulk quotation request — ${name.trim()}`,
        body,
        attachments: attachment ? [attachment.uri] : undefined,
      });
    } catch {
      setFormError('The email composer could not open. Please try again or email Repton directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹  BACK TO SHOP</Text>
        </Pressable>

        <Text style={styles.eyebrow}>FOR BUILDERS & PROJECTS</Text>
        <Text style={styles.title}>Request a bulk quote</Text>
        <Text style={styles.intro}>Build your materials list, add delivery details, and send it to Repton’s sales team.</Text>

        <View style={styles.stepHeading}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
          <View style={styles.stepCopy}>
            <Text style={styles.sectionTitle}>Choose materials</Text>
            <Text style={styles.sectionHint}>Search the live Repton catalog and add products to your list.</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Search products for a bulk quote"
            placeholder="Search cement, steel and more"
            placeholderTextColor={COLORS.gray}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal contentContainerStyle={styles.categoryList} showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCategory(item)}
                style={[styles.categoryChip, selected && styles.categoryChipActive]}>
                <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>
                  {item === 'All' ? 'All materials' : item === 'Steel' ? 'Steel & reinforcement' : item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {catalogState === 'loading' ? (
          <View style={styles.messageCard}><ActivityIndicator color={COLORS.red} /><Text style={styles.mutedText}>Loading live products…</Text></View>
        ) : catalogState === 'error' ? (
          <View style={styles.messageCard}>
            <Text style={styles.mutedText}>The live product catalog could not load. Go back to the Shop and try again.</Text>
          </View>
        ) : (
          <>
            <View style={styles.productOptions}>
              {visibleProducts.slice(0, 6).map((product) => {
                const selected = selectedIds.has(product.id);
                return (
                  <View key={product.id} style={styles.productOption}>
                    <View style={styles.productImageFrame}>
                      {product.imageUrl ? <Image source={{ uri: product.imageUrl }} resizeMode="contain" style={styles.productImage} /> : null}
                    </View>
                    <View style={styles.productCopy}>
                      <Text numberOfLines={2} style={styles.productTitle}>{product.title}</Text>
                      <Text numberOfLines={1} style={styles.productDetail}>{product.detail}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: selected }}
                      disabled={selected}
                      onPress={() => addProduct(product)}
                      style={[styles.addProductButton, selected && styles.addProductButtonSelected]}>
                      <Text style={[styles.addProductText, selected && styles.addProductTextSelected]}>{selected ? 'ADDED' : 'ADD'}</Text>
                    </Pressable>
                  </View>
                );
              })}
              {visibleProducts.length === 0 && <Text style={styles.mutedText}>No loaded products match that search.</Text>}
            </View>
            {hasMore ? (
              <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.loadMoreButton}>
                <Text style={styles.loadMoreText}>{loadingMore ? 'LOADING MORE…' : 'LOAD MORE PRODUCTS'}</Text>
              </Pressable>
            ) : null}
          </>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.stepHeadingCompact}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepCopy}>
              <Text style={styles.sectionTitle}>Your materials list</Text>
              <Text style={styles.sectionHint}>{lines.length ? `${lines.length} ${lines.length === 1 ? 'product' : 'products'} added` : 'Add products above to start your list.'}</Text>
            </View>
          </View>
          {lines.length ? (
            <View style={styles.quoteLines}>
              {lines.map(({ product, quantity }) => {
                const minimum = minimumFor(product);
                return (
                  <View key={product.id} style={styles.quoteLine}>
                    <View style={styles.quoteLineCopy}>
                      <Text style={styles.quoteLineTitle}>{product.title}</Text>
                      {product.detail ? <Text style={styles.productDetail}>{product.detail}</Text> : null}
                      <Text style={styles.minimumHint}>Minimum {minimum.quantity} {minimum.unit}</Text>
                    </View>
                    <View style={styles.quoteQuantityColumn}>
                      <TextInput
                        accessibilityLabel={`Quantity of ${product.title} in ${minimum.unit}`}
                        keyboardType="number-pad"
                        value={quantity}
                        onChangeText={(value) => updateQuantity(product.id, value)}
                        style={styles.quantityInput}
                      />
                      <Text style={styles.quantityUnit}>{minimum.unit}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${product.title} from quote`} onPress={() => setLines((current) => current.filter((line) => line.product.id !== product.id))} style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>×</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.stepHeading}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
          <View style={styles.stepCopy}>
            <Text style={styles.sectionTitle}>Delivery & contact</Text>
            <Text style={styles.sectionHint}>Repton’s team will use these details to respond to your request.</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <TextInput accessibilityLabel="Your name" placeholder="Full name" placeholderTextColor={COLORS.gray} value={name} onChangeText={setName} autoCapitalize="words" style={styles.field} />
          <TextInput accessibilityLabel="Phone number" placeholder="Phone number" placeholderTextColor={COLORS.gray} value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.field} />
          <TextInput accessibilityLabel="Email address" placeholder="Email address" placeholderTextColor={COLORS.gray} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.field} />
          <TextInput accessibilityLabel="Delivery city and state" placeholder="Delivery location (city and state)" placeholderTextColor={COLORS.gray} value={deliveryLocation} onChangeText={setDeliveryLocation} style={styles.field} />
          <TextInput accessibilityLabel="Additional project details" placeholder="Project details or questions (optional)" placeholderTextColor={COLORS.gray} value={notes} onChangeText={setNotes} multiline textAlignVertical="top" style={[styles.field, styles.notesField]} />
        </View>

        <View style={styles.attachmentCard}>
          <View style={styles.attachmentCopy}>
            <Text style={styles.attachmentTitle}>Attach your materials list</Text>
            <Text style={styles.sectionHint}>Optional · PDF, spreadsheet, CSV, or image · up to 12 MB</Text>
            {attachment ? <Text numberOfLines={1} style={styles.attachmentName}>Attached: {attachment.name}</Text> : null}
          </View>
          {attachment ? (
            <Pressable accessibilityRole="button" onPress={() => setAttachment(null)} style={styles.attachButton}>
              <Text style={styles.attachButtonText}>Remove</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => void chooseAttachment()} style={styles.attachButton}>
              <Text style={styles.attachButtonText}>Choose file</Text>
            </Pressable>
          )}
        </View>

        {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}

        <Pressable accessibilityRole="button" disabled={sending} onPress={() => void submitQuoteRequest()} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, sending && styles.disabled]}>
          {sending ? <ActivityIndicator color={COLORS.paper} /> : <Text style={styles.submitButtonText}>Prepare quote request email</Text>}
        </Pressable>
        <Text style={styles.privacyNote}>Your email app will open with this request addressed to Repton. Review it and tap Send to submit.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = { red: '#D71920', redPale: '#FFF5F3', redLine: '#EEDBD8', black: '#171717', gray: '#74716F', paper: '#FFFFFF', background: '#FAF9F7', line: '#EAE7E4' };

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  page: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', paddingRight: 12 },
  backText: { color: COLORS.red, fontSize: 12, fontWeight: '600' },
  eyebrow: { color: COLORS.red, fontSize: 11, fontWeight: '600', letterSpacing: 0.45, marginTop: 14 },
  title: { color: COLORS.black, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.45, marginTop: 5 },
  intro: { color: COLORS.gray, fontSize: 14, lineHeight: 20, marginTop: 7 },
  stepHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 24, marginBottom: 11 },
  stepHeadingCompact: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  stepNumber: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.redPale },
  stepNumberText: { color: COLORS.red, fontSize: 12, fontWeight: '900' },
  stepCopy: { flex: 1 },
  sectionTitle: { color: COLORS.black, fontSize: 15, fontWeight: '600' },
  sectionHint: { color: COLORS.gray, fontSize: 12, lineHeight: 17, marginTop: 3 },
  searchBox: { height: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, paddingRight: 12, borderRadius: 13, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.paper },
  searchGlyph: { color: COLORS.red, fontSize: 23, lineHeight: 27, marginRight: 7 },
  searchInput: { flex: 1, paddingVertical: 8, color: COLORS.black, fontSize: 14 },
  categoryList: { gap: 7, paddingVertical: 11 },
  categoryChip: { minHeight: 31, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 17, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  categoryChipActive: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  categoryText: { color: COLORS.gray, fontSize: 12, fontWeight: '500' },
  categoryTextActive: { color: COLORS.paper },
  productOptions: { gap: 8 },
  productOption: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, borderRadius: 13, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  productImageFrame: { width: 50, height: 50, overflow: 'hidden', borderRadius: 9, backgroundColor: '#F3F3F3' },
  productImage: { width: '100%', height: '100%' },
  productCopy: { flex: 1 },
  productTitle: { color: COLORS.black, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  productDetail: { color: COLORS.gray, fontSize: 11, marginTop: 3 },
  addProductButton: { minWidth: 54, minHeight: 33, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 9, backgroundColor: COLORS.red },
  addProductButtonSelected: { backgroundColor: COLORS.redPale },
  addProductText: { color: COLORS.paper, fontSize: 11, fontWeight: '600' },
  addProductTextSelected: { color: COLORS.red },
  loadMoreButton: { minHeight: 39, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 10, backgroundColor: COLORS.black },
  loadMoreText: { color: COLORS.paper, fontSize: 12, fontWeight: '600' },
  sectionCard: { marginTop: 19, padding: 13, borderRadius: 16, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  quoteLines: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line },
  quoteLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  quoteLineCopy: { flex: 1 },
  quoteLineTitle: { color: COLORS.black, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  minimumHint: { color: COLORS.red, fontSize: 11, fontWeight: '500', marginTop: 3 },
  quoteQuantityColumn: { width: 55, alignItems: 'center' },
  quantityInput: { width: 52, height: 34, textAlign: 'center', color: COLORS.black, fontSize: 11, fontWeight: '900', borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 4 },
  quantityUnit: { color: COLORS.gray, fontSize: 10, marginTop: 2 },
  removeButton: { width: 26, height: 30, alignItems: 'center', justifyContent: 'center' },
  removeButtonText: { color: COLORS.gray, fontSize: 19, fontWeight: '500' },
  formCard: { gap: 9, padding: 12, borderRadius: 15, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  field: { minHeight: 43, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, color: COLORS.black, backgroundColor: COLORS.paper, fontSize: 11 },
  notesField: { minHeight: 78, paddingTop: 11 },
  attachmentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 13, borderRadius: 14, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  attachmentCopy: { flex: 1 },
  attachmentTitle: { color: COLORS.black, fontSize: 13, fontWeight: '600' },
  attachmentName: { color: COLORS.red, fontSize: 11, fontWeight: '500', marginTop: 5 },
  attachButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9, backgroundColor: COLORS.redPale },
  attachButtonText: { color: COLORS.red, fontSize: 11, fontWeight: '600' },
  formError: { color: COLORS.red, fontSize: 10, lineHeight: 15, marginTop: 12 },
  submitButton: { minHeight: 51, alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingHorizontal: 12, borderRadius: 13, backgroundColor: COLORS.red },
  submitButtonText: { color: COLORS.paper, fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.65 },
  privacyNote: { color: COLORS.gray, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 9, paddingHorizontal: 6 },
  messageCard: { alignItems: 'center', justifyContent: 'center', gap: 9, padding: 20, borderRadius: 14, backgroundColor: COLORS.paper },
  mutedText: { color: COLORS.gray, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  pressed: { opacity: 0.8 },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { router, useFocusEffect } from 'expo-router';
import { StoreProductCard } from '@/components/store-product-card';
import { PartnerLogoMarquee } from '@/components/partner-logo-marquee';
import { ReinforcementPriceGrid } from '@/components/reinforcement-price-grid';
import { useCart } from '@/contexts/cart-context';
import { getHomeCatalog, type StoreProduct } from '@/lib/shopify';
import { getReinforcementPriceTable, type ReinforcementPriceTable } from '@/lib/reinforcement-price-table';

type Category = 'All' | 'Cement' | 'Steel' | 'Binding wire';

const HERO_IMAGE =
  'https://www.reptongroup.ng/cdn/shop/files/Dangote-3X-Cement-42.5R-700x1050.png?v=1776346502';

const categories: Category[] = ['All', 'Cement', 'Steel', 'Binding wire'];

export default function HomeScreen() {
  const [category, setCategory] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogRequest, setCatalogRequest] = useState(0);
  const [priceTable, setPriceTable] = useState<ReinforcementPriceTable | null>(null);
  const [priceTableLoading, setPriceTableLoading] = useState(true);
  const [priceTableError, setPriceTableError] = useState(false);
  const { cart } = useCart();

  useEffect(() => {
    let active = true;
    getHomeCatalog()
      .then((items) => {
        if (!active) return;
        setProducts(items);
        setCatalogState('ready');
      })
      .catch(() => {
        if (active) setCatalogState('error');
      });
    return () => {
      active = false;
    };
  }, [catalogRequest]);

  const fetchPriceTable = useCallback(() => {
    getReinforcementPriceTable()
      .then((table) => {
        setPriceTable(table);
        setPriceTableError(false);
      })
      .catch(() => {
        setPriceTableError(true);
      })
      .finally(() => {
        setPriceTableLoading(false);
      });
  }, []);

  useFocusEffect(fetchPriceTable);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch = !query || `${product.title} ${product.detail}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);

  const submitSearch = () => {
    const query = search.trim();
    if (query) {
      router.navigate({ pathname: '/explore', params: { category: 'All', search: query } });
    }
  };

  const refreshPriceTable = () => {
    setPriceTableLoading(true);
    setPriceTableError(false);
    fetchPriceTable();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <Image
              source={require('@/assets/images/repton-logo.png')}
              resizeMode="contain"
              style={styles.brandLogo}
              accessibilityLabel="Repton Group"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open shopping cart"
            onPress={() => router.navigate('/cart')}
            style={({ pressed }) => [styles.bagButton, pressed && styles.pressed]}>
            <View style={styles.bagIcon}>
              <View style={styles.bagHandle} />
            </View>
            <Text style={styles.bagLabel}>BAG</Text>
            {!!cart?.totalQuantity && (
              <View style={styles.bagCount}>
                <Text style={styles.bagCountText}>{cart.totalQuantity}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.deliveryLine}>
          <View style={styles.deliveryDot} />
          <Text style={styles.deliveryText}>Building materials, delivered across Nigeria</Text>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Search Repton Group products"
            placeholder="Search cement, steel and more"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            style={styles.searchInput}
          />
          <Pressable accessibilityRole="button" onPress={submitSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>SUPPLY YOU CAN BUILD ON</Text>
            <Text style={styles.heroTitle}>Build with confidence.</Text>
            <Text style={styles.heroBody}>Quality cement and steel for projects of every scale.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate({ pathname: '/explore', params: { category: 'Cement', search: '' } })}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
              <Text style={styles.heroButtonText}>Shop cement</Text>
              <Text style={styles.heroButtonArrow}>↗</Text>
            </Pressable>
          </View>
          <View style={styles.heroImagePanel}>
            <Image
              source={{ uri: HERO_IMAGE }}
              resizeMode="contain"
              style={styles.heroImage}
              accessibilityLabel="Dangote 3X cement bag"
            />
          </View>
          <View style={styles.heroAccent} />
        </View>

        <View style={styles.minimumOrderCard}>
          <View style={styles.minimumOrderHeading}>
            <View style={styles.infoMark}>
              <Text style={styles.infoMarkText}>i</Text>
            </View>
            <Text style={styles.minimumOrderTitle}>Planning a bulk order?</Text>
          </View>
          <View style={styles.minimumOrderRules}>
            <View style={styles.minimumOrderRule}>
              <Text style={styles.minimumOrderNumber}>300 bags</Text>
              <Text style={styles.minimumOrderLabel}>minimum cement order</Text>
            </View>
            <View style={styles.ruleDivider} />
            <View style={styles.minimumOrderRule}>
              <Text style={styles.minimumOrderNumber}>1 tonne</Text>
              <Text style={styles.minimumOrderLabel}>minimum iron rod order</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/explore/quote')}
            style={({ pressed }) => [styles.quoteButton, pressed && styles.pressed]}>
            <Text style={styles.quoteButtonText}>Request a bulk quote</Text>
            <Text style={styles.quoteButtonArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>SHOP THE RANGE</Text>
            <Text style={styles.sectionTitle}>Materials for the job</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate({ pathname: '/explore', params: { category: 'All', search: '' } })}
            hitSlop={8}>
            <Text style={styles.viewAll}>View all ↗</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryList}
          showsHorizontalScrollIndicator={false}>
          {categories.map((item) => {
            const isActive = category === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}>
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {item === 'Steel' ? 'Steel & reinforcement' : item === 'All' ? 'All materials' : item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.productsHeading}>
          <Text style={styles.sectionTitle}>Popular products</Text>
        <Text style={styles.livePriceNote}>{catalogState === 'ready' ? 'Live prices' : 'Shopify catalog'}</Text>
        </View>
        {catalogState === 'loading' ? (
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>Loading products and prices from Shopify…</Text>
          </View>
        ) : catalogState === 'error' ? (
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>The live catalog could not load right now.</Text>
            <Pressable onPress={() => { setCatalogState('loading'); setCatalogRequest((request) => request + 1); }}>
              <Text style={styles.viewAll}>Try again</Text>
            </Pressable>
          </View>
        ) : visibleProducts.length > 0 ? (
          <ScrollView
            horizontal
            contentContainerStyle={styles.productList}
            showsHorizontalScrollIndicator={false}>
            {visibleProducts.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>No featured items match “{search}”.</Text>
            <Pressable onPress={submitSearch}>
              <Text style={styles.viewAll}>Search the full store ↗</Text>
            </Pressable>
          </View>
        )}

        <PartnerLogoMarquee />

        <View style={styles.homePriceHeading}>
          <View style={styles.homePriceHeadingCopy}>
            <Text style={styles.sectionEyebrow}>Live reinforcement prices</Text>
            <Text style={styles.sectionTitle}>Compare steel by size</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={priceTableLoading} onPress={refreshPriceTable} style={({ pressed }) => [styles.homePriceRefresh, pressed && styles.pressed]}>
            <Text style={styles.homePriceRefreshText}>{priceTableLoading ? 'Updating' : 'Refresh'}</Text>
          </Pressable>
        </View>
        <Text style={styles.homePriceHint}>
          {priceTableLoading
            ? 'Checking the latest table from the Repton website…'
            : priceTableError
              ? priceTable ? 'Could not refresh. Showing the last loaded prices.' : 'The live table could not load.'
              : 'Live from the Repton website · swipe sideways to see all suppliers'}
        </Text>
        {priceTable ? (
          <ReinforcementPriceGrid table={priceTable} />
        ) : priceTableLoading ? (
          <View style={styles.homePriceMessage}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={styles.homePriceMessageText}>Loading reinforcement prices…</Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={refreshPriceTable} style={styles.homePriceRetry}>
            <Text style={styles.homePriceRetryText}>Load the price table again</Text>
          </Pressable>
        )}
        <Text style={styles.homePriceDisclaimer}>Prices may change. Check the final price and delivery details at checkout.</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/about')}
          style={({ pressed }) => [styles.aboutCard, pressed && styles.pressed]}>
          <View style={styles.aboutCopy}>
            <Text style={styles.aboutEyebrow}>Get to know us</Text>
            <Text style={styles.aboutTitle}>About Repton Group</Text>
            <Text style={styles.aboutBody}>Discover the businesses and values behind the materials we supply.</Text>
          </View>
          <Text style={styles.aboutArrow}>›</Text>
        </Pressable>

          <Text style={styles.priceDisclaimer}>
          Product prices can change. Check the Repton Group store for current pricing and delivery details.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  ink: '#171717',
  navy: '#171717',
  gold: '#D71920',
  background: '#FAF9F7',
  paper: '#FFFFFF',
  muted: '#74716F',
  line: '#EAE7E4',
  paleGold: '#FFF8F7',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  page: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 150,
    height: 47,
  },
  bagButton: {
    minWidth: 82,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  bagIcon: {
    width: 16,
    height: 15,
    borderWidth: 1.6,
    borderColor: COLORS.paper,
    borderTopWidth: 1.3,
    borderRadius: 3,
    marginTop: 4,
    alignItems: 'center',
  },
  bagHandle: {
    position: 'absolute',
    top: -6,
    width: 8,
    height: 7,
    borderWidth: 1.4,
    borderColor: COLORS.paper,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  bagLabel: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  bagCount: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagCountText: {
    color: COLORS.paper,
    fontSize: 10,
    fontWeight: '900',
  },
  deliveryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 14,
  },
  deliveryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },
  deliveryText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  searchBox: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 5,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  searchGlyph: {
    color: COLORS.muted,
    fontSize: 25,
    lineHeight: 30,
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: COLORS.ink,
    fontSize: 14,
  },
  searchButton: {
    height: 42,
    minWidth: 46,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '700',
  },
  hero: {
    minHeight: 210,
    backgroundColor: COLORS.paper,
    borderRadius: 22,
    marginTop: 20,
    paddingLeft: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  heroCopy: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'center',
    paddingRight: 4,
  },
  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.55,
    marginBottom: 10,
  },
  heroTitle: {
    maxWidth: 190,
    color: COLORS.ink,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  heroBody: {
    maxWidth: 190,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 17,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
  },
  heroButtonText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '700',
  },
  heroButtonArrow: {
    color: COLORS.paper,
    fontSize: 15,
    fontWeight: '700',
  },
  heroImagePanel: {
    width: '38%',
    height: 168,
    alignSelf: 'center',
    marginRight: 12,
    borderRadius: 18,
    backgroundColor: '#F7F6F4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroAccent: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(215,25,32,0.08)',
    position: 'absolute',
    right: -58,
    top: -62,
  },
  minimumOrderCard: {
    marginTop: 13,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  quoteButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFF6F5' },
  quoteButtonText: { color: COLORS.gold, fontSize: 11, fontWeight: '700' },
  quoteButtonArrow: { color: COLORS.paper, fontSize: 20, lineHeight: 22 },
  minimumOrderHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoMark: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoMarkText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  minimumOrderTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  minimumOrderRules: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
  },
  minimumOrderRule: {
    flex: 1,
  },
  minimumOrderNumber: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  minimumOrderLabel: {
    color: '#687487',
    fontSize: 9,
    marginTop: 3,
  },
  homePriceHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 29 },
  homePriceHeadingCopy: { flex: 1, paddingRight: 8 },
  homePriceRefresh: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, backgroundColor: '#FFF6F5' },
  homePriceRefreshText: { color: COLORS.gold, fontSize: 10, fontWeight: '600' },
  homePriceHint: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 7, marginBottom: 11 },
  homePriceMessage: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, backgroundColor: COLORS.paper },
  homePriceMessageText: { color: COLORS.muted, fontSize: 12 },
  homePriceRetry: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: COLORS.paper },
  homePriceRetryText: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
  homePriceDisclaimer: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 9 },
  ruleDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 12,
    backgroundColor: COLORS.line,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sectionEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.55,
    marginBottom: 4,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  viewAll: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryList: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 3,
  },
  categoryChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
  },
  categoryChipActive: {
    borderColor: '#F0CFCE',
    backgroundColor: '#FFF4F3',
  },
  categoryText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: COLORS.gold,
  },
  productsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 22,
    marginBottom: 12,
  },
  livePriceNote: {
    color: COLORS.muted,
    fontSize: 11,
  },
  productList: {
    gap: 13,
    paddingBottom: 6,
  },
  emptySearch: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: COLORS.paper,
    alignItems: 'flex-start',
    gap: 10,
  },
  emptySearchText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  priceDisclaimer: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  aboutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 19,
    borderRadius: 18,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  aboutCopy: {
    flex: 1,
    paddingRight: 14,
  },
  aboutEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.55,
  },
  aboutTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 5,
  },
  aboutBody: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  aboutArrow: {
    color: COLORS.gold,
    fontSize: 30,
    fontWeight: '300',
  },
  pressed: {
    opacity: 0.82,
  },
});

import { useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { StoreProductCard } from '@/components/store-product-card';
import { useFavorites } from '@/contexts/favorites-context';
import { getCatalogPage, type CatalogCursors, type StoreCategory, type StoreProduct } from '@/lib/shopify';

const collections = [
  {
    title: 'Cement',
    category: 'Cement' as const,
    description: 'Trusted brands for building and infrastructure.',
    minimum: '300 bags minimum',
    image:
      'https://www.reptongroup.ng/cdn/shop/files/Dangote-3X-Cement-42.5R-700x1050.png?v=1776346502',
  },
  {
    title: 'Steel & reinforcement',
    category: 'Steel' as const,
    description: 'Reinforcement bars in popular sizes and grades.',
    minimum: '1 tonne minimum',
    image:
      'https://www.reptongroup.ng/cdn/shop/files/20-mm-iron-rod_83da4626-48d1-4214-902a-fc16e736c95e.png?v=1776858327',
  },
];

function CollectionCard({
  description,
  image,
  minimum,
  onSelect,
  title,
}: {
  description: string;
  image: string;
  minimum: string;
  onSelect: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${title} products in the app`}
      onPress={onSelect}
      style={({ pressed }) => [styles.collectionCard, pressed && styles.pressed]}>
      <View style={styles.collectionImagePanel}>
        <Image source={{ uri: image }} resizeMode="contain" style={styles.collectionImage} />
        <View style={styles.minimumPill}>
          <Text style={styles.minimumPillText}>{minimum}</Text>
        </View>
      </View>
      <View style={styles.collectionCopy}>
        <Text style={styles.collectionTitle}>{title}</Text>
        <Text style={styles.collectionDescription}>{description}</Text>
        <View style={styles.collectionActionRow}>
          <Text style={styles.collectionAction}>View products</Text>
          <Text style={styles.collectionArrow}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ShopScreen() {
  const { category: categoryParam, search: searchParam } = useLocalSearchParams<{ category?: string; search?: string }>();
  const category: 'All' | StoreCategory = categoryParam === 'Cement' || categoryParam === 'Steel' || categoryParam === 'Binding wire'
    ? categoryParam
    : 'All';
  const search = searchParam ?? '';
  const setCategory = (nextCategory: 'All' | StoreCategory) => router.setParams({ category: nextCategory });
  const setSearch = (nextSearch: string) => router.setParams({ search: nextSearch, ...(nextSearch.trim() ? { category: 'All' } : {}) });
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
  const [catalogRequest, setCatalogRequest] = useState(0);
  const { products: savedProducts, isReady: favoritesReady } = useFavorites();

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
  }, [catalogRequest]);

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

  const loadMore = async () => {
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

  const submitSearch = () => setCategory('All');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/repton-logo.png')}
            resizeMode="contain"
            style={styles.brandLogo}
            accessibilityLabel="Repton Group"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show all products in the app"
            onPress={() => router.setParams({ category: 'All', search: '' })}
            style={({ pressed }) => [styles.allProductsButton, pressed && styles.pressed]}>
            <Text style={styles.allProductsButtonText}>All products</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>The Repton store</Text>
        <Text style={styles.pageTitle}>Find materials for your next project.</Text>
        <Text style={styles.pageDescription}>
          Browse construction essentials from Repton Group and Kazab Heritage.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/explore/quote')}
          style={({ pressed }) => [styles.quoteLink, pressed && styles.pressed]}>
          <View style={styles.quoteLinkMark}><Text style={styles.quoteLinkMarkText}>₦</Text></View>
          <View style={styles.priceTableCopy}>
            <Text style={styles.priceTableTitle}>Planning a bulk order?</Text>
            <Text style={styles.priceTableSubtitle}>Build a materials list and request a quote</Text>
          </View>
          <Text style={styles.priceTableArrow}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/explore/favorites')}
          style={({ pressed }) => [styles.savedProductsLink, pressed && styles.pressed]}>
          <Text style={styles.savedProductsIcon}>♡</Text>
          <Text style={styles.savedProductsText}>{favoritesReady ? `Saved products · ${savedProducts.length}` : 'Saved products'}</Text>
          <Text style={styles.savedProductsArrow}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/explore/prices')}
          style={({ pressed }) => [styles.priceTableLink, pressed && styles.pressed]}>
          <View style={styles.priceTableMark}><Text style={styles.priceTableMarkText}>₦</Text></View>
          <View style={styles.priceTableCopy}>
            <Text style={styles.priceTableTitle}>Reinforcement price table</Text>
            <Text style={styles.priceTableSubtitle}>Live prices from the Repton website</Text>
          </View>
          <Text style={styles.priceTableArrow}>›</Text>
        </Pressable>

        <View style={styles.searchBox}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Search products in the Repton Group store"
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
        {search.trim().length > 0 ? (
          <View style={styles.searchFeedback}>
            <Text style={styles.searchFeedbackText}>
              {catalogState === 'loading'
                ? 'Searching the live catalog…'
                : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'match' : 'matches'} for “${search.trim()}”`}
            </Text>
          </View>
        ) : null}
        {search.trim().length > 0 && catalogState === 'ready' ? (
          visibleProducts.length > 0 ? (
            <ScrollView horizontal contentContainerStyle={styles.searchResults} showsHorizontalScrollIndicator={false}>
              {visibleProducts.slice(0, 5).map((product) => (
                <StoreProductCard key={product.id} product={product} />
              ))}
            </ScrollView>
          ) : hasMore ? (
            <Pressable disabled={loadingMore} onPress={() => void loadMore()} style={({ pressed }) => [styles.searchMoreButton, pressed && styles.pressed]}>
              <Text style={styles.collectionAction}>{loadingMore ? 'Loading more…' : 'No match yet · load more products'}</Text>
            </Pressable>
          ) : (
            <View style={styles.catalogMessage}>
              <Text style={styles.priceNoteText}>No products match this search. Check the spelling or browse the full store.</Text>
            </View>
          )
        ) : null}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>Shop by category</Text>
            <Text style={styles.sectionTitle}>Building essentials</Text>
          </View>
          <View style={styles.redRule} />
        </View>

        <View style={styles.collectionList}>
          {collections.map(({ category: collectionCategory, ...collection }) => (
            <CollectionCard
              key={collection.title}
              {...collection}
              onSelect={() => router.setParams({ category: collectionCategory, search: '' })}
            />
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>From our live catalog</Text>
            <Text style={styles.sectionTitle}>Popular products</Text>
          </View>
          <View style={styles.redRule} />
        </View>
        {catalogState === 'loading' ? (
          <View style={styles.catalogMessage}>
            <Text style={styles.priceNoteText}>Loading products and prices from Shopify…</Text>
          </View>
        ) : catalogState === 'error' ? (
          <View style={styles.catalogMessage}>
            <Text style={styles.priceNoteText}>The live catalog could not load right now.</Text>
            <Pressable onPress={() => { setCatalogState('loading'); setCatalogRequest((request) => request + 1); }}>
              <Text style={styles.collectionAction}>Try again</Text>
            </Pressable>
          </View>
        ) : products.length ? (
          <>
            <ScrollView horizontal contentContainerStyle={styles.categoryFilters} showsHorizontalScrollIndicator={false}>
              {(['All', 'Cement', 'Steel', 'Binding wire'] as const).map((item) => {
                const selected = category === item;
                return (
                  <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setCategory(item)} style={[styles.filterChip, selected && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{item === 'All' ? 'All materials' : item === 'Steel' ? 'Steel & reinforcement' : item}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.productGrid}>
              {visibleProducts.map((product) => (
                <StoreProductCard key={product.id} product={product} layout="grid" />
              ))}
            </View>
            {visibleProducts.length === 0 && (
              <View style={styles.catalogMessage}>
                <Text style={styles.priceNoteText}>No loaded products match “{search}”. Try a different search or load more products.</Text>
              </View>
            )}
            {hasMore ? (
              <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}>
                <Text style={styles.loadMoreText}>{loadingMore ? 'Loading…' : 'Load more products'}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={styles.catalogMessage}>
            <Text style={styles.priceNoteText}>No products are currently listed in these collections.</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.setParams({ category: 'Binding wire', search: '' })}
          style={({ pressed }) => [styles.secondaryCollection, pressed && styles.pressed]}>
          <View style={styles.wireMark}>
            <Text style={styles.wireMarkText}>BW</Text>
          </View>
          <View style={styles.secondaryCollectionCopy}>
            <Text style={styles.secondaryCollectionTitle}>Binding wire</Text>
            <Text style={styles.secondaryCollectionDescription}>Browse wire and other essentials</Text>
          </View>
          <Text style={styles.secondaryArrow}>›</Text>
        </Pressable>

        <View style={styles.priceNote}>
          <View style={styles.noteMark}>
            <Text style={styles.noteMarkText}>!</Text>
          </View>
          <Text style={styles.priceNoteText}>
            Prices can change. Check the live product page for current pricing and delivery details.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  red: '#D71920',
  redDark: '#B7131A',
  redPale: '#FFF5F3',
  redLine: '#EEDBD8',
  black: '#171717',
  paper: '#FFFFFF',
  background: '#FAF9F7',
  muted: '#74716F',
  line: '#EAE7E4',
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
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 23,
  },
  brandLogo: {
    width: 142,
    height: 44,
  },
  allProductsButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  allProductsButtonText: {
    color: COLORS.black,
    fontSize: 11,
    fontWeight: '500',
  },
  eyebrow: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.55,
    marginBottom: 7,
  },
  pageTitle: {
    maxWidth: 330,
    color: COLORS.black,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  pageDescription: {
    maxWidth: 320,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  quoteLink: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, marginTop: 17, borderRadius: 16, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  savedProductsLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, marginTop: 10, borderRadius: 14, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  savedProductsIcon: { color: COLORS.red, fontSize: 21 },
  savedProductsText: { flex: 1, color: COLORS.black, fontSize: 13, fontWeight: '600' },
  savedProductsArrow: { color: COLORS.red, fontSize: 23 },
  quoteLinkMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.redPale },
  quoteLinkMarkText: { color: COLORS.red, fontSize: 18, fontWeight: '600' },
  priceTableLink: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, marginTop: 10, borderRadius: 16, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line },
  priceTableMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.redPale },
  priceTableMarkText: { color: COLORS.red, fontSize: 18, fontWeight: '600' },
  priceTableCopy: { flex: 1 },
  priceTableTitle: { color: COLORS.black, fontSize: 14, fontWeight: '600' },
  priceTableSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  priceTableArrow: { color: COLORS.red, fontSize: 26, fontWeight: '400' },
  searchBox: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 5,
    marginTop: 20,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  searchGlyph: {
    color: COLORS.red,
    fontSize: 25,
    lineHeight: 30,
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: COLORS.black,
    fontSize: 14,
  },
  searchButton: {
    height: 42,
    minWidth: 70,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '600',
  },
  searchFeedback: { marginTop: 9, paddingHorizontal: 3 },
  searchFeedbackText: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  searchResults: { gap: 10, paddingTop: 10, paddingBottom: 2 },
  searchMoreButton: { marginTop: 9, padding: 11, borderRadius: 10, backgroundColor: COLORS.redPale },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 27,
    marginBottom: 13,
  },
  sectionEyebrow: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.55,
    marginBottom: 4,
  },
  sectionTitle: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  redRule: {
    width: 28,
    height: 3,
    marginBottom: 3,
    borderRadius: 2,
    backgroundColor: COLORS.red,
  },
  collectionList: {
    gap: 13,
  },
  categoryFilters: { gap: 8, paddingTop: 15, paddingBottom: 13 },
  filterChip: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.paper },
  filterChipActive: { borderColor: COLORS.redLine, backgroundColor: COLORS.redPale },
  filterChipText: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  filterChipTextActive: { color: COLORS.red, fontWeight: '600' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 },
  loadMoreButton: { minHeight: 46, marginTop: 16, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.red },
  loadMoreText: { color: COLORS.paper, fontSize: 12, fontWeight: '600' },
  catalogMessage: {
    padding: 17,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
    gap: 9,
  },
  collectionCard: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  collectionImagePanel: {
    height: 146,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6F4',
    overflow: 'hidden',
  },
  collectionImage: {
    width: '100%',
    height: '100%',
  },
  minimumPill: {
    position: 'absolute',
    left: 11,
    top: 11,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.paper,
  },
  minimumPillText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: '500',
  },
  collectionCopy: {
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 14,
  },
  collectionTitle: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: '600',
  },
  collectionDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  collectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },
  collectionAction: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: '600',
  },
  collectionArrow: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryCollection: {
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    paddingHorizontal: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
  },
  wireMark: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redPale,
  },
  wireMarkText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: '600',
  },
  secondaryCollectionCopy: {
    flex: 1,
    marginLeft: 11,
  },
  secondaryCollectionTitle: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryCollectionDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  secondaryArrow: {
    color: COLORS.red,
    fontSize: 18,
    fontWeight: '700',
  },
  priceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.paper,
  },
  noteMark: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },
  noteMarkText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '900',
  },
  priceNoteText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
});

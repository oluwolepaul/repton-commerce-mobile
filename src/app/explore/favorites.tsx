import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { StoreProductCard } from '@/components/store-product-card';
import { useFavorites } from '@/contexts/favorites-context';

export default function SavedProductsScreen() {
  const { products, isReady } = useFavorites();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹  Back to shop</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Your shortlist</Text>
        <Text style={styles.title}>Saved products</Text>
        <Text style={styles.subtitle}>Keep the materials you’re considering close at hand.</Text>

        {!isReady ? (
          <View style={styles.messageCard}><Text style={styles.messageText}>Loading your saved products…</Text></View>
        ) : products.length ? (
          <View style={styles.productGrid}>
            {products.map((product) => <StoreProductCard key={product.id} product={product} layout="grid" />)}
          </View>
        ) : (
          <View style={styles.messageCard}>
            <Text style={styles.emptyHeart}>♡</Text>
            <Text style={styles.emptyTitle}>Your shortlist is ready</Text>
            <Text style={styles.messageText}>Tap the heart on any product to save it here for later.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/explore', params: { category: 'All', search: '' } })} style={styles.shopButton}>
              <Text style={styles.shopButtonText}>Browse products</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF9F7' },
  page: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 38 },
  backButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingRight: 14 },
  backText: { color: '#D71920', fontSize: 12, fontWeight: '500' },
  eyebrow: { color: '#D71920', fontSize: 11, fontWeight: '600', letterSpacing: 0.45, marginTop: 7 },
  title: { color: '#171717', fontSize: 28, fontWeight: '700', letterSpacing: -0.45, marginTop: 4 },
  subtitle: { color: '#74716F', fontSize: 14, lineHeight: 20, marginTop: 7 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 19 },
  messageCard: { alignItems: 'center', padding: 25, marginTop: 28, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE7E4' },
  emptyHeart: { color: '#D71920', fontSize: 38, lineHeight: 44 },
  emptyTitle: { color: '#171717', fontSize: 18, fontWeight: '600', marginTop: 11 },
  messageText: { color: '#74716F', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  shopButton: { minHeight: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 17, borderRadius: 12, backgroundColor: '#D71920' },
  shopButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});

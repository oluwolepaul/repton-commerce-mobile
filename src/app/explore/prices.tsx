import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ReinforcementPriceGrid } from '@/components/reinforcement-price-grid';
import { getReinforcementPriceTable, type ReinforcementPriceTable } from '@/lib/reinforcement-price-table';

export default function ReinforcementPricesScreen() {
  const [table, setTable] = useState<ReinforcementPriceTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    getReinforcementPriceTable()
      .then((liveTable) => {
        if (active) setTable(liveTable);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const refresh = () => {
    setLoading(true);
    setError(false);
    setRefreshKey((key) => key + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹  Shop</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={loading} onPress={refresh} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <Text style={styles.refreshButtonText}>{loading ? 'Updating…' : 'Refresh ↻'}</Text>
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>Live from reptongroup.ng</Text>
        <Text style={styles.title}>Reinforcement prices</Text>
        <Text style={styles.subtitle}>Compare steel prices by size and supplier. Swipe sideways to see all columns.</Text>

        {loading && !table ? (
          <View style={styles.messageCard}>
            <ActivityIndicator color={COLORS.red} />
            <Text style={styles.messageText}>Loading the latest table from Repton Group…</Text>
          </View>
        ) : error && !table ? (
          <View style={styles.messageCard}>
            <Text style={styles.errorTitle}>Prices couldn’t load</Text>
            <Text style={styles.messageText}>Check your connection and try again.</Text>
            <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : table ? (
          <>
            <View style={styles.sourceNote}>
              <View style={styles.liveDot} />
              <Text style={styles.sourceText}>
                {loading ? 'Checking for website updates…' : error ? 'Could not refresh; showing the last loaded prices' : 'Live table loaded from the Repton website'}
              </Text>
            </View>
            <ReinforcementPriceGrid table={table} />
            <Text style={styles.disclaimer}>Prices can change. Repton Group’s website is the source for this table; refresh to check for the latest update.</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = { red: '#D71920', black: '#171717', gray: '#74716F', paper: '#FFFFFF', background: '#FAF9F7', line: '#EAE7E4' };

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  page: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 38 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 38, justifyContent: 'center', paddingRight: 14 },
  backText: { color: COLORS.black, fontSize: 12, fontWeight: '600' },
  refreshButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: '#FFF5F3' },
  refreshButtonText: { color: COLORS.red, fontSize: 12, fontWeight: '600' },
  eyebrow: { color: COLORS.red, fontSize: 11, fontWeight: '600', letterSpacing: 0.45, marginTop: 13 },
  title: { color: COLORS.black, fontSize: 28, fontWeight: '700', letterSpacing: -0.45, marginTop: 4 },
  subtitle: { color: COLORS.gray, fontSize: 14, lineHeight: 20, marginTop: 7 },
  sourceNote: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17, marginBottom: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#1D9B69' },
  sourceText: { color: COLORS.gray, fontSize: 12, fontWeight: '500' },
  disclaimer: { color: COLORS.gray, fontSize: 12, lineHeight: 18, marginTop: 12 },
  messageCard: { alignItems: 'center', padding: 22, marginTop: 25, borderRadius: 16, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.line, gap: 9 },
  messageText: { color: COLORS.gray, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  errorTitle: { color: COLORS.black, fontSize: 17, fontWeight: '600' },
  retryButton: { minHeight: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.red, marginTop: 5 },
  retryButtonText: { color: COLORS.paper, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});

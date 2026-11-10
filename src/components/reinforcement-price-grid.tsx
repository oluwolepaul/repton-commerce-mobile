import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ReinforcementPriceTable } from '@/lib/reinforcement-price-table';

const FIRST_COLUMN_WIDTH = 74;
const PRICE_COLUMN_WIDTH = 152;

export function ReinforcementPriceGrid({ table }: { table: ReinforcementPriceTable }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          {table.headers.map((header, index) => (
            <View key={`header-${index}`} style={[styles.tableCell, styles.headerCell, index === 0 ? styles.sizeColumn : styles.priceColumn]}>
              <Text style={styles.headerText}>{header || (index === 0 ? 'SIZE' : '')}</Text>
            </View>
          ))}
        </View>
        {table.rows.map((row, rowIndex) => (
          <View key={`${row[0]}-${rowIndex}`} style={[styles.tableRow, rowIndex % 2 === 1 && styles.alternateRow]}>
            {table.headers.map((_, columnIndex) => (
              <View key={`${rowIndex}-${columnIndex}`} style={[styles.tableCell, columnIndex === 0 ? styles.sizeColumn : styles.priceColumn]}>
                <Text style={[styles.cellText, columnIndex === 0 && styles.sizeText]}>
                  {row[columnIndex]?.trim() || '—'}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tableScroll: { paddingBottom: 3 },
  table: { borderWidth: 1, borderColor: '#EAE7E4', borderRadius: 15, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  tableRow: { flexDirection: 'row' },
  alternateRow: { backgroundColor: '#FAFAFA' },
  tableCell: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 9, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#EAE7E4' },
  sizeColumn: { width: FIRST_COLUMN_WIDTH, backgroundColor: '#FFFAF9' },
  priceColumn: { width: PRICE_COLUMN_WIDTH },
  headerCell: { minHeight: 76, backgroundColor: '#F7F6F4', borderColor: '#EAE7E4' },
  headerText: { color: '#45413F', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  cellText: { color: '#45413F', fontSize: 11, lineHeight: 16 },
  sizeText: { color: '#D71920', fontWeight: '600' },
});

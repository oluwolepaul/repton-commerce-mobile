import { STORE_URL } from '@/lib/shopify';

export type ReinforcementPriceTable = {
  headers: string[];
  rows: string[][];
};

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function cellText(markup: string) {
  return decodeHtml(
    markup
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, ' ')
      .replace(/<\/(?:div|p|li)\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

export async function getReinforcementPriceTable(): Promise<ReinforcementPriceTable> {
  const response = await fetch(`${STORE_URL}/collections/reinforcements`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`The Repton website returned ${response.status}.`);

  const html = await response.text();
  const tables = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) ?? [];
  const pricingTable = tables.find((table) => {
    const content = cellText(table).toUpperCase();
    return content.includes('AFRICAN STEEL') && content.includes('LANDCRAFT') && content.includes('BINDING WIRE');
  });

  if (!pricingTable) throw new Error('The live reinforcement price table could not be found.');

  const rowMarkup = pricingTable.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const parsedRows = rowMarkup
    .map((row) => (row.match(/<(?:th|td)\b[^>]*>[\s\S]*?<\/(?:th|td)>/gi) ?? []).map(cellText))
    .filter((row) => row.length > 0);

  if (parsedRows.length < 2) throw new Error('The live reinforcement price table is incomplete.');

  const headers = parsedRows[0];
  const rows = parsedRows.slice(1).filter((row) => row[0]);
  if (!headers.length || !rows.length) throw new Error('The live reinforcement price table is empty.');

  return { headers, rows };
}

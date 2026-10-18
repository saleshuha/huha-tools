export type LocalProduct = { asin: string; sku: string; title: string; quantity: number };
export type ListedProduct = { id: string; asin: string; sku: string; barcode: string; title: string; sale_price: number; list_price: number; publish_status: string; enabled: boolean; last_error: string | null };
export const productKey = (value: string) => value.trim().toUpperCase();

export function classifyProducts<T extends ListedProduct>(products: T[], inventory: LocalProduct[]) {
  const byAsin = new Map(inventory.map(item => [productKey(item.asin), item]));
  const bySku = new Map<string, LocalProduct[]>();
  for (const item of inventory) {
    const key = productKey(item.sku);
    if (key) bySku.set(key, [...(bySku.get(key) ?? []), item]);
  }
  const mapped: { product: T; inventory: LocalProduct }[] = [];
  const unmapped: T[] = [];
  const used = new Set<string>();
  for (const product of products) {
    const item = byAsin.get(productKey(product.asin));
    if (item) { mapped.push({ product, inventory: item }); used.add(productKey(item.asin)); }
    else unmapped.push(product);
  }
  const candidates = unmapped.map(product => {
    const options = [...new Map([...(bySku.get(productKey(product.sku)) ?? []), ...(bySku.get(productKey(product.barcode)) ?? [])].map(item => [productKey(item.asin), item])).values()].filter(item => !used.has(productKey(item.asin)));
    return { product, inventory: options.length === 1 ? options[0] : undefined };
  });
  const counts = new Map<string, number>();
  for (const pair of candidates) if (pair.inventory) {
    const key = productKey(pair.inventory.asin);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const matches: { product: T; inventory: LocalProduct }[] = [];
  const trendyolOnly: T[] = [];
  for (const pair of candidates) {
    if (pair.inventory && counts.get(productKey(pair.inventory.asin)) === 1) {
      matches.push({ product: pair.product, inventory: pair.inventory });
      used.add(productKey(pair.inventory.asin));
    } else trendyolOnly.push(pair.product);
  }
  return { mapped, matches, inventoryOnly: inventory.filter(item => !used.has(productKey(item.asin))), trendyolOnly };
}
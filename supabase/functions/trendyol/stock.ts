import { aggregateInventory, normalize, type InventoryRow } from "./domain.ts";

export type StockProduct = { id: string; asin: string; barcode: string; stock_sync_mapped: boolean; publish_status?: string; enabled?: boolean };
// Only persisted inventory links may send zero when their last inventory row is removed.
export function stockItems(products: StockProduct[], rows: InventoryRow[]) {
  const balances = new Map(aggregateInventory(rows).map(i => [i.asin, i.quantity]));
  return products.filter(p => p.stock_sync_mapped).map(p => ({
    barcode: p.barcode, quantity: balances.get(normalize(p.asin)) ?? 0,
  }));
}

export function stockBatchOutcome(result: { status?: string; items?: { status?: string; failureReasons?: unknown[] }[] }) {
  if (result.status !== "COMPLETED") return "submitted";
  return result.items?.some(i => i.status === "FAILED" || i.failureReasons?.length) ? "failed" : "completed";
}
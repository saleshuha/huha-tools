import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { aggregateInventory, normalize, planDeductions, type InventoryRow } from "../_shared/trendyol/domain.ts";
const rows: InventoryRow[] = [
  { id: "1", asin: " b0test ", sku: " new_sku ", quantity: 2, status: "in-stock", country: "KSA" },
  { id: "2", asin: "B0TEST", quantity: 3, status: "in-stock", country: "KSA" },
  { id: "3", asin: "B0TEST", quantity: 10, status: "reserved", country: "KSA" },
  { id: "4", asin: "B0TEST", quantity: 8, status: "in-stock", country: "UAE" },
  { id: "5", asin: "B0TEST", quantity: 8, status: "in-stock", country: "KSA", is_active: false },
];
Deno.test("Normalize marketplace SKU matching", () => assertEquals(normalize(" new_eda007843517a "), "NEW_EDA007843517A"));
Deno.test("Saudi stock aggregates serial rows, excludes reserved/disabled/other countries and deduplicates pages", () => {
  assertEquals(aggregateInventory([...rows, rows[0]])[0], { asin: "B0TEST", sku: "NEW_SKU", title: "B0TEST", quantity: 5 });
});
Deno.test("Multi-row allocation consumes exact order quantity", () => {
  assertEquals(planDeductions(rows, [{ asin: "b0test", quantity: 4 }]), [{ id: "1", quantity: 2 }, { id: "2", quantity: 2 }]);
});
Deno.test("Insufficient stock rejects the entire plan without mutating inventory", () => {
  assertThrows(() => planDeductions(rows, [{ asin: "B0TEST", quantity: 6 }]), Error, "Insufficient stock");
  assertEquals(rows[0].quantity, 2);
});
Deno.test("Repeated product lines share remaining stock instead of reusing it", () => {
  assertThrows(() => planDeductions(rows, [{ asin: "B0TEST", quantity: 3 }, { asin: "B0TEST", quantity: 3 }]), Error, "Insufficient stock");
});
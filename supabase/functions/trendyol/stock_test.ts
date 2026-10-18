import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { stockItems, stockBatchOutcome } from "./stock.ts";

Deno.test("Stock-only updates include every mapped marketplace status, without prices", () => {
  const products = ["approved", "pending-approval", "archived", "failed", "draft"].map((publish_status, i) => ({ id: String(i), asin: "B0TEST", barcode: String(i), publish_status, enabled: false, stock_sync_mapped: true }));
  assertEquals(stockItems(products, [{ id: "1", asin: " b0test ", quantity: 7, status: "in-stock", country: "KSA" }]), products.map(p => ({ barcode: p.barcode, quantity: 7 })));
});
Deno.test("Mapped products send zero on sellout or removal; unmapped products are excluded", () => {
  assertEquals(stockItems([{ id: "1", asin: "B0TEST", barcode: "mapped", stock_sync_mapped: true }, { id: "2", asin: "OTHER", barcode: "unmapped", stock_sync_mapped: false }], []), [{ barcode: "mapped", quantity: 0 }]);
});
Deno.test("Stock payload uses latest Saudi sellable total across serials", () => {
  const product = [{ id: "1", asin: "B0TEST", barcode: "mapped", stock_sync_mapped: true }];
  const rows = [{ id: "1", asin: "B0TEST", quantity: 2, status: "in-stock", country: "KSA" }, { id: "2", asin: "B0TEST", quantity: 3, status: "in-stock", country: "KSA" }];
  assertEquals(stockItems(product, rows), [{ barcode: "mapped", quantity: 5 }]);
  assertEquals(stockItems(product, [{ ...rows[0], quantity: 0 }, rows[1]]), [{ barcode: "mapped", quantity: 3 }]);
});
Deno.test("Batch acceptance is not completion and provider failures remain failed", () => {
  assertEquals(stockBatchOutcome({ status: "IN_PROGRESS" }), "submitted");
  assertEquals(stockBatchOutcome({ status: "COMPLETED", items: [{ status: "FAILED", failureReasons: ["Not listed"] }] }), "failed");
  assertEquals(stockBatchOutcome({ status: "COMPLETED", items: [{ status: "SUCCESS" }] }), "completed");
});
import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { classifyProducts, type ListedProduct } from "./matching";
const local = (asin: string, sku: string, quantity = 0) => ({ asin, sku, title: asin, quantity });
const remote = (id: string, asin: string, sku: string): ListedProduct => ({ id, asin, sku, barcode: sku, title: id, sale_price: 21, list_price: 25, publish_status: "approved", enabled: true, last_error: null });
describe("Trendyol product separation", () => {
  it("separates mapped, matching, inventory-only and Trendyol-only products", () => {
    const result = classifyProducts([remote("mapped", " b01 ", "SKU1"), remote("match", "SKU2", " sku2 "), remote("remote", "TY3", "TY3")], [local("B01", "SKU1", 5), local("B02", "SKU2", 0), local("B03", "SKU3", 2)]);
    deepStrictEqual(result.mapped.map(p => p.product.id), ["mapped"]);
    deepStrictEqual(result.matches.map(p => p.inventory.asin), ["B02"]);
    deepStrictEqual(result.inventoryOnly.map(p => p.asin), ["B03"]);
    deepStrictEqual(result.trendyolOnly.map(p => p.id), ["remote"]);
  });
  it("moves a confirmed SKU match into mapped products while preserving stock", () => {
    const result = classifyProducts([remote("confirmed", "B02", "SKU2")], [local("B02", "SKU2", 7)]);
    strictEqual(result.mapped[0].inventory.quantity, 7);
    strictEqual(result.matches.length, 0);
  });
  it("does not suggest ambiguous SKU mappings or reuse mapped inventory", () => {
    const result = classifyProducts([remote("one", "TY1", "SKU"), remote("two", "TY2", "SKU"), remote("saved", "B02", "OTHER"), remote("extra", "TY4", "OTHER")], [local("B01", "SKU"), local("B02", "OTHER")]);
    strictEqual(result.matches.length, 0);
    deepStrictEqual(result.trendyolOnly.map(p => p.id), ["one", "two", "extra"]);
    deepStrictEqual(result.inventoryOnly.map(p => p.asin), ["B01"]);
  });
  it("confirms all exact matches across pages without changing inventory quantities", () => {
    const inventory = Array.from({ length: 60 }, (_, i) => local(`B${i}`, `SKU${i}`, i + 1));
    const products = inventory.map((item, i) => remote(`${i}`, `TY${i}`, item.sku));
    const pairs = classifyProducts(products, inventory).matches;
    strictEqual(pairs.length, 60);
    const confirmed = classifyProducts(pairs.map(pair => ({ ...pair.product, asin: pair.inventory.asin })), inventory);
    strictEqual(confirmed.mapped.length, 60);
    strictEqual(confirmed.matches.length, 0);
    deepStrictEqual(confirmed.mapped.map(pair => pair.inventory.quantity), Array.from({ length: 60 }, (_, i) => i + 1));
  });
});
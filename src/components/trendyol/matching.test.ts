import { describe, it, expect } from "bun:test";
import { classifyProducts, type ListedProduct } from "./matching";
const local = (asin: string, sku: string, quantity = 0) => ({ asin, sku, title: asin, quantity });
const remote = (id: string, asin: string, sku: string): ListedProduct => ({ id, asin, sku, barcode: sku, title: id, sale_price: 21, list_price: 25, publish_status: "approved", enabled: true, last_error: null });
describe("Trendyol product separation", () => {
  it("separates mapped, matching, inventory-only and Trendyol-only products", () => {
    const result = classifyProducts([remote("mapped", " b01 ", "SKU1"), remote("match", "SKU2", " sku2 "), remote("remote", "TY3", "TY3")], [local("B01", "SKU1", 5), local("B02", "SKU2", 0), local("B03", "SKU3", 2)]);
    expect(result.mapped.map(p => p.product.id)).toEqual(["mapped"]);
    expect(result.matches.map(p => p.inventory.asin)).toEqual(["B02"]);
    expect(result.inventoryOnly.map(p => p.asin)).toEqual(["B03"]);
    expect(result.trendyolOnly.map(p => p.id)).toEqual(["remote"]);
  });
  it("moves a confirmed SKU match into mapped products while preserving stock", () => {
    const result = classifyProducts([remote("confirmed", "B02", "SKU2")], [local("B02", "SKU2", 7)]);
    expect(result.mapped[0].inventory.quantity).toBe(7);
    expect(result.matches).toHaveLength(0);
  });
  it("does not suggest ambiguous SKU mappings or reuse mapped inventory", () => {
    const result = classifyProducts([remote("one", "TY1", "SKU"), remote("two", "TY2", "SKU"), remote("saved", "B02", "OTHER"), remote("extra", "TY4", "OTHER")], [local("B01", "SKU"), local("B02", "OTHER")]);
    expect(result.matches).toHaveLength(0);
    expect(result.trendyolOnly.map(p => p.id)).toEqual(["one", "two", "extra"]);
    expect(result.inventoryOnly.map(p => p.asin)).toEqual(["B01"]);
  });
});
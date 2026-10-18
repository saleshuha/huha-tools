export type PricingFormula = { percentage: number; fixed_sar: number };
export type DualPricingFormula = PricingFormula & { original_percentage: number; original_fixed_sar: number };
export function calculatedPrices(price: number | null, formula: DualPricingFormula) {
  const salePrice = calculatedPrice(price, formula);
  const listPrice = calculatedPrice(price, { percentage: formula.original_percentage, fixed_sar: formula.original_fixed_sar });
  return { salePrice, listPrice, valid: salePrice !== null && listPrice !== null && listPrice >= salePrice };
}
export function lookupAsins(products: { id: string; asin: string }[], selected: Set<string> | null): string[] {
  return [...new Set(products.filter(p => selected === null || selected.has(p.id)).map(p => p.asin.trim().toUpperCase()).filter(asin => /^[A-Z0-9]{10}$/.test(asin)))];
}
export function pendingLookupAsins(products: { id: string; asin: string }[], selected: Set<string> | null, saved: { asin: string }[]): string[] {
  const fetched = new Set(saved.map(row => row.asin.trim().toUpperCase()));
  return lookupAsins(products, selected).filter(asin => !fetched.has(asin));
}
export function calculatedPrice(price: number | null, formula: PricingFormula): number | null {
  if (price === null || !Number.isFinite(price) || price <= 0 || !Number.isFinite(formula.percentage) || !Number.isFinite(formula.fixed_sar) || formula.percentage < -100 || formula.percentage > 1000 || Math.abs(formula.fixed_sar) > 10000) return null;
  const result = Math.round((price * (1 + formula.percentage / 100) + formula.fixed_sar + Number.EPSILON) * 100) / 100;
  return Number.isFinite(result) && result > 0 ? result : null;
}
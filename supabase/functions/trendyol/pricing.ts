export type PricingFormula = { percentage: number; fixed_sar: number };
export function calculatedPrice(price: number | null, formula: PricingFormula): number | null {
  if (price === null || !Number.isFinite(price) || price <= 0 || !Number.isFinite(formula.percentage) || !Number.isFinite(formula.fixed_sar) || formula.percentage < -100 || formula.percentage > 1000 || Math.abs(formula.fixed_sar) > 10000) return null;
  const result = Math.round((price * (1 + formula.percentage / 100) + formula.fixed_sar + Number.EPSILON) * 100) / 100;
  return Number.isFinite(result) && result > 0 ? result : null;
}
export type InventoryRow = { id: string; asin: string; sku?: string | null; title?: string | null; quantity: number; status: string; is_active?: boolean | null; country: string };
export const normalize = (value: string) => value.trim().toUpperCase();
export function aggregateInventory(rows: InventoryRow[]) {
  const seen = new Set<string>();
  const groups = new Map<string, { asin: string; sku: string; title: string; quantity: number }>();
  for (const row of rows) {
    if (seen.has(row.id) || row.country !== "KSA" || row.is_active === false) continue;
    seen.add(row.id);
    const asin = normalize(row.asin);
    const group = groups.get(asin) ?? { asin, sku: "", title: asin, quantity: 0 };
    if (row.sku?.trim()) group.sku = normalize(row.sku);
    if (row.title) group.title = row.title;
    if (row.status === "in-stock") group.quantity += Math.max(0, row.quantity);
    groups.set(asin, group);
  }
  return [...groups.values()];
}

export function planDeductions(rows: InventoryRow[], lines: { asin: string; quantity: number }[]) {
  const remaining = new Map(rows.map(row => [row.id, row.quantity]));
  const allocations: { id: string; quantity: number }[] = [];
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error("Invalid quantity");
    let needed = line.quantity;
    for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
      if (row.country !== "KSA" || row.is_active === false || row.status !== "in-stock" || normalize(row.asin) !== normalize(line.asin)) continue;
      const available = remaining.get(row.id) ?? 0;
      const quantity = Math.min(needed, Math.max(0, available));
      if (quantity) allocations.push({ id: row.id, quantity });
      remaining.set(row.id, available - quantity);
      needed -= quantity;
      if (!needed) break;
    }
    if (needed) throw new Error("Insufficient stock");
  }
  return allocations;
}
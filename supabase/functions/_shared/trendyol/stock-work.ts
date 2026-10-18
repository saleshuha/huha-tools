// Bound UUID filters below gateway URL limits and per-invocation write time.
export const STOCK_WORK_BATCH_SIZE = 100;
export function stockWorkRows<T extends { user_id: string }>(pending: T[]): T[] {
  const userId = pending[0]?.user_id;
  return pending.filter(row => row.user_id === userId).slice(0, STOCK_WORK_BATCH_SIZE);
}
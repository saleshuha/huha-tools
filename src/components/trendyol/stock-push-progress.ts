export type StockTarget = { id: string; version: number };
export type StockQueueRow = StockTarget & { state: string; last_error: string | null };
export function stockPushProgress(targets: StockTarget[], rows: StockQueueRow[]) {
  const byId = new Map(rows.map(row => [row.id, row]));
  let completed = 0, confirming = 0, failed = 0;
  for (const target of targets) {
    const row = byId.get(target.id);
    if (!row || row.version < target.version) continue;
    if (row.state === "completed") completed++;
    else if (row.state === "failed") failed++;
    else if (row.state === "submitted") confirming++;
  }
  return { total: targets.length, completed, confirming, failed, sending: targets.length - completed - confirming - failed, done: completed + failed === targets.length };
}
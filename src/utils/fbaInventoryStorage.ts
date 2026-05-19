// Supabase storage for FBA Inventory data persistence (multi-file)
import { supabase } from '@/integrations/supabase/client';

export interface FBAInventoryItem {
  asin: string;
  quantity: number;
  sku?: string;
  fnsku?: string;
  title?: string;
  condition?: string;
}

export interface FBAFileSummary {
  fileName: string;
  itemCount: number;
  totalQuantity: number;
  lastModified: string;
}

export interface StoredFBAInventory {
  items: FBAInventoryItem[];
  files: FBAFileSummary[];
  lastModified: string;
  totalItems: number;
  totalQuantity: number;
}

/**
 * Append rows for a single file. If the same file name already exists for the user,
 * those rows are replaced (so re-uploading the same file refreshes instead of duplicating).
 * Other files are untouched.
 */
export async function appendFBAInventory(
  items: FBAInventoryItem[],
  fileName?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const effectiveName = fileName || `upload-${new Date().toISOString()}`;

  // Replace-by-filename: delete previous rows with same file_name for this user
  await supabase
    .from('fba_inventory')
    .delete()
    .eq('user_id', user.id)
    .eq('file_name', effectiveName);

  const chunkSize = 500;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const rows = chunk.map(item => ({
      user_id: user.id,
      asin: item.asin,
      quantity: item.quantity,
      sku: item.sku || null,
      fnsku: item.fnsku || null,
      title: item.title || null,
      condition: item.condition || null,
      file_name: effectiveName,
    }));
    const { error } = await supabase.from('fba_inventory').insert(rows);
    if (error) {
      console.error('Failed to save FBA inventory chunk:', error);
      throw error;
    }
  }
}

export async function loadFBAInventory(): Promise<StoredFBAInventory | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('fba_inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to load FBA inventory:', error);
      return null;
    }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (allRows.length === 0) return null;

  const items: FBAInventoryItem[] = allRows.map(row => ({
    asin: row.asin,
    quantity: row.quantity,
    sku: row.sku || undefined,
    fnsku: row.fnsku || undefined,
    title: row.title || undefined,
    condition: row.condition || undefined,
  }));

  // Group per file
  const fileMap = new Map<string, FBAFileSummary>();
  for (const row of allRows) {
    const name = row.file_name || '(unnamed)';
    const existing = fileMap.get(name);
    const updated = row.updated_at || row.created_at || '';
    if (existing) {
      existing.itemCount += 1;
      existing.totalQuantity += row.quantity || 0;
      if (updated > existing.lastModified) existing.lastModified = updated;
    } else {
      fileMap.set(name, {
        fileName: name,
        itemCount: 1,
        totalQuantity: row.quantity || 0,
        lastModified: updated,
      });
    }
  }
  const files = Array.from(fileMap.values()).sort((a, b) =>
    b.lastModified.localeCompare(a.lastModified)
  );

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const lastModified = allRows.reduce(
    (latest: string, row: any) => (row.updated_at > latest ? row.updated_at : latest),
    allRows[0].updated_at
  );

  return {
    items,
    files,
    lastModified,
    totalItems: items.length,
    totalQuantity,
  };
}

export async function deleteFBAByFile(fileName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { error } = await supabase
    .from('fba_inventory')
    .delete()
    .eq('user_id', user.id)
    .eq('file_name', fileName);
  if (error) {
    console.error('Failed to delete FBA file:', error);
    throw error;
  }
}

export async function clearFBAInventory(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { error } = await supabase
    .from('fba_inventory')
    .delete()
    .eq('user_id', user.id);
  if (error) {
    console.error('Failed to clear FBA inventory:', error);
    throw error;
  }
}

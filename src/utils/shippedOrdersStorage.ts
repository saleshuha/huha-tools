// Supabase storage for Shipped Orders data persistence (multi-file)
import { supabase } from '@/integrations/supabase/client';

export interface ShippedOrder {
  asin: string;
  quantity: number;
  sku?: string;
  title?: string;
}

export interface ShippedFileSummary {
  fileName: string;
  itemCount: number;
  totalQuantity: number;
  lastModified: string;
}

export interface StoredShippedOrders {
  items: ShippedOrder[];
  files: ShippedFileSummary[];
  lastModified: string;
  totalItems: number;
  totalQuantity: number;
}

export async function appendShippedOrders(
  items: ShippedOrder[],
  fileName?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const effectiveName = fileName || `upload-${new Date().toISOString()}`;

  await supabase
    .from('shipped_orders')
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
      title: item.title || null,
      file_name: effectiveName,
    }));
    const { error } = await supabase.from('shipped_orders').insert(rows);
    if (error) {
      console.error('Failed to save shipped orders chunk:', error);
      throw error;
    }
  }
}

export async function loadShippedOrders(): Promise<StoredShippedOrders | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('shipped_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to load shipped orders:', error);
      return null;
    }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (allRows.length === 0) return null;

  const items: ShippedOrder[] = allRows.map(row => ({
    asin: row.asin,
    quantity: row.quantity,
    sku: row.sku || undefined,
    title: row.title || undefined,
  }));

  const fileMap = new Map<string, ShippedFileSummary>();
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

export async function deleteShippedByFile(fileName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { error } = await supabase
    .from('shipped_orders')
    .delete()
    .eq('user_id', user.id)
    .eq('file_name', fileName);
  if (error) {
    console.error('Failed to delete shipped file:', error);
    throw error;
  }
}

export async function clearShippedOrders(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { error } = await supabase
    .from('shipped_orders')
    .delete()
    .eq('user_id', user.id);
  if (error) {
    console.error('Failed to clear shipped orders:', error);
    throw error;
  }
}

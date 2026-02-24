// Supabase storage for FBA Inventory data persistence
import { supabase } from '@/integrations/supabase/client';

export interface FBAInventoryItem {
  asin: string;
  quantity: number;
  sku?: string;
  fnsku?: string;
  title?: string;
  condition?: string;
}

export interface StoredFBAInventory {
  items: FBAInventoryItem[];
  fileName?: string;
  lastModified: string;
  totalItems: number;
  totalQuantity: number;
}

export async function saveFBAInventory(
  items: FBAInventoryItem[],
  fileName?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Clear existing data first
  await supabase
    .from('fba_inventory')
    .delete()
    .eq('user_id', user.id);

  // Batch insert in chunks of 500
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
      file_name: fileName || null,
    }));

    const { error } = await supabase
      .from('fba_inventory')
      .insert(rows);

    if (error) {
      console.error('Failed to save FBA inventory chunk:', error);
      throw error;
    }
  }
}

export async function loadFBAInventory(): Promise<StoredFBAInventory | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all rows with pagination
  let allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('fba_inventory')
      .select('*')
      .eq('user_id', user.id)
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

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const fileName = allRows[0]?.file_name || undefined;
  const lastModified = allRows.reduce((latest: string, row: any) => {
    return row.updated_at > latest ? row.updated_at : latest;
  }, allRows[0].updated_at);

  return {
    items,
    fileName,
    lastModified,
    totalItems: items.length,
    totalQuantity,
  };
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

// Supabase storage for Shipped Orders data persistence
import { supabase } from '@/integrations/supabase/client';

export interface ShippedOrder {
  asin: string;
  quantity: number;
  sku?: string;
  title?: string;
}

export interface StoredShippedOrders {
  items: ShippedOrder[];
  fileName?: string;
  lastModified: string;
  totalItems: number;
  totalQuantity: number;
}

export async function saveShippedOrders(
  items: ShippedOrder[],
  fileName?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Clear existing data first
  await supabase
    .from('shipped_orders')
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
      title: item.title || null,
      file_name: fileName || null,
    }));

    const { error } = await supabase
      .from('shipped_orders')
      .insert(rows);

    if (error) {
      console.error('Failed to save shipped orders chunk:', error);
      throw error;
    }
  }
}

export async function loadShippedOrders(): Promise<StoredShippedOrders | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all rows (handle >1000 with pagination)
  let allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('shipped_orders')
      .select('*')
      .eq('user_id', user.id)
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

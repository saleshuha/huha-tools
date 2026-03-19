import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface AuditSession {
  id: string;
  name: string;
  country: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  total_system_items: number;
  total_scanned: number;
  total_missing: number;
  created_at: string;
}

export interface AuditScan {
  id: string;
  session_id: string;
  inventory_item_id: string | null;
  scanned_barcode: string;
  matched_serial_number: string | null;
  matched_asin: string | null;
  scanned_quantity: number;
  match_status: 'matched' | 'unmatched' | 'duplicate';
  scanned_at: string;
}

export interface InventoryItem {
  id: string;
  serial_number: string;
  additional_serial_numbers: string[] | null;
  asin: string;
  sku: string | null;
  title: string | null;
  quantity: number;
  status: string;
  is_active: boolean;
}

export function useStockAudit() {
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [activeSession, setActiveSession] = useState<AuditSession | null>(null);
  const [scans, setScans] = useState<AuditScan[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const { toast } = useToast();
  const { selectedCountry: country } = useCountry();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_audit_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSessions((data || []) as unknown as AuditSession[]);
    } catch (err: any) {
      toast({ title: 'Error loading sessions', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createSession = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Count active inventory items for this country
      const { count, error: countErr } = await supabase
        .from('asin_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('country', country)
        .eq('is_active', true)
        .gt('quantity', 0);
      if (countErr) throw countErr;

      const { data, error } = await supabase
        .from('stock_audit_sessions')
        .insert({
          user_id: user.id,
          name,
          country,
          total_system_items: count || 0,
        })
        .select()
        .single();
      if (error) throw error;

      const session = data as unknown as AuditSession;
      setActiveSession(session);
      setSessions(prev => [session, ...prev]);
      setScans([]);

      // Load inventory items for matching
      await loadInventoryItems(country);

      toast({ title: 'Audit Started', description: `Session "${name}" created with ${count || 0} system items` });
      return session;
    } catch (err: any) {
      toast({ title: 'Error creating session', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [country, toast]);

  const loadInventoryItems = async (c: string) => {
    // Batch fetch all inventory items
    const all: InventoryItem[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('asin_inventory')
        .select('id, serial_number, additional_serial_numbers, asin, sku, title, quantity, status, is_active')
        .eq('country', c)
        .eq('is_active', true)
        .range(from, from + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...(data as unknown as InventoryItem[]));
      if (data.length < batchSize) break;
      from += batchSize;
    }
    setInventoryItems(all);
    return all;
  };

  const resumeSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const { data: session, error: sErr } = await supabase
        .from('stock_audit_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (sErr) throw sErr;

      const s = session as unknown as AuditSession;
      setActiveSession(s);

      // Load scans
      const allScans: AuditScan[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('stock_audit_scans')
          .select('*')
          .eq('session_id', sessionId)
          .order('scanned_at', { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allScans.push(...(data as unknown as AuditScan[]));
        if (data.length < 1000) break;
        from += 1000;
      }
      setScans(allScans);

      await loadInventoryItems(s.country);
      toast({ title: 'Session Resumed', description: `Loaded ${allScans.length} scans` });
    } catch (err: any) {
      toast({ title: 'Error resuming session', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const resolveBarcode = useCallback((barcode: string): { item: InventoryItem | null; matchType: string } => {
    // 1. Direct serial number match
    const directMatch = inventoryItems.find(
      i => i.serial_number === barcode
    );
    if (directMatch) return { item: directMatch, matchType: 'serial' };

    // 2. Additional serial numbers
    const additionalMatch = inventoryItems.find(
      i => i.additional_serial_numbers?.includes(barcode)
    );
    if (additionalMatch) return { item: additionalMatch, matchType: 'additional_serial' };

    return { item: null, matchType: 'none' };
  }, [inventoryItems]);

  const scanBarcode = useCallback(async (barcode: string) => {
    if (!activeSession) return null;
    setScanLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check for duplicate scan in this session
      const isDuplicate = scans.some(
        s => s.scanned_barcode === barcode && s.match_status !== 'unmatched'
      );

      // Resolve barcode
      const { item } = resolveBarcode(barcode);

      // If not found in inventory, check product_barcodes table
      let resolvedItem = item;
      if (!resolvedItem) {
        const { data: barcodeData } = await supabase
          .from('product_barcodes')
          .select('asin, sku_code')
          .eq('barcode', barcode)
          .limit(1);

        if (barcodeData && barcodeData.length > 0) {
          const pb = barcodeData[0];
          // Find inventory item by ASIN
          if (pb.asin) {
            resolvedItem = inventoryItems.find(i => i.asin === pb.asin) || null;
          }
        }
      }

      const matchStatus: 'matched' | 'unmatched' | 'duplicate' = isDuplicate
        ? 'duplicate'
        : resolvedItem
          ? 'matched'
          : 'unmatched';

      const scanRecord = {
        session_id: activeSession.id,
        user_id: user.id,
        scanned_barcode: barcode,
        inventory_item_id: resolvedItem?.id || null,
        matched_serial_number: resolvedItem?.serial_number || null,
        matched_asin: resolvedItem?.asin || null,
        match_status: matchStatus,
        scanned_quantity: 1,
      };

      const { data, error } = await supabase
        .from('stock_audit_scans')
        .insert(scanRecord)
        .select()
        .single();
      if (error) throw error;

      const newScan = data as unknown as AuditScan;
      setScans(prev => [newScan, ...prev]);

      // Update session total_scanned
      if (matchStatus === 'matched') {
        const newTotal = (activeSession.total_scanned || 0) + 1;
        await supabase
          .from('stock_audit_sessions')
          .update({ total_scanned: newTotal, updated_at: new Date().toISOString() })
          .eq('id', activeSession.id);
        setActiveSession(prev => prev ? { ...prev, total_scanned: newTotal } : null);
      }

      return { scan: newScan, item: resolvedItem, matchStatus };
    } catch (err: any) {
      toast({ title: 'Scan Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setScanLoading(false);
    }
  }, [activeSession, scans, resolveBarcode, inventoryItems, toast]);

  const getScannedItemIds = useCallback(() => {
    const ids = new Set<string>();
    scans.forEach(s => {
      if (s.match_status === 'matched' && s.inventory_item_id) {
        ids.add(s.inventory_item_id);
      }
    });
    return ids;
  }, [scans]);

  const getMissingItems = useCallback(() => {
    const scannedIds = getScannedItemIds();
    return inventoryItems.filter(i => i.quantity > 0 && !scannedIds.has(i.id));
  }, [inventoryItems, getScannedItemIds]);

  const getVerifiedItems = useCallback(() => {
    const scannedIds = getScannedItemIds();
    return inventoryItems.filter(i => scannedIds.has(i.id));
  }, [inventoryItems, getScannedItemIds]);

  const getUnmatchedScans = useCallback(() => {
    return scans.filter(s => s.match_status === 'unmatched');
  }, [scans]);

  const finalizeAudit = useCallback(async () => {
    if (!activeSession) return false;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const scannedIds = getScannedItemIds();
      const missing = getMissingItems();

      // Zero out missing items in batches
      const missingIds = missing.map(i => i.id);
      for (let i = 0; i < missingIds.length; i += 50) {
        const batch = missingIds.slice(i, i + 50);
        const { error } = await supabase
          .from('asin_inventory')
          .update({ quantity: 0, updated_at: new Date().toISOString() })
          .in('id', batch);
        if (error) throw error;
      }

      // Update session as completed
      const { error: sessionErr } = await supabase
        .from('stock_audit_sessions')
        .update({
          status: 'completed' as any,
          completed_at: new Date().toISOString(),
          total_missing: missing.length,
          total_scanned: scannedIds.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);
      if (sessionErr) throw sessionErr;

      setActiveSession(prev => prev ? {
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_missing: missing.length,
        total_scanned: scannedIds.size,
      } : null);

      toast({
        title: 'Audit Finalized',
        description: `${scannedIds.size} items verified, ${missing.length} items zeroed out`,
      });
      return true;
    } catch (err: any) {
      toast({ title: 'Finalization Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeSession, getScannedItemIds, getMissingItems, toast]);

  const cancelSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      await supabase
        .from('stock_audit_sessions')
        .update({ status: 'cancelled' as any, updated_at: new Date().toISOString() })
        .eq('id', activeSession.id);
      setActiveSession(null);
      setScans([]);
      toast({ title: 'Session Cancelled' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [activeSession, toast]);

  const closeSession = useCallback(() => {
    setActiveSession(null);
    setScans([]);
  }, []);

  return {
    sessions,
    activeSession,
    scans,
    inventoryItems,
    loading,
    scanLoading,
    fetchSessions,
    createSession,
    resumeSession,
    scanBarcode,
    getScannedItemIds,
    getMissingItems,
    getVerifiedItems,
    getUnmatchedScans,
    finalizeAudit,
    cancelSession,
    closeSession,
  };
}

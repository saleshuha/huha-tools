import { useState, useCallback, useMemo } from 'react';
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

export interface AsinGroup {
  asin: string;
  title: string | null;
  sku: string | null;
  systemQty: number;
  scannedQty: number;
  itemIds: string[];
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

  // Group inventory by ASIN with system quantities
  const asinGroups = useMemo(() => {
    const groups = new Map<string, AsinGroup>();
    for (const item of inventoryItems) {
      const existing = groups.get(item.asin);
      if (existing) {
        existing.systemQty += item.quantity;
        existing.itemIds.push(item.id);
      } else {
        groups.set(item.asin, {
          asin: item.asin,
          title: item.title,
          sku: item.sku,
          systemQty: item.quantity,
          scannedQty: 0,
          itemIds: [item.id],
        });
      }
    }
    // Calculate scanned qty per ASIN
    for (const scan of scans) {
      if (scan.matched_asin && scan.match_status === 'matched') {
        const group = groups.get(scan.matched_asin);
        if (group) {
          group.scannedQty += scan.scanned_quantity || 1;
        }
      }
    }
    return groups;
  }, [inventoryItems, scans]);

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

      // Count unique ASINs with active stock
      const items = await loadInventoryItems(country);
      const uniqueAsins = new Set(items.filter(i => i.quantity > 0).map(i => i.asin));

      const { data, error } = await supabase
        .from('stock_audit_sessions')
        .insert({
          user_id: user.id,
          name,
          country,
          total_system_items: uniqueAsins.size,
        })
        .select()
        .single();
      if (error) throw error;

      const session = data as unknown as AuditSession;
      setActiveSession(session);
      setSessions(prev => [session, ...prev]);
      setScans([]);

      toast({ title: 'Audit Started', description: `Session "${name}" created with ${uniqueAsins.size} unique ASINs` });
      return session;
    } catch (err: any) {
      toast({ title: 'Error creating session', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [country, toast]);

  const loadInventoryItems = async (c: string) => {
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

  // Resolve barcode: ASIN → SKU → Serial Number, then product_barcodes fallback
  const resolveBarcode = useCallback((barcode: string): { asin: string | null; title: string | null } => {
    const normalised = barcode.trim();

    // 1. Direct ASIN match
    const asinMatch = inventoryItems.find(i => i.asin === normalised);
    if (asinMatch) return { asin: asinMatch.asin, title: asinMatch.title };

    // 2. SKU match
    const skuMatch = inventoryItems.find(i => i.sku && i.sku === normalised);
    if (skuMatch) return { asin: skuMatch.asin, title: skuMatch.title };

    // 3. Serial number match (primary or additional)
    const serialMatch = inventoryItems.find(i =>
      i.serial_number === normalised ||
      (i.additional_serial_numbers && i.additional_serial_numbers.includes(normalised))
    );
    if (serialMatch) return { asin: serialMatch.asin, title: serialMatch.title };

    return { asin: null, title: null };
  }, [inventoryItems]);

  const scanBarcode = useCallback(async (barcode: string, quantity: number = 1) => {
    if (!activeSession) return null;
    setScanLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Resolve barcode to ASIN
      let { asin, title } = resolveBarcode(barcode);

      // Fallback: check product_barcodes table
      if (!asin) {
        const { data: barcodeData } = await supabase
          .from('product_barcodes')
          .select('asin, sku_code')
          .eq('barcode', barcode)
          .limit(1);

        if (barcodeData && barcodeData.length > 0 && barcodeData[0].asin) {
          const found = inventoryItems.find(i => i.asin === barcodeData[0].asin);
          if (found) {
            asin = found.asin;
            title = found.title;
          }
        }
      }

      const matchStatus: 'matched' | 'unmatched' = asin ? 'matched' : 'unmatched';

      // Get first inventory item for this ASIN (for inventory_item_id reference)
      const firstItem = asin ? inventoryItems.find(i => i.asin === asin) : null;

      const scanRecord = {
        session_id: activeSession.id,
        user_id: user.id,
        scanned_barcode: barcode,
        inventory_item_id: firstItem?.id || null,
        matched_serial_number: firstItem?.serial_number || null,
        matched_asin: asin,
        match_status: matchStatus,
        scanned_quantity: quantity,
      };

      const { data, error } = await supabase
        .from('stock_audit_scans')
        .insert(scanRecord)
        .select()
        .single();
      if (error) throw error;

      const newScan = data as unknown as AuditScan;
      setScans(prev => [newScan, ...prev]);

      // Calculate new scanned qty for this ASIN
      let totalScannedForAsin = quantity;
      if (asin) {
        totalScannedForAsin = scans
          .filter(s => s.matched_asin === asin && s.match_status === 'matched')
          .reduce((sum, s) => sum + (s.scanned_quantity || 1), 0) + quantity;
      }

      // Get system qty for this ASIN
      const systemQty = asin
        ? inventoryItems.filter(i => i.asin === asin).reduce((sum, i) => sum + i.quantity, 0)
        : 0;

      const isOverScan = totalScannedForAsin > systemQty;

      // Vibration feedback
      if (navigator.vibrate) {
        navigator.vibrate(matchStatus === 'matched' ? 100 : [100, 50, 100]);
      }

      // Update session scanned count (unique ASINs with scans)
      if (matchStatus === 'matched') {
        const scannedAsins = new Set(
          [...scans, newScan]
            .filter(s => s.match_status === 'matched' && s.matched_asin)
            .map(s => s.matched_asin!)
        );
        await supabase
          .from('stock_audit_sessions')
          .update({ total_scanned: scannedAsins.size, updated_at: new Date().toISOString() })
          .eq('id', activeSession.id);
        setActiveSession(prev => prev ? { ...prev, total_scanned: scannedAsins.size } : null);
      }

      return {
        scan: newScan,
        asin,
        title,
        matchStatus,
        scannedQty: totalScannedForAsin,
        systemQty,
        isOverScan,
      };
    } catch (err: any) {
      toast({ title: 'Scan Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setScanLoading(false);
    }
  }, [activeSession, scans, resolveBarcode, inventoryItems, toast]);

  // Adjust quantity for a specific ASIN (add +/- scans)
  const adjustAsinQty = useCallback(async (asin: string, newTotalQty: number) => {
    if (!activeSession) return;
    
    const currentQty = scans
      .filter(s => s.matched_asin === asin && s.match_status === 'matched')
      .reduce((sum, s) => sum + (s.scanned_quantity || 1), 0);

    const diff = newTotalQty - currentQty;
    if (diff === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const firstItem = inventoryItems.find(i => i.asin === asin);

      if (diff > 0) {
        // Add a scan with the difference
        const { data, error } = await supabase
          .from('stock_audit_scans')
          .insert({
            session_id: activeSession.id,
            user_id: user.id,
            scanned_barcode: asin,
            inventory_item_id: firstItem?.id || null,
            matched_serial_number: firstItem?.serial_number || null,
            matched_asin: asin,
            match_status: 'matched' as any,
            scanned_quantity: diff,
          })
          .select()
          .single();
        if (error) throw error;
        setScans(prev => [data as unknown as AuditScan, ...prev]);
      } else {
        // Remove scans to reduce qty (remove from most recent)
        let toRemove = Math.abs(diff);
        const asinScans = scans
          .filter(s => s.matched_asin === asin && s.match_status === 'matched')
          .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());

        const idsToDelete: string[] = [];
        for (const scan of asinScans) {
          if (toRemove <= 0) break;
          if (scan.scanned_quantity <= toRemove) {
            idsToDelete.push(scan.id);
            toRemove -= scan.scanned_quantity;
          } else {
            // Partially reduce this scan
            await supabase
              .from('stock_audit_scans')
              .update({ scanned_quantity: scan.scanned_quantity - toRemove })
              .eq('id', scan.id);
            toRemove = 0;
          }
        }

        if (idsToDelete.length > 0) {
          await supabase.from('stock_audit_scans').delete().in('id', idsToDelete);
        }

        // Reload scans
        const { data: updatedScans } = await supabase
          .from('stock_audit_scans')
          .select('*')
          .eq('session_id', activeSession.id)
          .order('scanned_at', { ascending: false });
        setScans((updatedScans || []) as unknown as AuditScan[]);
      }
    } catch (err: any) {
      toast({ title: 'Adjustment Error', description: err.message, variant: 'destructive' });
    }
  }, [activeSession, scans, inventoryItems, toast]);

  // Get grouped ASIN data for review
  const getAsinGroups = useCallback((): AsinGroup[] => {
    return Array.from(asinGroups.values());
  }, [asinGroups]);

  const getVerifiedAsins = useCallback((): AsinGroup[] => {
    return Array.from(asinGroups.values()).filter(g => g.scannedQty > 0);
  }, [asinGroups]);

  const getFullyVerifiedAsins = useCallback((): AsinGroup[] => {
    return Array.from(asinGroups.values()).filter(g => g.scannedQty >= g.systemQty && g.systemQty > 0);
  }, [asinGroups]);

  const getPartiallyScannedAsins = useCallback((): AsinGroup[] => {
    return Array.from(asinGroups.values()).filter(g => g.scannedQty > 0 && g.scannedQty < g.systemQty);
  }, [asinGroups]);

  const getMissingAsins = useCallback((): AsinGroup[] => {
    return Array.from(asinGroups.values()).filter(g => g.scannedQty === 0 && g.systemQty > 0);
  }, [asinGroups]);

  const getUnmatchedScans = useCallback(() => {
    return scans.filter(s => s.match_status === 'unmatched');
  }, [scans]);

  const finalizeAudit = useCallback(async () => {
    if (!activeSession) return false;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const groups = Array.from(asinGroups.values());

      // For each ASIN group, update inventory quantities
      for (const group of groups) {
        if (group.scannedQty !== group.systemQty) {
          // Distribute scanned qty across inventory items for this ASIN
          let remaining = group.scannedQty;
          for (const itemId of group.itemIds) {
            const item = inventoryItems.find(i => i.id === itemId);
            if (!item) continue;

            if (remaining <= 0) {
              // Zero out this item
              await supabase
                .from('asin_inventory')
                .update({ quantity: 0, updated_at: new Date().toISOString() })
                .eq('id', itemId);
            } else {
              const assignQty = Math.min(remaining, item.quantity > 0 ? item.quantity : remaining);
              await supabase
                .from('asin_inventory')
                .update({ quantity: assignQty, updated_at: new Date().toISOString() })
                .eq('id', itemId);
              remaining -= assignQty;
            }
          }
        }
      }

      const verified = groups.filter(g => g.scannedQty > 0);
      const missing = groups.filter(g => g.scannedQty === 0 && g.systemQty > 0);

      // Update session as completed
      const { error: sessionErr } = await supabase
        .from('stock_audit_sessions')
        .update({
          status: 'completed' as any,
          completed_at: new Date().toISOString(),
          total_missing: missing.length,
          total_scanned: verified.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);
      if (sessionErr) throw sessionErr;

      setActiveSession(prev => prev ? {
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_missing: missing.length,
        total_scanned: verified.length,
      } : null);

      toast({
        title: 'Audit Finalized',
        description: `${verified.length} ASINs verified, ${missing.length} ASINs zeroed out`,
      });
      return true;
    } catch (err: any) {
      toast({ title: 'Finalization Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeSession, asinGroups, inventoryItems, toast]);

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
    adjustAsinQty,
    getAsinGroups,
    getVerifiedAsins,
    getFullyVerifiedAsins,
    getPartiallyScannedAsins,
    getMissingAsins,
    getUnmatchedScans,
    finalizeAudit,
    cancelSession,
    closeSession,
  };
}

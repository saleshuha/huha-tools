import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MonthlySale {
  id: string;
  asin: string;
  sku: string | null;
  title: string | null;
  country: string;
  year: number;
  month: number;
  shipped_qty: number;
}

export interface UploadLock {
  id: string;
  country: string;
  year: number;
  month: number;
  total_asins: number;
  total_qty: number;
  locked_at: string;
}

export type HealthStatus = 'growing' | 'stable' | 'declining' | 'inactive' | 'new';

export interface AsinHealth {
  asin: string;
  sku: string | null;
  title: string | null;
  country: string;
  status: HealthStatus;
  monthlyData: { year: number; month: number; qty: number }[];
  recentAvg: number;
  priorAvg: number;
  changePercent: number;
  totalShipped: number;
  lastActiveMonth: string;
}

// Batch-fetch all rows, bypassing the 1000-row default limit
async function fetchAllRows<T extends { id: string }>(
  query: () => any,
  batchSize = 1000
): Promise<T[]> {
  const seen = new Set<string>();
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await query()
      .range(from, from + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data as T[]) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        all.push(row);
      }
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }

  return all;
}

export function useAsinSalesHealth(selectedCountry: string) {
  const [sales, setSales] = useState<MonthlySale[]>([]);
  const [locks, setLocks] = useState<UploadLock[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Batch-fetch sales (may exceed 1000 rows)
      const salesData = await fetchAllRows<MonthlySale>(() =>
        supabase
          .from('amazon_monthly_sales')
          .select('*')
          .eq('country', selectedCountry)
          .order('year', { ascending: true })
          .order('month', { ascending: true })
          .order('id', { ascending: true })
      );

      // Locks are always small, single fetch is fine
      const { data: locksData, error: locksErr } = await supabase
        .from('amazon_monthly_upload_locks')
        .select('*')
        .eq('country', selectedCountry)
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (locksErr) throw locksErr;

      setSales(salesData);
      setLocks((locksData as any[]) || []);
    } catch (err: any) {
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCountry]);

  const uploadMonthlyData = async (
    rows: { asin: string; sku?: string; title?: string; shipped_qty: number }[],
    year: number,
    month: number,
    country: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = rows.map(r => ({
      user_id: user.id,
      asin: r.asin,
      sku: r.sku || null,
      title: r.title || null,
      country,
      year,
      month,
      shipped_qty: r.shipped_qty,
    }));

    const { error: salesError } = await supabase
      .from('amazon_monthly_sales')
      .upsert(records, { onConflict: 'user_id,asin,country,year,month' });

    if (salesError) throw salesError;

    const { error: lockError } = await supabase
      .from('amazon_monthly_upload_locks')
      .upsert({
        user_id: user.id,
        country,
        year,
        month,
        total_asins: rows.length,
        total_qty: rows.reduce((s, r) => s + r.shipped_qty, 0),
      }, { onConflict: 'user_id,country,year,month' });

    if (lockError) throw lockError;

    await fetchData();
    toast({ title: 'Upload Complete', description: `${rows.length} ASINs saved for ${month}/${year}` });
  };

  const unlockMonth = async (year: number, month: number, country: string) => {
    const { error: lockErr } = await supabase
      .from('amazon_monthly_upload_locks')
      .delete()
      .eq('country', country)
      .eq('year', year)
      .eq('month', month);

    if (lockErr) throw lockErr;

    const { error: salesErr } = await supabase
      .from('amazon_monthly_sales')
      .delete()
      .eq('country', country)
      .eq('year', year)
      .eq('month', month);

    if (salesErr) throw salesErr;

    await fetchData();
    toast({ title: 'Month Unlocked', description: `Data for ${month}/${year} removed` });
  };

  // Build calendar months from locks for consistent health calculations
  const calendarMonths = useMemo(() => {
    if (locks.length === 0) return [];
    const sorted = locks
      .map(l => ({ year: l.year, month: l.month, num: l.year * 12 + l.month }))
      .sort((a, b) => a.num - b.num);
    return sorted;
  }, [locks]);

  // Calculate health per ASIN using calendar-based logic
  const asinHealthData = useMemo((): AsinHealth[] => {
    if (sales.length === 0 || calendarMonths.length === 0) return [];

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Use the last 6 calendar months from locks for recent/prior calculation
    const last6 = calendarMonths.slice(-6);
    const recent3Months = last6.slice(-3);
    const prior3Months = last6.length >= 6 ? last6.slice(0, 3) : [];
    const latestMonthNum = calendarMonths[calendarMonths.length - 1].num;

    // Group by ASIN
    const asinMap = new Map<string, MonthlySale[]>();
    sales.forEach(s => {
      if (!asinMap.has(s.asin)) asinMap.set(s.asin, []);
      asinMap.get(s.asin)!.push(s);
    });

    return Array.from(asinMap.entries()).map(([asin, records]) => {
      const sorted = records.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
      const lastRecord = sorted[sorted.length - 1];
      const monthlyData = sorted.map(r => ({ year: r.year, month: r.month, qty: r.shipped_qty }));
      const totalShipped = sorted.reduce((s, r) => s + r.shipped_qty, 0);

      // Calendar-based recent and prior qty
      const getQtyForMonth = (y: number, m: number) => {
        const rec = sorted.find(r => r.year === y && r.month === m);
        return rec ? rec.shipped_qty : 0;
      };

      const recentQty = recent3Months.reduce((s, m) => s + getQtyForMonth(m.year, m.month), 0);
      const priorQty = prior3Months.reduce((s, m) => s + getQtyForMonth(m.year, m.month), 0);
      const recentAvg = recent3Months.length > 0 ? recentQty / recent3Months.length : 0;
      const priorAvg = prior3Months.length > 0 ? priorQty / prior3Months.length : 0;

      const changePercent = priorQty > 0 ? ((recentQty - priorQty) / priorQty) * 100 : 0;

      // Calendar-based status determination
      let status: HealthStatus;
      const lastMonthNum = lastRecord.year * 12 + lastRecord.month;
      const monthsSinceActive = latestMonthNum - lastMonthNum;

      // Check if ASIN only has data in the most recent 3 months (no history before)
      const allRecordMonthNums = sorted.map(r => r.year * 12 + r.month);
      const oldestPriorMonth = prior3Months.length > 0 ? prior3Months[0].num : latestMonthNum - 5;
      const hasHistoryBeforeRecent = allRecordMonthNums.some(n => n <= oldestPriorMonth);

      if (!hasHistoryBeforeRecent && prior3Months.length > 0 && priorQty === 0) {
        status = 'new';
      } else if (monthsSinceActive >= 2 && recentQty === 0) {
        status = 'inactive';
      } else if (recentQty === 0 && priorQty > 0) {
        status = 'inactive';
      } else if (prior3Months.length === 0) {
        // Not enough history to compare
        status = sorted.length <= 2 ? 'new' : 'stable';
      } else if (changePercent > 20) {
        status = 'growing';
      } else if (changePercent < -20) {
        status = 'declining';
      } else {
        status = 'stable';
      }

      return {
        asin,
        sku: lastRecord.sku,
        title: lastRecord.title,
        country: lastRecord.country,
        status,
        monthlyData,
        recentAvg,
        priorAvg,
        changePercent,
        totalShipped,
        lastActiveMonth: `${monthNames[lastRecord.month]} ${lastRecord.year}`,
      };
    });
  }, [sales, calendarMonths]);

  const summary = useMemo(() => {
    const total = asinHealthData.length;
    const growing = asinHealthData.filter(a => a.status === 'growing').length;
    const stable = asinHealthData.filter(a => a.status === 'stable').length;
    const declining = asinHealthData.filter(a => a.status === 'declining').length;
    const inactive = asinHealthData.filter(a => a.status === 'inactive').length;
    const newAsins = asinHealthData.filter(a => a.status === 'new').length;
    return { total, growing, stable, declining, inactive, newAsins };
  }, [asinHealthData]);

  return {
    sales,
    locks,
    loading,
    asinHealthData,
    summary,
    uploadMonthlyData,
    unlockMonth,
    refetch: fetchData,
  };
}

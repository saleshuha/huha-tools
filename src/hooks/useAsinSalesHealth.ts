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

      const [salesRes, locksRes] = await Promise.all([
        supabase
          .from('amazon_monthly_sales')
          .select('*')
          .eq('country', selectedCountry)
          .order('year', { ascending: true })
          .order('month', { ascending: true }),
        supabase
          .from('amazon_monthly_upload_locks')
          .select('*')
          .eq('country', selectedCountry)
          .order('year', { ascending: true })
          .order('month', { ascending: true }),
      ]);

      if (salesRes.error) throw salesRes.error;
      if (locksRes.error) throw locksRes.error;

      setSales((salesRes.data as any[]) || []);
      setLocks((locksRes.data as any[]) || []);
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

    // Upsert sales data
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

    // Create lock
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

  // Calculate health per ASIN
  const asinHealthData = useMemo((): AsinHealth[] => {
    if (sales.length === 0) return [];

    // Group by ASIN
    const asinMap = new Map<string, MonthlySale[]>();
    sales.forEach(s => {
      const key = s.asin;
      if (!asinMap.has(key)) asinMap.set(key, []);
      asinMap.get(key)!.push(s);
    });

    // Find most recent locked month
    const allMonths = locks.map(l => l.year * 12 + l.month).sort((a, b) => b - a);
    const latestMonthNum = allMonths[0] || 0;

    return Array.from(asinMap.entries()).map(([asin, records]) => {
      const sorted = records.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
      const lastRecord = sorted[sorted.length - 1];
      const monthlyData = sorted.map(r => ({ year: r.year, month: r.month, qty: r.shipped_qty }));
      const totalShipped = sorted.reduce((s, r) => s + r.shipped_qty, 0);

      // Recent 3 months vs prior 3 months
      const recent3 = sorted.slice(-3);
      const prior3 = sorted.slice(-6, -3);

      const recentAvg = recent3.length > 0 ? recent3.reduce((s, r) => s + r.shipped_qty, 0) / recent3.length : 0;
      const priorAvg = prior3.length > 0 ? prior3.reduce((s, r) => s + r.shipped_qty, 0) / prior3.length : 0;

      const changePercent = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;

      // Determine status
      let status: HealthStatus;
      const lastMonthNum = lastRecord.year * 12 + lastRecord.month;
      const monthsInactive = latestMonthNum - lastMonthNum;

      if (sorted.length <= 2 && prior3.length === 0) {
        status = 'new';
      } else if (monthsInactive >= 2 || (recent3.every(r => r.shipped_qty === 0) && priorAvg > 0)) {
        status = 'inactive';
      } else if (changePercent > 20) {
        status = 'growing';
      } else if (changePercent < -20) {
        status = 'declining';
      } else {
        status = 'stable';
      }

      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  }, [sales, locks]);

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

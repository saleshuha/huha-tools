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

export type HealthStatus = 'star' | 'growing' | 'stable' | 'declining' | 'at_risk' | 'low_mover' | 'new' | 'dead';

export interface AsinHealth {
  asin: string;
  sku: string | null;
  title: string | null;
  country: string;
  status: HealthStatus;
  monthlyData: { year: number; month: number; qty: number }[];
  totalShipped: number;
  lastActiveMonth: string;
  // Advanced metrics
  salesVelocity: number;
  peakMonthlyAvg: number;
  monthsActive: number;
  totalMonths: number;
  monthsSinceLastSale: number;
  trendSlope: number;
  healthScore: number;
  changePercent: number;
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

// Linear regression slope over an array of values
function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// Best 3-month rolling average
function peakRollingAvg(qtys: number[], window = 3): number {
  if (qtys.length < window) {
    return qtys.length > 0 ? qtys.reduce((a, b) => a + b, 0) / qtys.length : 0;
  }
  let best = 0;
  for (let i = 0; i <= qtys.length - window; i++) {
    let sum = 0;
    for (let j = i; j < i + window; j++) sum += qtys[j];
    best = Math.max(best, sum / window);
  }
  return best;
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

      const salesData = await fetchAllRows<MonthlySale>(() =>
        supabase
          .from('amazon_monthly_sales')
          .select('*')
          .eq('country', selectedCountry)
          .order('year', { ascending: true })
          .order('month', { ascending: true })
          .order('id', { ascending: true })
      );

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

  // Build calendar months from locks
  const calendarMonths = useMemo(() => {
    if (locks.length === 0) return [];
    return locks
      .map(l => ({ year: l.year, month: l.month, num: l.year * 12 + l.month }))
      .sort((a, b) => a.num - b.num);
  }, [locks]);

  // Advanced health classification
  const asinHealthData = useMemo((): AsinHealth[] => {
    if (sales.length === 0 || calendarMonths.length === 0) return [];

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const latestMonthNum = calendarMonths[calendarMonths.length - 1].num;
    const earliestMonthNum = calendarMonths[0].num;

    // Group by ASIN
    const asinMap = new Map<string, MonthlySale[]>();
    sales.forEach(s => {
      if (!asinMap.has(s.asin)) asinMap.set(s.asin, []);
      asinMap.get(s.asin)!.push(s);
    });

    // First pass: compute metrics for all ASINs
    const allItems: (Omit<AsinHealth, 'status' | 'healthScore'> & { rawVelocity: number })[] = [];

    for (const [asin, records] of asinMap.entries()) {
      const sorted = records.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
      const lastRecord = sorted[sorted.length - 1];
      const firstRecord = sorted[0];

      // Build full monthly timeline
      const firstMonthNum = firstRecord.year * 12 + firstRecord.month;
      const totalMonths = latestMonthNum - firstMonthNum + 1;

      // Create qty array aligned to calendar
      const qtyByMonth = new Map<number, number>();
      sorted.forEach(r => {
        const num = r.year * 12 + r.month;
        qtyByMonth.set(num, (qtyByMonth.get(num) || 0) + r.shipped_qty);
      });

      // Full timeline qtys
      const fullQtys: number[] = [];
      for (let n = firstMonthNum; n <= latestMonthNum; n++) {
        fullQtys.push(qtyByMonth.get(n) || 0);
      }

      const monthlyData = sorted.map(r => ({ year: r.year, month: r.month, qty: r.shipped_qty }));
      const totalShipped = fullQtys.reduce((a, b) => a + b, 0);
      const monthsActive = fullQtys.filter(q => q > 0).length;

      // Last sale month
      let lastSaleMonthNum = firstMonthNum;
      for (let n = latestMonthNum; n >= firstMonthNum; n--) {
        if ((qtyByMonth.get(n) || 0) > 0) { lastSaleMonthNum = n; break; }
      }
      const monthsSinceLastSale = latestMonthNum - lastSaleMonthNum;

      const salesVelocity = totalMonths > 0 ? totalShipped / totalMonths : 0;
      const peak = peakRollingAvg(fullQtys, 3);

      // Trend: slope over last 6 months
      const last6Qtys = fullQtys.slice(-Math.min(6, fullQtys.length));
      const slope = linearSlope(last6Qtys);

      // Change percent (recent 3 vs prior 3)
      const recent3Qtys = fullQtys.slice(-Math.min(3, fullQtys.length));
      const prior3Qtys = fullQtys.length >= 6 ? fullQtys.slice(-6, -3) : [];
      const recentSum = recent3Qtys.reduce((a, b) => a + b, 0);
      const priorSum = prior3Qtys.reduce((a, b) => a + b, 0);
      const changePercent = priorSum > 0 ? ((recentSum - priorSum) / priorSum) * 100 : 0;

      const lastMonth = lastRecord.month;
      const lastYear = lastRecord.year;

      allItems.push({
        asin,
        sku: lastRecord.sku,
        title: lastRecord.title,
        country: lastRecord.country,
        monthlyData,
        totalShipped,
        lastActiveMonth: `${monthNames[lastMonth]} ${lastYear}`,
        salesVelocity: Math.round(salesVelocity * 100) / 100,
        peakMonthlyAvg: Math.round(peak * 100) / 100,
        monthsActive,
        totalMonths,
        monthsSinceLastSale,
        trendSlope: Math.round(slope * 100) / 100,
        changePercent: Math.round(changePercent * 10) / 10,
        rawVelocity: salesVelocity,
      });
    }

    // Compute velocity percentile threshold (top 20%)
    const velocities = allItems.map(i => i.rawVelocity).filter(v => v > 0).sort((a, b) => a - b);
    const p80Index = Math.floor(velocities.length * 0.8);
    const velocityP80 = velocities.length > 0 ? velocities[Math.min(p80Index, velocities.length - 1)] : 1;

    // Second pass: classify and score
    return allItems.map(item => {
      const { monthsActive, totalMonths, monthsSinceLastSale, peakMonthlyAvg, rawVelocity, trendSlope, totalShipped } = item;

      // Classification
      let status: HealthStatus;

      const isRecentlyAppeared = totalMonths <= 3;
      const isLowVolume = totalShipped < 5 && monthsActive <= 2;
      const isDead = monthsSinceLastSale >= 4 && peakMonthlyAvg < 3;
      const isAtRisk = monthsSinceLastSale >= 2 && peakMonthlyAvg >= 3;
      const isStar = rawVelocity >= velocityP80 && trendSlope >= 0 && monthsSinceLastSale <= 1;
      const isGrowing = trendSlope > 0.3 && rawVelocity > 1;
      const isDeclining = trendSlope < -0.3 && peakMonthlyAvg >= 2;

      if (isRecentlyAppeared && monthsActive <= 2) {
        status = 'new';
      } else if (isLowVolume) {
        status = 'low_mover';
      } else if (isDead) {
        status = 'dead';
      } else if (isAtRisk) {
        status = 'at_risk';
      } else if (isStar) {
        status = 'star';
      } else if (isGrowing) {
        status = 'growing';
      } else if (isDeclining) {
        status = 'declining';
      } else {
        status = 'stable';
      }

      // Health Score (0-100)
      const activeRatio = totalMonths > 0 ? monthsActive / totalMonths : 0;
      const gapFactor = Math.max(0, 1 - (monthsSinceLastSale / 6));
      const velocityNorm = Math.min(rawVelocity / (velocityP80 || 1), 2) / 2; // cap at 1
      const trendFactor = Math.min(Math.max((trendSlope + 2) / 4, 0), 1); // normalize -2..2 to 0..1

      const healthScore = Math.round(
        (velocityNorm * 35 + activeRatio * 25 + gapFactor * 25 + trendFactor * 15) * 100
      ) / 100;
      const clampedScore = Math.min(100, Math.max(0, Math.round(healthScore)));

      return {
        ...item,
        status,
        healthScore: clampedScore,
        rawVelocity: undefined as any, // strip internal field
      } as AsinHealth;
    });
  }, [sales, calendarMonths]);

  const summary = useMemo(() => {
    const total = asinHealthData.length;
    const active = asinHealthData.filter(a => a.monthsSinceLastSale <= 1).length;
    const growing = asinHealthData.filter(a => a.status === 'growing' || a.status === 'star').length;
    const declining = asinHealthData.filter(a => a.status === 'declining').length;
    const atRisk = asinHealthData.filter(a => a.status === 'at_risk').length;
    const lowDead = asinHealthData.filter(a => a.status === 'low_mover' || a.status === 'dead').length;
    return { total, active, growing, declining, atRisk, lowDead };
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

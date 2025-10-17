import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Info, TrendingUp, PackageX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';

export function InventoryStatsNotification() {
  const [stats, setStats] = useState({ recentlyAdded: 0, notInStock: 0 });
  const [loading, setLoading] = useState(true);
  const { selectedCountry } = useCountry();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get items added in last 30 days
        let recentQuery = supabase
          .from('asin_inventory')
          .select('id', { count: 'exact', head: true })
          .gte('date_added', thirtyDaysAgo.toISOString())
          .eq('is_active', true);

        if (selectedCountry) {
          recentQuery = recentQuery.eq('country', selectedCountry);
        }

        // Get items not in stock (status != 'in-stock')
        let notInStockQuery = supabase
          .from('asin_inventory')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'in-stock')
          .eq('is_active', true);

        if (selectedCountry) {
          notInStockQuery = notInStockQuery.eq('country', selectedCountry);
        }

        const [recentResult, notInStockResult] = await Promise.all([
          recentQuery,
          notInStockQuery
        ]);

        setStats({
          recentlyAdded: recentResult.count || 0,
          notInStock: notInStockResult.count || 0
        });
      } catch (error) {
        console.error('Error fetching inventory stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedCountry]);

  if (loading) return null;

  return (
    <Alert className="mb-4 border-2 border-border/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-foreground">
            {stats.recentlyAdded} items
          </span>
          <span className="text-muted-foreground">added in last 30 days</span>
        </div>
        <div className="h-4 w-px bg-border/60" />
        <div className="flex items-center gap-2">
          <PackageX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-foreground">
            {stats.notInStock} items
          </span>
          <span className="text-muted-foreground">not in stock yet</span>
        </div>
      </AlertDescription>
    </Alert>
  );
}

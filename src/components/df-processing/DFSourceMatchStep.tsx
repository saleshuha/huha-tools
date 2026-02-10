import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { DFOrderItem } from './types';
import { supabase } from '@/integrations/supabase/client';

interface DFSourceMatchStepProps {
  orders: DFOrderItem[];
  onComplete: (orders: DFOrderItem[]) => void;
  onBack: () => void;
}

export function DFSourceMatchStep({ orders, onComplete, onBack }: DFSourceMatchStepProps) {
  const [matchedOrders, setMatchedOrders] = useState<DFOrderItem[]>([]);
  const [matching, setMatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [done, setDone] = useState(false);
  const [noCredentials, setNoCredentials] = useState(false);

  useEffect(() => {
    if (!done && matchedOrders.length === 0) {
      runSourceMatch();
    }
  }, []);

  const runSourceMatch = async () => {
    setMatching(true);
    setProgress(0);
    setStatusText('Starting source match...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // === PASS 1: Local DB match ===
      setStatusText('Checking local catalog...');
      setProgress(5);

      let allSkus: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('sunsky_skus')
          .select('sku_code, cost, title')
          .eq('user_id', user.id)
          .range(from, from + batchSize - 1);

        if (error || !data || data.length === 0) break;
        allSkus = [...allSkus, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }

      setProgress(15);

      const skuMap = new Map<string, { cost?: number; title?: string }>();
      allSkus.forEach(s => {
        skuMap.set(s.sku_code.toLowerCase(), { cost: s.cost, title: s.title });
      });

      // First pass - local match
      const updated = orders.map(order => {
        const skuLower = order.sku?.toLowerCase().trim();
        const match = skuLower ? skuMap.get(skuLower) : undefined;

        return {
          ...order,
          sourceStatus: match ? 'sunsky' as const : 'other' as const,
          sunskyCost: match?.cost,
          sunskySku: match ? order.sku : undefined,
        };
      });

      setProgress(25);
      const localMatched = updated.filter(o => o.sourceStatus === 'sunsky').length;
      setStatusText(`Local catalog: ${localMatched} matched. Checking Sunsky API...`);

      // === PASS 2: Live Sunsky API match for unmatched items ===
      const unmatchedItems = updated.filter(o => o.sourceStatus === 'other' && o.sku);

      if (unmatchedItems.length === 0) {
        setProgress(100);
        setMatchedOrders(updated);
        setDone(true);
        return;
      }

      // Check for Sunsky credentials
      const { data: creds } = await supabase
        .from('sunsky_credentials')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (!creds || creds.length === 0) {
        setNoCredentials(true);
        setProgress(100);
        setMatchedOrders(updated);
        setDone(true);
        return;
      }

      // Deduplicate SKUs to avoid redundant API calls
      const uniqueSkus = [...new Set(unmatchedItems.map(o => o.sku!.trim()))];
      const apiResults = new Map<string, { cost?: number; sunskySku?: string }>();
      const batchSizeApi = 5;

      for (let i = 0; i < uniqueSkus.length; i += batchSizeApi) {
        const batch = uniqueSkus.slice(i, i + batchSizeApi);

        const batchPromises = batch.map(async (sku) => {
          try {
            setStatusText(`Checking ${sku}... (${i + batch.indexOf(sku) + 1}/${uniqueSkus.length})`);

            const { data, error } = await supabase.functions.invoke('sunsky-api', {
              body: { action: 'getProductDetails', itemNo: sku },
            });

            if (!error && data?.result === 'success' && data?.data) {
              const product = data.data;
              const price = product.price ?? product.wholesalePrice ?? product.cost;
              apiResults.set(sku.toLowerCase(), {
                cost: price ? parseFloat(price) : undefined,
                sunskySku: product.itemNo || sku,
              });
            }
          } catch (err) {
            // Silently skip failed lookups
            console.warn(`API lookup failed for ${sku}:`, err);
          }
        });

        await Promise.all(batchPromises);
        const pct = 25 + Math.round(((i + batch.length) / uniqueSkus.length) * 75);
        setProgress(Math.min(pct, 99));
      }

      // Apply API results
      const finalOrders = updated.map(order => {
        if (order.sourceStatus === 'sunsky') return order;
        const skuLower = order.sku?.toLowerCase().trim();
        const apiMatch = skuLower ? apiResults.get(skuLower) : undefined;
        if (apiMatch) {
          return {
            ...order,
            sourceStatus: 'sunsky' as const,
            sunskyCost: apiMatch.cost,
            sunskySku: apiMatch.sunskySku,
          };
        }
        return order;
      });

      setProgress(100);
      const totalMatched = finalOrders.filter(o => o.sourceStatus === 'sunsky').length;
      setStatusText(`Done! ${totalMatched} of ${finalOrders.length} matched to Sunsky.`);
      setMatchedOrders(finalOrders);
      setDone(true);
    } catch (error) {
      console.error('Source matching error:', error);
      setStatusText('Error during matching. Please try again.');
    } finally {
      setMatching(false);
    }
  };

  const sunskyCount = matchedOrders.filter(o => o.sourceStatus === 'sunsky').length;
  const otherCount = matchedOrders.filter(o => o.sourceStatus === 'other').length;
  const displayOrders = done ? matchedOrders : orders;

  return (
    <div className="space-y-4">
      {/* Progress or Summary */}
      {matching ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <Search className="w-8 h-8 text-primary animate-pulse" />
              <p className="text-sm font-medium">{statusText}</p>
              <Progress value={progress} className="w-full max-w-xs" />
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          </CardContent>
        </Card>
      ) : done && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source Match Results</CardTitle>
            <CardDescription>
              {sunskyCount} of {matchedOrders.length} items sourced from Sunsky
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                  Sunsky
                </Badge>
                <span className="text-sm font-medium">{sunskyCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Other</Badge>
                <span className="text-sm font-medium">{otherCount}</span>
              </div>
            </div>
            {noCredentials && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  No active Sunsky API credentials found. Only local catalog was checked. 
                  Configure credentials in Settings → Sunsky API for live matching.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {displayOrders.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Order ID</th>
                    <th className="text-left p-2 font-medium">SKU</th>
                    <th className="text-left p-2 font-medium">ASIN</th>
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-center p-2 font-medium">Qty</th>
                    <th className="text-center p-2 font-medium">Source</th>
                    {done && <th className="text-right p-2 font-medium">Supplier Cost</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayOrders.map((order, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 font-mono text-xs">{order.orderId}</td>
                      <td className="p-2 font-mono text-xs">{order.sku || '—'}</td>
                      <td className="p-2 font-mono text-xs">{order.asin || '—'}</td>
                      <td className="p-2 max-w-[180px] truncate">{order.itemTitle || '—'}</td>
                      <td className="p-2 text-center">{order.itemQuantity}</td>
                      <td className="p-2 text-center">
                        {done ? (
                          order.sourceStatus === 'sunsky' ? (
                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">
                              Sunsky
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Other</Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {done && (
                        <td className="p-2 text-right font-mono text-xs">
                          {order.sunskyCost ? `$${order.sunskyCost.toFixed(2)}` : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={() => onComplete(matchedOrders)} disabled={!done} className="gap-2">
          Continue to Inventory Check <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

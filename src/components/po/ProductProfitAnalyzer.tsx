import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Package, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';
import { ProductProfitUpload } from './ProductProfitUpload';
import { ProductProfitSettings } from './ProductProfitSettings';
import { ProductProfitTable } from './ProductProfitTable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';

export interface ProductProfitItem {
  asin?: string;
  model_number?: string;
  title?: string;
  selling_price: number;
  buying_cost?: number;
  shipping_cost: number;
  commission: number;
  additional_fees: number;
  profit: number;
  margin: number;
  status: 'matched' | 'unmatched';
  sunsky_sku_code?: string;
  weight?: number;
  currency?: string;
  currency_code?: string;
  quantity?: number;
}

export interface ProfitSettings {
  shippingRatePerKg: number;
  flatShippingRate: number;
  useWeightBasedShipping: boolean;
  commissionPercentage: number;
  additionalFees: number;
  currency: string;
}

export const ProductProfitAnalyzer: React.FC = () => {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const [uploadedItems, setUploadedItems] = useState<ProductProfitItem[]>([]);
  const [settings, setSettings] = useState<ProfitSettings>({
    shippingRatePerKg: 2.5,
    flatShippingRate: 5,
    useWeightBasedShipping: true,
    commissionPercentage: 15,
    additionalFees: 0,
    currency: 'AED'
  });

  // Handle file upload and match with Sunsky
  const handleFileUpload = async (data: any[], headers: string[], columnMapping: any) => {
    try {
      console.log('Processing uploaded data:', { data, headers, columnMapping });
      
      // Map columns to our structure
      const items: Partial<ProductProfitItem>[] = data.map(row => ({
        asin: columnMapping.asin ? row[columnMapping.asin] : undefined,
        model_number: columnMapping.model_number ? row[columnMapping.model_number] : undefined,
        title: columnMapping.title ? row[columnMapping.title] : undefined,
        selling_price: parseFloat(row[columnMapping.unit_cost]) || 0,
        quantity: columnMapping.quantity ? parseInt(row[columnMapping.quantity]) || 1 : 1,
        currency_code: columnMapping.currency_code ? row[columnMapping.currency_code] : undefined,
        status: 'unmatched' as const
      }));

      console.log('Mapped items:', items);

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue",
          variant: "destructive"
        });
        return;
      }

      // Fetch all Sunsky SKUs for matching
      const { data: sunskySKUs, error } = await supabase
        .from('sunsky_skus')
        .select('sku_code, title, cost, weight, currency')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching Sunsky SKUs:', error);
        toast({
          title: "Error fetching source data",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched Sunsky SKUs:', sunskySKUs?.length);

      // Match items with Sunsky SKUs
      const matchedItems: ProductProfitItem[] = items.map(item => {
        // Try to match by Model Number (primary) or ASIN (fallback)
        const matchedSKU = sunskySKUs?.find(sku => 
          (item.model_number && sku.sku_code?.toLowerCase() === item.model_number.toLowerCase()) ||
          (item.asin && sku.sku_code?.toLowerCase() === item.asin.toLowerCase())
        );

        const buyingCost = matchedSKU?.cost || 0;
        const weight = matchedSKU?.weight || 0;
        
        // Calculate shipping cost
        const shippingCost = settings.useWeightBasedShipping 
          ? weight * settings.shippingRatePerKg 
          : settings.flatShippingRate;

        // Calculate commission
        const commission = (item.selling_price || 0) * (settings.commissionPercentage / 100);

        // Calculate profit
        const profit = (item.selling_price || 0) - buyingCost - shippingCost - commission - settings.additionalFees;
        
        // Calculate margin
        const margin = item.selling_price ? (profit / item.selling_price) * 100 : 0;

        return {
          ...item,
          buying_cost: buyingCost,
          shipping_cost: shippingCost,
          commission,
          additional_fees: settings.additionalFees,
          profit,
          margin,
          status: matchedSKU ? 'matched' : 'unmatched',
          sunsky_sku_code: matchedSKU?.sku_code,
          weight,
          currency: matchedSKU?.currency || item.currency_code || settings.currency,
          title: item.title || matchedSKU?.title,
          selling_price: item.selling_price || 0,
          quantity: item.quantity,
          model_number: item.model_number
        } as ProductProfitItem;
      });

      console.log('Matched items:', matchedItems);

      setUploadedItems(matchedItems);

      const matchedCount = matchedItems.filter(i => i.status === 'matched').length;
      toast({
        title: "Upload successful",
        description: `Processed ${matchedItems.length} items. ${matchedCount} matched with source.`,
      });

    } catch (error) {
      console.error('Error processing upload:', error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  // Recalculate profit when settings change
  const recalculatedItems = useMemo(() => {
    return uploadedItems.map(item => {
      const buyingCost = item.buying_cost || 0;
      const weight = item.weight || 0;
      
      const shippingCost = settings.useWeightBasedShipping 
        ? weight * settings.shippingRatePerKg 
        : settings.flatShippingRate;

      const commission = item.selling_price * (settings.commissionPercentage / 100);
      const profit = item.selling_price - buyingCost - shippingCost - commission - settings.additionalFees;
      const margin = item.selling_price ? (profit / item.selling_price) * 100 : 0;

      return {
        ...item,
        shipping_cost: shippingCost,
        commission,
        additional_fees: settings.additionalFees,
        profit,
        margin
      };
    });
  }, [uploadedItems, settings]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalProfit = recalculatedItems.reduce((sum, item) => sum + (item.profit * (item.quantity || 1)), 0);
    const averageMargin = recalculatedItems.length > 0
      ? recalculatedItems.reduce((sum, item) => sum + item.margin, 0) / recalculatedItems.length
      : 0;
    const profitableItems = recalculatedItems.filter(item => item.profit > 0).length;
    const lossItems = recalculatedItems.filter(item => item.profit < 0).length;
    const matchRate = recalculatedItems.length > 0
      ? (recalculatedItems.filter(item => item.status === 'matched').length / recalculatedItems.length) * 100
      : 0;

    return {
      totalProfit,
      averageMargin: averageMargin,
      profitableItems,
      lossItems,
      matchRate,
      totalItems: recalculatedItems.length
    };
  }, [recalculatedItems]);

  const clearData = () => {
    setUploadedItems([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload and Settings Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProductProfitUpload onUpload={handleFileUpload} onClear={clearData} />
            <ProductProfitSettings 
              settings={settings}
              onSettingsChange={setSettings}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics Bar */}
      {uploadedItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className="text-sm font-bold text-green-600">
                  {settings.currency} {metrics.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Margin</p>
                <p className="text-sm font-bold">{metrics.averageMargin.toFixed(1)}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Profitable</p>
                <p className="text-sm font-bold text-green-600">{metrics.profitableItems}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Loss</p>
                <p className="text-sm font-bold text-red-600">{metrics.lossItems}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Match Rate</p>
                <p className="text-sm font-bold">{metrics.matchRate.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {uploadedItems.length > 0 && (
        <ProductProfitTable 
          items={recalculatedItems}
          settings={settings}
        />
      )}
    </div>
  );
};

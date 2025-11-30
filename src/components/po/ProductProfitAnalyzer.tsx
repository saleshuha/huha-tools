import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Package, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';
import { ProductProfitUpload } from './ProductProfitUpload';
import { ProductProfitSettings } from './ProductProfitSettings';
import { ProductProfitTable } from './ProductProfitTable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';

export interface ProductProfitItem {
  asin?: string;
  model_number?: string;
  title?: string;
  
  // Original values from uploaded file
  selling_price: number;           // Original selling price
  currency_code?: string;          // Original currency from Excel
  
  // Converted values (to display currency)
  converted_selling_price?: number;
  converted_buying_cost?: number;
  
  // Sunsky data
  buying_cost?: number;            // Original from Sunsky
  sunsky_currency?: string;        // Currency from Sunsky
  
  // Calculated fields (all in display currency)
  shipping_cost: number;
  commission: number;
  additional_fees: number;
  profit: number;
  margin: number;
  
  // Other
  status: 'matched' | 'unmatched';
  sunsky_sku_code?: string;
  weight?: number;
  currency?: string;
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
  const { convertCurrency, loading: currencyLoading } = useCurrencyConverter();
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

      // Match items with Sunsky SKUs (store original values, conversion happens in recalculatedItems)
      const matchedItems: ProductProfitItem[] = items.map(item => {
        // Try to match by Model Number (primary) or ASIN (fallback)
        const matchedSKU = sunskySKUs?.find(sku => 
          (item.model_number && sku.sku_code?.toLowerCase() === item.model_number.toLowerCase()) ||
          (item.asin && sku.sku_code?.toLowerCase() === item.asin.toLowerCase())
        );

        const buyingCost = matchedSKU?.cost || 0;
        const weight = matchedSKU?.weight || 0;
        const sunskyCurrency = matchedSKU?.currency || 'USD';

        return {
          ...item,
          buying_cost: buyingCost,
          sunsky_currency: sunskyCurrency,
          weight,
          status: matchedSKU ? 'matched' : 'unmatched',
          sunsky_sku_code: matchedSKU?.sku_code,
          title: item.title || matchedSKU?.title,
          selling_price: item.selling_price || 0,
          quantity: item.quantity,
          model_number: item.model_number,
          // These will be calculated in recalculatedItems
          shipping_cost: 0,
          commission: 0,
          additional_fees: 0,
          profit: 0,
          margin: 0
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

  // Recalculate profit when settings change (with currency conversion)
  const recalculatedItems = useMemo(() => {
    return uploadedItems.map(item => {
      const displayCurrency = settings.currency;
      const originalCurrency = item.currency_code || 'USD';
      const sunskyCurrency = item.sunsky_currency || 'USD';
      
      // Convert selling price from original currency to display currency
      const convertedSellingPrice = convertCurrency(
        item.selling_price,
        originalCurrency,
        displayCurrency
      );
      
      // Convert buying cost from Sunsky's currency to display currency
      const convertedBuyingCost = convertCurrency(
        item.buying_cost || 0,
        sunskyCurrency,
        displayCurrency
      );
      
      // Calculate shipping cost (already in display currency from settings)
      const weight = item.weight || 0;
      const shippingCost = settings.useWeightBasedShipping 
        ? weight * settings.shippingRatePerKg 
        : settings.flatShippingRate;

      // Calculate commission based on converted selling price
      const commission = convertedSellingPrice * (settings.commissionPercentage / 100);
      
      // Calculate profit in display currency
      const profit = convertedSellingPrice - convertedBuyingCost - shippingCost - commission - settings.additionalFees;
      
      // Calculate margin
      const margin = convertedSellingPrice ? (profit / convertedSellingPrice) * 100 : 0;

      return {
        ...item,
        converted_selling_price: convertedSellingPrice,
        converted_buying_cost: convertedBuyingCost,
        shipping_cost: shippingCost,
        commission,
        additional_fees: settings.additionalFees,
        profit,
        margin
      };
    });
  }, [uploadedItems, settings, convertCurrency]);

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
          <div className="space-y-4">
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

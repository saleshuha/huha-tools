import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, Settings, Database, TrendingUp, 
  BarChart3, CheckCircle, AlertTriangle, Package, FileX, Search, Loader2 
} from 'lucide-react';
import { ProductProfitUploadDialog } from './ProductProfitUploadDialog';
import { ProductProfitSettingsDialog } from './ProductProfitSettingsDialog';
import { SunskySearchProgressDialog } from './SunskySearchProgressDialog';
import { ProductProfitTable } from './ProductProfitTable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import * as XLSX from 'xlsx';

export interface ProductProfitItem {
  asin?: string;
  model_number?: string;
  title?: string;
  
  // Original values from uploaded file
  selling_price: number;
  currency_code?: string;
  
  // Converted values (to display currency)
  converted_selling_price?: number;
  converted_buying_cost?: number;
  
  // Sunsky data
  buying_cost?: number;
  sunsky_currency?: string;
  
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

interface SearchProgress {
  current: number;
  total: number;
  currentItem: string;
  found: number;
  notFound: number;
  status: 'searching' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

export const ProductProfitAnalyzer: React.FC = () => {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const { convertCurrency, loading: currencyLoading } = useCurrencyConverter();
  
  // Data state
  const [uploadedItems, setUploadedItems] = useState<ProductProfitItem[]>([]);
  const [settings, setSettings] = useState<ProfitSettings>({
    shippingRatePerKg: 2.5,
    flatShippingRate: 5,
    useWeightBasedShipping: true,
    commissionPercentage: 15,
    additionalFees: 0,
    currency: 'AED'
  });
  
  // Dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchCancelledRef] = useState({ current: false });
  const [searchProgress, setSearchProgress] = useState<SearchProgress>({
    current: 0,
    total: 0,
    currentItem: '',
    found: 0,
    notFound: 0,
    status: 'searching'
  });

  // Cancel search handler
  const cancelSearch = () => {
    searchCancelledRef.current = true;
    setSearchProgress(prev => ({
      ...prev,
      status: 'cancelled'
    }));
    setIsSearching(false);
  };

  // Handle file upload and match with Sunsky
  const handleFileUpload = async (data: any[], headers: string[], columnMapping: any) => {
    try {
      console.log('Processing uploaded data:', { data, headers, columnMapping });
      
      const items: Partial<ProductProfitItem>[] = data.map(row => ({
        asin: columnMapping.asin ? row[columnMapping.asin] : undefined,
        model_number: columnMapping.model_number ? row[columnMapping.model_number] : undefined,
        title: columnMapping.title ? row[columnMapping.title] : undefined,
        selling_price: parseFloat(row[columnMapping.unit_cost]) || 0,
        quantity: columnMapping.quantity ? parseInt(row[columnMapping.quantity]) || 1 : 1,
        currency_code: columnMapping.currency_code ? row[columnMapping.currency_code] : undefined,
        status: 'unmatched' as const
      }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue",
          variant: "destructive"
        });
        return;
      }

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

      const matchedItems: ProductProfitItem[] = items.map(item => {
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
          shipping_cost: 0,
          commission: 0,
          additional_fees: 0,
          profit: 0,
          margin: 0
        } as ProductProfitItem;
      });

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
      const displayCurrency = settings.currency;
      const originalCurrency = item.currency_code || 'USD';
      const sunskyCurrency = item.sunsky_currency || 'USD';
      
      const convertedSellingPrice = convertCurrency(
        item.selling_price,
        originalCurrency,
        displayCurrency
      );
      
      const convertedBuyingCost = convertCurrency(
        item.buying_cost || 0,
        sunskyCurrency,
        displayCurrency
      );
      
      const weight = item.weight || 0;
      const shippingCost = settings.useWeightBasedShipping 
        ? weight * settings.shippingRatePerKg 
        : settings.flatShippingRate;

      const commission = convertedSellingPrice * (settings.commissionPercentage / 100);
      const profit = convertedSellingPrice - convertedBuyingCost - shippingCost - commission - settings.additionalFees;
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
    const matchedItems = recalculatedItems.filter(item => item.status === 'matched').length;
    const unmatchedItems = recalculatedItems.filter(item => item.status === 'unmatched').length;
    const matchRate = recalculatedItems.length > 0
      ? (matchedItems / recalculatedItems.length) * 100
      : 0;

    return {
      totalProfit,
      averageMargin,
      profitableItems,
      lossItems,
      matchedItems,
      unmatchedItems,
      matchRate,
      totalItems: recalculatedItems.length
    };
  }, [recalculatedItems]);

  // Save matched items to sunsky_skus
  const saveMatchedToSource = async () => {
    const matchedItems = recalculatedItems.filter(i => i.status === 'matched');
    if (matchedItems.length === 0) {
      toast({
        title: "No matched items",
        description: "There are no matched items to save",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update existing SKUs with new selling price data
      for (const item of matchedItems) {
        if (!item.sunsky_sku_code) continue;
        
        await supabase
          .from('sunsky_skus')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('sku_code', item.sunsky_sku_code);
      }

      toast({
        title: "Saved successfully",
        description: `Updated ${matchedItems.length} items in source`,
      });
    } catch (error) {
      console.error('Error saving to source:', error);
      toast({
        title: "Error saving",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Export unmatched items to CSV
  const exportUnmatched = () => {
    const unmatchedItems = recalculatedItems.filter(i => i.status === 'unmatched');
    if (unmatchedItems.length === 0) {
      toast({
        title: "No unmatched items",
        description: "All items are matched with source",
      });
      return;
    }

    try {
      const exportData = unmatchedItems.map(item => ({
        'ASIN': item.asin || '',
        'Model Number': item.model_number || '',
        'Title': item.title || '',
        'Selling Price': item.selling_price,
        'Currency': item.currency_code || 'USD',
        'Quantity': item.quantity || 1,
        'Status': 'Unmatched - Needs SKU'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Unmatched Items');
      XLSX.writeFile(wb, `unmatched-items-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Export successful",
        description: `${exportData.length} unmatched items exported`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  // Search unmatched items in Sunsky catalog
  const searchUnmatchedInSunsky = async () => {
    const unmatchedItems = uploadedItems.filter(i => i.status === 'unmatched');
    if (unmatchedItems.length === 0) {
      toast({
        title: "No unmatched items",
        description: "All items are already matched with source",
      });
      return;
    }

    // Filter items with model numbers
    const itemsToSearch = unmatchedItems.filter(i => i.model_number);
    if (itemsToSearch.length === 0) {
      toast({
        title: "No searchable items",
        description: "Unmatched items don't have model numbers to search",
        variant: "destructive"
      });
      return;
    }

    // Reset cancel flag
    searchCancelledRef.current = false;
    
    setIsSearchDialogOpen(true);
    setIsSearching(true);
    setSearchProgress({
      current: 0,
      total: itemsToSearch.length,
      currentItem: '',
      found: 0,
      notFound: 0,
      status: 'searching'
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let found = 0;
      let notFound = 0;
      const updatedItems = [...uploadedItems];

      for (let i = 0; i < itemsToSearch.length; i++) {
        // Check if cancelled
        if (searchCancelledRef.current) {
          break;
        }
        
        const item = itemsToSearch[i];
        const modelNumber = item.model_number!;
        
        setSearchProgress(prev => ({
          ...prev,
          current: i + 1,
          currentItem: modelNumber
        }));

        try {
          // Search Sunsky API
          const { data, error } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'searchProducts',
              keyword: modelNumber,
              page: 1,
              pageSize: 20
            }
          });

          if (error) throw error;

          // The API returns data.data.products (not productList)
          const products = data?.data?.products || data?.data?.productList || data?.data?.list || [];
          
          console.log('Search results for', modelNumber, ':', products.length, 'products');
          
          // Find matching product - improved matching logic
          const matchingProduct = products.find((p: any) => {
            const itemNo = (p.itemNo || p.sku || p.productCode || '').toLowerCase();
            const searchTerm = modelNumber.toLowerCase();
            
            // Exact match
            if (itemNo === searchTerm) return true;
            
            // Item number contains search term or vice versa
            if (itemNo.includes(searchTerm) || searchTerm.includes(itemNo)) return true;
            
            // Remove common suffixes/prefixes and compare
            const cleanItemNo = itemNo.replace(/[^a-z0-9]/gi, '');
            const cleanSearch = searchTerm.replace(/[^a-z0-9]/gi, '');
            if (cleanItemNo === cleanSearch) return true;
            if (cleanItemNo.includes(cleanSearch) || cleanSearch.includes(cleanItemNo)) return true;
            
            return false;
          });

          if (matchingProduct) {
            // Import to sunsky_skus
            const skuData = {
              user_id: user.id,
              sku_code: matchingProduct.itemNo || matchingProduct.sku,
              title: matchingProduct.title || matchingProduct.itemTitle || matchingProduct.name,
              cost: matchingProduct.price || matchingProduct.finalPrice || matchingProduct.cost || 0,
              weight: matchingProduct.weight || 0,
              currency: 'USD',
              image_url: matchingProduct.imgUrl || matchingProduct.imageUrl || matchingProduct.image
            };

            await supabase
              .from('sunsky_skus')
              .upsert(skuData, { onConflict: 'user_id,sku_code' });

            // Update item in our list
            const itemIndex = updatedItems.findIndex(
              ui => ui.model_number === modelNumber && ui.status === 'unmatched'
            );
            if (itemIndex !== -1) {
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                status: 'matched',
                sunsky_sku_code: matchingProduct.itemNo || matchingProduct.sku,
                buying_cost: matchingProduct.price || matchingProduct.finalPrice || matchingProduct.cost || 0,
                weight: matchingProduct.weight || 0,
                sunsky_currency: 'USD',
                title: updatedItems[itemIndex].title || matchingProduct.title || matchingProduct.name
              };
            }

            found++;
          } else {
            notFound++;
          }

          setSearchProgress(prev => ({
            ...prev,
            found,
            notFound
          }));

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error('Error searching for:', modelNumber, err);
          notFound++;
          setSearchProgress(prev => ({
            ...prev,
            notFound
          }));
        }
      }

      setUploadedItems(updatedItems);
      
      if (!searchCancelledRef.current) {
        setSearchProgress(prev => ({
          ...prev,
          status: 'completed'
        }));

        toast({
          title: "Search completed",
          description: `Found ${found} items, ${notFound} not found in Sunsky`,
        });
      }

    } catch (error) {
      console.error('Search error:', error);
      setSearchProgress(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const clearData = () => {
    setUploadedItems([]);
  };

  const hasData = uploadedItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>

          {hasData && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={saveMatchedToSource}
                disabled={isSaving || metrics.matchedItems === 0}
              >
                <Database className="h-4 w-4 mr-2" />
                Save Matched ({metrics.matchedItems})
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportUnmatched}
                disabled={metrics.unmatchedItems === 0}
              >
                <FileX className="h-4 w-4 mr-2" />
                Export Unmatched ({metrics.unmatchedItems})
              </Button>

              <Button 
                variant="default" 
                size="sm"
                onClick={searchUnmatchedInSunsky}
                disabled={isSearching || metrics.unmatchedItems === 0}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search Sunsky ({metrics.unmatchedItems})
              </Button>

              <div className="h-4 w-px bg-border mx-1" />

              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearData}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Summary Metrics Bar */}
      {hasData && (
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
      <ProductProfitTable 
        items={recalculatedItems}
        settings={settings}
      />

      {/* Dialogs */}
      <ProductProfitUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUpload={handleFileUpload}
      />

      <ProductProfitSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <SunskySearchProgressDialog
        open={isSearchDialogOpen}
        onOpenChange={(open) => {
          if (!isSearching) setIsSearchDialogOpen(open);
        }}
        progress={searchProgress}
        onCancel={cancelSearch}
      />
    </div>
  );
};

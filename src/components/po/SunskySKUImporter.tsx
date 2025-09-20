import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Search, Package, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SunskyCredentialsManager } from "./SunskyCredentialsManager";
import { useSKUManager } from "@/hooks/useSKUManager";
import { usePOOrders } from "@/hooks/usePOOrders";

interface SunskyProduct {
  id: number;
  itemNo: string;
  name: string;
  brandName?: string;
  price: string;
  stock: number;
  warehouse: string;
  leadTime: string;
  status?: number;
}

const getProductStatusText = (status?: number): string => {
  switch (status) {
    case 1: return 'Valid';
    case 2: return 'Deleted';
    case 3: return 'Out of stock';
    case 4: return 'Hidden (too old)';
    default: return status ? `Unknown (${status})` : '';
  }
};

const getStatusBadgeVariant = (status?: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 1: return 'default';
    case 2: return 'destructive';
    case 3: return 'secondary';
    case 4: return 'outline';
    default: return 'outline';
  }
};

export const SunskySKUImporter: React.FC = () => {
  const { toast } = useToast();
  const { addSKUs } = useSKUManager();
  const { getPOModelNumbers } = usePOOrders();

  // Simple state
  const [hasCredentials, setHasCredentials] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SunskyProduct[]>([]);
  const [isSearchingPO, setIsSearchingPO] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchStats, setSearchStats] = useState({
    total: 0,
    searched: 0,
    found: 0,
    imported: 0,
    errors: 0
  });

  // Check credentials status
  useEffect(() => {
    checkCredentials();
  }, []);

  const checkCredentials = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCredentialsStatus' }
      });

      if (error) throw error;
      setHasCredentials(data?.hasCredentials || data?.hasEnvCredentials || false);
    } catch (error) {
      console.error('Failed to check credentials:', error);
      setHasCredentials(false);
    }
  };

  // Search single SKU
  const searchSKU = async (sku: string): Promise<SunskyProduct | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'searchProducts',
          params: { itemNo: sku.trim() }
        }
      });

      if (error) throw error;

      if (data?.result === 'success' && data?.data?.result?.length > 0) {
        return data.data.result[0];
      }
      return null;
    } catch (error) {
      console.error(`Error searching SKU ${sku}:`, error);
      return null;
    }
  };

  // Manual search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a SKU to search",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSearchResults([]);

    try {
      const result = await searchSKU(searchTerm);
      if (result) {
        setSearchResults([result]);
        toast({
          title: "Search Complete",
          description: "Found 1 matching product"
        });
      } else {
        setSearchResults([]);
        toast({
          title: "No Results",
          description: "No matching products found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Import products to SKU list
  const importProducts = async (products: SunskyProduct[]) => {
    try {
      const skuData = products.map(product => ({
        sku_code: product.itemNo,
        title: product.name,
        cost: parseFloat(product.price) || 0,
        currency: 'USD',
        weight: 0,
        country: 'CN',
        brand: product.brandName || '',
        stock: product.stock,
        warehouse: product.warehouse,
        lead_time: product.leadTime,
        status: getProductStatusText(product.status)
      }));

      await addSKUs(skuData);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${products.length} product(s)`
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import products",
        variant: "destructive"
      });
    }
  };

  // Search PO model numbers
  const handleSearchPOModelNumbers = async () => {
    setIsSearchingPO(true);
    setProgress(0);
    setSearchStats({ total: 0, searched: 0, found: 0, imported: 0, errors: 0 });

    try {
      // Get PO model numbers
      const result = await getPOModelNumbers();
      const uniqueModels = result.uniqueModels || [];

      setSearchStats(prev => ({ ...prev, total: uniqueModels.length }));

      const foundProducts: SunskyProduct[] = [];

      // Search each model number
      for (let i = 0; i < uniqueModels.length; i++) {
        const modelNumber = uniqueModels[i];
        
        setProgress(Math.round(((i + 1) / uniqueModels.length) * 100));
        setSearchStats(prev => ({ ...prev, searched: i + 1 }));

        try {
          const product = await searchSKU(modelNumber);
          if (product) {
            foundProducts.push(product);
            setSearchStats(prev => ({ ...prev, found: prev.found + 1 }));
          }
        } catch (error) {
          setSearchStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Import all found products
      if (foundProducts.length > 0) {
        await importProducts(foundProducts);
        setSearchStats(prev => ({ ...prev, imported: foundProducts.length }));
      }

      setSearchResults(foundProducts);

      toast({
        title: "PO Search Complete",
        description: `Found ${foundProducts.length} matching products from ${uniqueModels.length} PO items`
      });

    } catch (error) {
      console.error('PO search error:', error);
      toast({
        title: "PO Search Failed",
        description: "Failed to search PO model numbers",
        variant: "destructive"
      });
    } finally {
      setIsSearchingPO(false);
      setProgress(0);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Simple Sunsky SKU Importer
          </CardTitle>
          <CardDescription>
            Search for SKUs in Sunsky catalog and import matches to your SKU list
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credentials */}
          <SunskyCredentialsManager 
            onCredentialsChanged={checkCredentials} 
          />

          {!hasCredentials && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure your Sunsky API credentials first.
              </AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter SKU to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={!hasCredentials || loading}
                className="flex items-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSearchPOModelNumbers}
                disabled={!hasCredentials || isSearchingPO}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Package className="h-4 w-4 mr-2" />
                {isSearchingPO ? 'Searching PO Items...' : 'Search PO Model Numbers'}
              </Button>
            </div>
          </div>

          {/* Progress */}
          {isSearchingPO && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Searching PO items...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>Total: {searchStats.total}</div>
                <div>Searched: {searchStats.searched}</div>
                <div>Found: {searchStats.found}</div>
                <div>Imported: {searchStats.imported}</div>
                <div className="text-red-500">Errors: {searchStats.errors}</div>
              </div>
            </div>
          )}

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Search Results ({searchResults.length})</h3>
                <Button
                  onClick={() => importProducts(searchResults)}
                  variant="outline"
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import All
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.itemNo}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.brandName || '-'}</TableCell>
                      <TableCell>${product.price}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(product.status)}>
                          {getProductStatusText(product.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => importProducts([product])}
                          size="sm"
                          variant="outline"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Import
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
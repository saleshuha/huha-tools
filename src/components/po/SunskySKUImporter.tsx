import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Download, AlertCircle, CheckCircle2, Package, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { SunskyCredentialsManager } from "./SunskyCredentialsManager";

interface SunskyProduct {
  itemNo: string;
  name: string;
  price: string;
  convertedPrice?: number;
  convertedCurrency?: string;
  warehouse: string;
  leadTime: string;
  stock: number;
}

export const SunskySKUImporter = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SunskyProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);

  // Load credentials
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_sunsky_credentials_secure');
      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const searchProducts = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a model number or SKU to search",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'searchProducts',
          filters: {
            categoryId: null, // Search all categories
            pageSize: 20,
            page: 1,
            status: 1
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data?.products) {
        const searchResults = data.data.products.filter((product: SunskyProduct) => 
          product.itemNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setProducts(searchResults);
        
        if (searchResults.length === 0) {
          toast({
            title: "No Products Found",
            description: `No products found matching "${searchTerm}"`,
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search products",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchPOModelNumbers = async () => {
    setLoading(true);
    try {
      // Get unique model numbers from PO orders
      const { data: poOrders, error: poError } = await supabase
        .from('po_orders')
        .select('model_number')
        .eq('user_id', profile?.id)
        .in('status', ['pending', 'ordered', 'shipped'])
        .not('model_number', 'is', null);
        
      if (poError) throw poError;
      
      const modelNumbers = [...new Set(poOrders.map(po => po.model_number).filter(mn => mn && mn.trim() !== ''))];
      
      if (modelNumbers.length === 0) {
        toast({
          title: "No Model Numbers",
          description: "No model numbers found in your PO orders",
          variant: "destructive",
        });
        return;
      }

      const foundProducts: SunskyProduct[] = [];
      
      for (const modelNumber of modelNumbers.slice(0, 10)) { // Limit to first 10 for simplicity
        try {
          const { data, error } = await supabase.functions.invoke('sunsky-api', {
            body: {
              action: 'getProductDetails',
              itemNo: modelNumber
            }
          });

          if (!error && data?.result === 'success' && data?.data) {
            foundProducts.push({
              itemNo: data.data.itemNo,
              name: data.data.name,
              price: data.data.price,
              convertedPrice: data.data.convertedPrice,
              convertedCurrency: data.data.convertedCurrency,
              warehouse: data.data.warehouse || 'N/A',
              leadTime: data.data.leadTime || 'N/A',
              stock: data.data.stock || 0
            });
          }
        } catch (error) {
          console.log(`Model ${modelNumber} not found:`, error);
        }
      }
      
      setProducts(foundProducts);
      
      toast({
        title: "Search Complete",
        description: `Found ${foundProducts.length} products from ${modelNumbers.length} model numbers`,
      });
      
    } catch (error: any) {
      console.error('PO search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search PO model numbers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const importSelectedProducts = async () => {
    const selectedItems = products.filter(p => selectedProducts.has(p.itemNo));
    
    if (selectedItems.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select products to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'importSKUs',
          skus: selectedItems
        }
      });

      if (error) throw error;

      if (data?.result === 'success') {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${data.data.imported} SKUs`,
        });
        setSelectedProducts(new Set());
        setProducts([]);
      } else {
        throw new Error(data?.message || 'Import failed');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import products",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleProductSelection = (itemNo: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(itemNo)) {
      newSelection.delete(itemNo);
    } else {
      newSelection.add(itemNo);
    }
    setSelectedProducts(newSelection);
  };

  const selectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.itemNo)));
    }
  };

  const hasCredentials = credentials.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Credentials Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
          <CardDescription>
            Manage your Sunsky API credentials to import products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SunskyCredentialsManager onCredentialsChanged={loadCredentials} />
          {!hasCredentials && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Add your Sunsky API credentials above to start importing products.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Product Search</CardTitle>
          <CardDescription>
            Search for products by model number or SKU, or import from your PO orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Model Number or SKU</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter model number or SKU..."
                onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
                disabled={!hasCredentials}
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={searchProducts} 
              disabled={!hasCredentials || loading} 
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Products
            </Button>

            <Button 
              onClick={searchPOModelNumbers}
              disabled={!hasCredentials || loading} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Import from PO Orders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {products.length} products
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={selectAllProducts}
                  variant="outline"
                  size="sm"
                >
                  {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={importSelectedProducts}
                  disabled={selectedProducts.size === 0 || importing}
                  className="flex items-center gap-2"
                >
                  {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Import Selected ({selectedProducts.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Item No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Lead Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.itemNo}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.itemNo)}
                          onChange={() => toggleProductSelection(product.itemNo)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.itemNo}</TableCell>
                      <TableCell className="max-w-xs truncate">{product.name}</TableCell>
                      <TableCell>
                        {product.convertedPrice ? (
                          <div>
                            <div>{product.convertedPrice.toFixed(2)} {product.convertedCurrency}</div>
                            <div className="text-xs text-muted-foreground">${product.price}</div>
                          </div>
                        ) : (
                          `$${product.price}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.warehouse}</TableCell>
                      <TableCell>{product.leadTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
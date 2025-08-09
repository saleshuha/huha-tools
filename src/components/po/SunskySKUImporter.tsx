import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Search, Plus, Download, AlertCircle, CheckCircle2, Package, Globe, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DateRange } from "react-day-picker";

interface SunskyProduct {
  id: number;
  itemNo: string;
  name: string;
  price: string;
  leadTime: string;
  warehouse: string;
  stock: number;
  brandName?: string;
  description?: string;
  convertedPrice?: number;
  convertedCurrency?: string;
}

interface SunskyCategory {
  id: number;
  code: string;
  name: string;
  parentId: number;
  status: number;
  shortName?: string;
  hsCode?: string;
  gmtModified?: string;
}

export const SunskySKUImporter: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categories, setCategories] = useState<SunskyCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SunskyCategory[]>([]);
  const [products, setProducts] = useState<SunskyProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load subcategories when main category changes
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      loadSubCategories(parseInt(selectedCategory));
    } else {
      setSubCategories([]);
      setSelectedSubCategory('all');
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCategories', parentId: 0 }
      });

      if (error) throw error;

      if (data.result === 'success') {
        setCategories(data.data || []);
      } else {
        console.warn('Categories API returned:', data);
        setCategories([]); // Set empty array instead of throwing error
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load Sunsky categories",
        variant: "destructive",
      });
    }
  };

  const loadSubCategories = async (parentId: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCategories', parentId }
      });

      if (error) throw error;

      if (data.result === 'success') {
        setSubCategories(data.data || []);
      } else {
        console.warn('Sub-categories API returned:', data);
        setSubCategories([]);
      }
    } catch (error) {
      console.error('Error loading sub-categories:', error);
      setSubCategories([]);
    }
  };

  const searchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const searchParams: any = {
        action: 'searchProducts',
        page,
        pageSize: 20
      };

      // Use subcategory if selected, otherwise use main category
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        searchParams.categoryId = selectedSubCategory;
      } else if (selectedCategory && selectedCategory !== 'all') {
        searchParams.categoryId = selectedCategory;
      }

      if (searchTerm) {
        searchParams.keyword = searchTerm;
      }

      if (dateRange?.from) {
        searchParams.dateFrom = dateRange.from.toISOString().split('T')[0];
      }

      if (dateRange?.to) {
        searchParams.dateTo = dateRange.to.toISOString().split('T')[0];
      }

      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: searchParams
      });

      if (error) throw error;

      if (data.result === 'success') {
        setProducts(data.data.result || []);
        setTotalPages(data.data.pageCount || 1);
        setCurrentPage(page);
      } else {
        throw new Error(data.message || 'Failed to search products');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast({
        title: "Error",
        description: "Failed to search Sunsky products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const importSelectedSKUs = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one product to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const selectedSkus = products
        .filter(p => selectedProducts.has(p.itemNo))
        .map(p => ({ itemNo: p.itemNo }));

      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'importSKUs',
          skus: selectedSkus
        }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${data.data.imported} SKUs`,
        });
        
        // Clear selection
        setSelectedProducts(new Set());
        
        // Refresh products list
        searchProducts(currentPage);
      } else {
        throw new Error(data.message || 'Failed to import SKUs');
      }
    } catch (error) {
      console.error('Error importing SKUs:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import SKUs",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'AED': return 'AED';
      case 'SAR': return 'SAR';
      case 'USD': return '$';
      default: return currency;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Sunsky SKU Importer</CardTitle>
              <CardDescription>
                Import products directly from Sunsky-Online.com supplier API
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Search & Import</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            </TabsList>
            
            <TabsContent value="search" className="space-y-4">
              {/* Search Controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search Keyword</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Enter keyword..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Main Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Sub Category</Label>
                    <Select 
                      value={selectedSubCategory} 
                      onValueChange={setSelectedSubCategory}
                      disabled={selectedCategory === 'all' || subCategories.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All sub-categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sub-categories</SelectItem>
                        {subCategories.map((subCategory) => (
                          <SelectItem key={subCategory.id} value={subCategory.id.toString()}>
                            {subCategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-range">Date Range Filter</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <DatePickerWithRange
                        date={dateRange}
                        onDateChange={setDateRange}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={() => searchProducts(1)} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Searching..." : "Search Products"}
                    </Button>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setSelectedSubCategory('all');
                        setDateRange(undefined);
                        setProducts([]);
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              {products.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onCheckedChange={selectAllProducts}
                      />
                      <Label>Select All ({selectedProducts.size} selected)</Label>
                    </div>
                    
                    <Button
                      onClick={importSelectedSKUs}
                      disabled={selectedProducts.size === 0 || importing}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {importing ? "Importing..." : `Import ${selectedProducts.size} SKUs`}
                    </Button>
                  </div>

                  {importing && (
                    <div className="space-y-2">
                      <Progress value={importProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">
                        Importing SKUs... {importProgress}%
                      </p>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Item No</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Price (USD)</TableHead>
                          <TableHead>Price ({profile?.country === 'KSA' ? 'SAR' : 'AED'})</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Lead Time</TableHead>
                          <TableHead>Warehouse</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.itemNo}>
                            <TableCell>
                              <Checkbox
                                checked={selectedProducts.has(product.itemNo)}
                                onCheckedChange={() => toggleProductSelection(product.itemNo)}
                              />
                            </TableCell>
                            <TableCell>
                              <code className="text-sm">{product.itemNo}</code>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={product.name}>
                                {product.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.brandName && (
                                <Badge variant="secondary">{product.brandName}</Badge>
                              )}
                            </TableCell>
                            <TableCell>${product.price}</TableCell>
                            <TableCell>
                              {product.convertedPrice ? 
                                `${product.convertedPrice.toFixed(2)} ${getCurrencySymbol(product.convertedCurrency || '')}` : 
                                'Loading...'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                                {product.stock || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.leadTime}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{product.warehouse}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For bulk import, you can paste a list of Sunsky item numbers (one per line) 
                  and they will be imported directly with their current prices converted to your local currency.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-items">Item Numbers (one per line)</Label>
                  <textarea
                    id="bulk-items"
                    className="w-full h-32 p-3 border rounded-md resize-none"
                    placeholder="S-MPH-001&#10;S-MPH-002&#10;S-MPH-003"
                  />
                </div>
                
                <Button className="w-full" disabled>
                  <Package className="h-4 w-4 mr-2" />
                  Bulk Import SKUs (Coming Soon)
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
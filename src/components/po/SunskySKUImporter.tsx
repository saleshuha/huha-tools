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
        setCategories([]);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sunsky Product Importer</h1>
          <p className="text-muted-foreground mt-2">
            Search and import products from Sunsky-Online marketplace
          </p>
        </div>
        {profile && (
          <Badge variant="outline">
            <Globe className="mr-2 h-4 w-4" />
            {profile.country} ({profile.country === 'KSA' ? 'SAR' : 'AED'})
          </Badge>
        )}
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Search Products</TabsTrigger>
          <TabsTrigger value="imported">Imported SKUs</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Product Search</Label>
                  <Input
                    id="search"
                    placeholder="Enter keyword..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Sub-Category</Label>
                  <Select 
                    value={selectedSubCategory} 
                    onValueChange={setSelectedSubCategory}
                    disabled={selectedCategory === 'all' || subCategories.length === 0}
                  >
                    <SelectTrigger id="subcategory">
                      <SelectValue placeholder="Select sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sub-Categories</SelectItem>
                      {subCategories.map((subCategory) => (
                        <SelectItem key={subCategory.id} value={subCategory.id.toString()}>
                          {subCategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={setDateRange}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => searchProducts(1)} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Products
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedSubCategory('all');
                    setDateRange(undefined);
                    setProducts([]);
                    setSelectedProducts(new Set());
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Search Results ({products.length} items)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedProducts.size > 0 && (
                      <Button 
                        onClick={importSelectedSKUs}
                        disabled={importing}
                        size="sm"
                      >
                        {importing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                            Importing {selectedProducts.size} SKUs...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Import {selectedProducts.size} Selected SKUs
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {importing && (
                  <div className="mb-4">
                    <Progress value={importProgress} className="w-full" />
                  </div>
                )}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedProducts.size === products.length && products.length > 0}
                            onCheckedChange={selectAllProducts}
                          />
                        </TableHead>
                        <TableHead>Item No</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Lead Time</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Price (USD)</TableHead>
                        <TableHead>Price ({getCurrencySymbol(profile?.country === 'KSA' ? 'SAR' : 'AED')})</TableHead>
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
                          <TableCell className="font-mono">{product.itemNo}</TableCell>
                          <TableCell className="max-w-xs truncate">{product.name}</TableCell>
                          <TableCell>{product.brandName || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock > 0 ? "default" : "secondary"}>
                              {product.stock}
                            </Badge>
                          </TableCell>
                          <TableCell>{product.leadTime}</TableCell>
                          <TableCell>{product.warehouse}</TableCell>
                          <TableCell className="font-mono">${product.price}</TableCell>
                          <TableCell className="font-mono">
                            {product.convertedPrice ? 
                              `${getCurrencySymbol(product.convertedCurrency || 'AED')} ${product.convertedPrice.toFixed(2)}` 
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && searchTerm === '' && selectedCategory === 'all' && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Your Product Search</h3>
                <p className="text-muted-foreground text-center">
                  Use the filters above to search for products from Sunsky marketplace
                </p>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {!loading && products.length === 0 && (searchTerm !== '' || selectedCategory !== 'all') && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground text-center">
                  Try adjusting your search filters or keywords
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="imported">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Imported SKUs
              </CardTitle>
              <CardDescription>
                View and manage your imported Sunsky SKUs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Imported SKUs feature coming soon. You can view imported SKUs in the main inventory section.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
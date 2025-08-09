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
      {/* Content removed */}
    </div>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Save, X, Upload, Download, DollarSign, Store, ArrowLeft, List, FileSpreadsheet, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/contexts/CountryContext";
import { Link } from "react-router-dom";
import Papa from "papaparse";

export interface SKUCost {
  id?: string;
  sku: string;
  cost: number;
  country: string;
  store_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Store {
  id: string;
  name: string;
  location?: string;
}

export default function SKUCostManagement() {
  const [costs, setCosts] = useState<SKUCost[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [availableSkus, setAvailableSkus] = useState<string[]>([]);
  const [allSkuData, setAllSkuData] = useState<Array<{sku: string, cost?: number, notes?: string, hasCost: boolean}>>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newSku, setNewSku] = useState<string>("");
  const [newCost, setNewCost] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [bulkCostData, setBulkCostData] = useState<string>("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const { selectedCountry } = useCountry();
  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedStore) {
      fetchCosts();
      fetchAvailableSkus();
    }
  }, [selectedCountry, selectedStore]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, location')
        .eq('platform', 'noon')
        .eq('country', selectedCountry)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
      
      // Auto-select first store if available
      if (data && data.length > 0 && !selectedStore) {
        setSelectedStore(data[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      toast({
        title: "Error loading stores",
        description: "Failed to load stores from database",
        variant: "destructive"
      });
    }
  };

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sku_costs')
        .select('*')
        .eq('country', selectedCountry)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCosts(data || []);
    } catch (error) {
      console.error('Error fetching costs:', error);
      toast({
        title: "Error loading costs",
        description: "Failed to load SKU costs from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSkus = async () => {
    if (!selectedStore) return;
    
    try {
      setLoadingSkus(true);
      const skuSet = new Set<string>();

      // Fetch SKUs from noon_sales_data for selected store
      const { data: salesSkus, error: salesError } = await supabase
        .from('noon_sales_data')
        .select('sku')
        .eq('country_code', selectedCountry)
        .eq('store_id', selectedStore)
        .not('sku', 'is', null)
        .neq('sku', '');

      if (salesError) throw salesError;
      salesSkus?.forEach(item => item.sku && skuSet.add(item.sku));

      // Fetch SKUs from noon_order_fees for selected store
      const { data: feesSkus, error: feesError } = await supabase
        .from('noon_order_fees')
        .select('sku')
        .eq('country_code', selectedCountry)
        .eq('store_id', selectedStore)
        .not('sku', 'is', null)
        .neq('sku', '');

      if (feesError) throw feesError;
      feesSkus?.forEach(item => item.sku && skuSet.add(item.sku));

      const uniqueSkus = Array.from(skuSet).sort();
      setAvailableSkus(uniqueSkus);

      // Combine with cost data
      const skuData = uniqueSkus.map(sku => {
        const existingCost = costs.find(c => c.sku === sku);
        return {
          sku,
          cost: existingCost?.cost,
          notes: existingCost?.notes,
          hasCost: !!existingCost
        };
      });

      setAllSkuData(skuData);

      const storeName = stores.find(s => s.id === selectedStore)?.name;
      toast({
        title: "SKUs loaded",
        description: `Found ${uniqueSkus.length} unique SKUs for ${storeName}`,
      });

    } catch (error) {
      console.error('Error fetching available SKUs:', error);
      toast({
        title: "Error loading SKUs",
        description: "Failed to load SKUs from sales data",
        variant: "destructive"
      });
    } finally {
      setLoadingSkus(false);
    }
  };

  // Update allSkuData when costs change
  useEffect(() => {
    if (availableSkus.length > 0) {
      const skuData = availableSkus.map(sku => {
        const existingCost = costs.find(c => c.sku === sku);
        return {
          sku,
          cost: existingCost?.cost,
          notes: existingCost?.notes,
          hasCost: !!existingCost
        };
      });
      setAllSkuData(skuData);
    }
  }, [costs, availableSkus]);

  const saveCost = async (sku: string, cost: number, notes?: string, isUpdate = false) => {
    try {
      const costData = {
        sku,
        cost,
        country: selectedCountry,
        notes: notes?.trim() || null,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      let result;
      if (isUpdate) {
        const existingCost = costs.find(c => c.sku === sku);
        result = await supabase
          .from('sku_costs')
          .update({ cost, notes: notes?.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', existingCost?.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('sku_costs')
          .upsert(costData, { 
            onConflict: 'user_id,sku,country',
            ignoreDuplicates: false 
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      await fetchCosts();
      toast({
        title: isUpdate ? "Cost updated" : "Cost saved",
        description: `Cost for ${sku} has been ${isUpdate ? 'updated' : 'saved'} to ${cost.toFixed(2)} AED`,
      });

      return true;
    } catch (error) {
      console.error('Error saving cost:', error);
      toast({
        title: "Error saving cost",
        description: "Failed to save cost to database",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCost = async (id: string, sku: string) => {
    try {
      const { error } = await supabase
        .from('sku_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCosts();
      toast({
        title: "Cost deleted",
        description: `Cost for ${sku} has been removed`,
      });
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast({
        title: "Error deleting cost",
        description: "Failed to delete cost from database",
        variant: "destructive"
      });
    }
  };

  const startEditing = (sku: string) => {
    const existingCost = costs.find(c => c.sku === sku);
    setEditingSku(sku);
    setEditingCost(existingCost?.cost.toString() || "");
    setEditingNotes(existingCost?.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingSku || !editingCost) return;

    const cost = parseFloat(editingCost);
    if (isNaN(cost) || cost < 0) {
      toast({
        title: "Invalid cost",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }

    const success = await saveCost(editingSku, cost, editingNotes, true);
    if (success) {
      setEditingSku(null);
      setEditingCost("");
      setEditingNotes("");
    }
  };

  const handleAddNew = async () => {
    if (!newSku || !newCost) {
      toast({
        title: "Missing information",
        description: "Please enter both SKU and cost",
        variant: "destructive"
      });
      return;
    }

    const cost = parseFloat(newCost);
    if (isNaN(cost) || cost < 0) {
      toast({
        title: "Invalid cost",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }

    const success = await saveCost(newSku, cost, newNotes);
    if (success) {
      setNewSku("");
      setNewCost("");
      setNewNotes("");
      setShowAddDialog(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkCostData.trim()) {
      toast({
        title: "No data provided",
        description: "Please enter SKU cost data",
        variant: "destructive"
      });
      return;
    }

    Papa.parse(bulkCostData, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        let importedCount = 0;
        let errors = 0;

        for (const row of result.data as any[]) {
          const sku = row.sku || row.SKU;
          const cost = parseFloat(row.cost || row.Cost || row.COST);
          const notes = row.notes || row.Notes || row.NOTES;

          if (sku && !isNaN(cost) && cost >= 0) {
            const success = await saveCost(sku, cost, notes);
            if (success) {
              importedCount++;
            } else {
              errors++;
            }
          } else {
            errors++;
          }
        }

        setBulkCostData("");
        setShowBulkDialog(false);

        toast({
          title: "Bulk import completed",
          description: `Imported ${importedCount} costs${errors > 0 ? `, ${errors} errors` : ''}`,
          variant: errors > 0 ? "destructive" : "default"
        });
      },
      error: () => {
        toast({
          title: "Import failed",
          description: "Error parsing the cost data",
          variant: "destructive"
        });
      }
    });
  };

  const exportCosts = () => {
    const csvData = costs.map(cost => ({
      sku: cost.sku,
      cost: cost.cost,
      country: cost.country,
      notes: cost.notes || "",
      created_at: cost.created_at,
      updated_at: cost.updated_at
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sku_costs_${selectedCountry.toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportMissingCosts = () => {
    const storeName = stores.find(s => s.id === selectedStore)?.name || 'Unknown';
    const missingCosts = allSkuData.filter(item => !item.hasCost).map(item => ({
      sku: item.sku,
      store: storeName,
      cost: "",
      notes: "",
      status: "Missing Cost"
    }));

    const csv = Papa.unparse(missingCosts);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing_sku_costs_${storeName.replace(/\s+/g, '_')}_${selectedCountry.toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completed",
      description: `Exported ${missingCosts.length} SKUs missing costs for ${storeName}`,
    });
  };

  const exportAllSkuStatus = () => {
    const storeName = stores.find(s => s.id === selectedStore)?.name || 'Unknown';
    const statusData = allSkuData.map(item => ({
      sku: item.sku,
      store: storeName,
      cost: item.cost || "",
      notes: item.notes || "",
      status: item.hasCost ? "Has Cost" : "Missing Cost"
    }));

    const csv = Papa.unparse(statusData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_sku_status_${storeName.replace(/\s+/g, '_')}_${selectedCountry.toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completed",
      description: `Exported ${statusData.length} SKUs with status for ${storeName}`,
    });
  };

  const filteredSkuData = allSkuData.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const skusWithCosts = allSkuData.filter(item => item.hasCost).length;
  const skusWithoutCosts = allSkuData.length - skusWithCosts;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading SKU costs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/noon-dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                SKU Cost Management
              </h1>
              <p className="text-slate-600 mt-1">
                Manage SKU costs for {selectedCountry} stores
              </p>
            </div>
          </div>
        </div>

        {/* Store Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No stores available</h3>
                <p className="text-slate-600 mb-4">
                  You need to create a Noon store before managing SKU costs
                </p>
                <Button asChild>
                  <Link to="/noon-stores">
                    Create Store
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Select Store
                  </label>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            <span>{store.name}</span>
                            {store.location && (
                              <span className="text-muted-foreground">({store.location})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedStore && (
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {stores.find(s => s.id === selectedStore)?.name}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SKU Metrics - Store Specific */}
        {selectedStore && availableSkus.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
                <List className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allSkuData.length}</div>
                <p className="text-xs text-muted-foreground">For {stores.find(s => s.id === selectedStore)?.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">With Costs</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{skusWithCosts}</div>
                <p className="text-xs text-muted-foreground">
                  {allSkuData.length > 0 ? Math.round((skusWithCosts / allSkuData.length) * 100) : 0}% complete
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Missing Costs</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{skusWithoutCosts}</div>
                <p className="text-xs text-muted-foreground">Need cost assignment</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Export Options</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" variant="outline" onClick={exportMissingCosts} className="w-full">
                  Missing Costs
                </Button>
                <Button size="sm" variant="outline" onClick={exportAllSkuStatus} className="w-full">
                  All Status
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SKU Costs Content - Only show if store is selected */}
        {!selectedStore ? (
          <Card>
            <CardContent>
              {loadingSkus ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                  Loading SKUs from sales data...
                </div>
              ) : allSkuData.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Store</h3>
                  <p className="text-slate-600">
                    Please select a store to manage SKU costs
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No SKUs Found</h3>
                  <p className="text-slate-600">
                    No SKUs found in uploaded sales data for {stores.find(s => s.id === selectedStore)?.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>SKU Cost Management - {stores.find(s => s.id === selectedStore)?.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {allSkuData.length} SKUs found for this store • {skusWithCosts} with costs • {skusWithoutCosts} missing costs
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add SKU Cost
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New SKU Cost</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">SKU</label>
                          <Input
                            value={newSku}
                            onChange={(e) => setNewSku(e.target.value)}
                            placeholder="Enter SKU number"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Cost (AED)</label>
                          <Input
                            type="number"
                            value={newCost}
                            onChange={(e) => setNewCost(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Notes (optional)</label>
                          <Textarea
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            placeholder="Add notes about this cost..."
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddNew}>
                            Save Cost
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Bulk Import SKU Costs</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Paste CSV data with columns: sku, cost, notes (optional)
                          </p>
                          <Textarea
                            placeholder="sku,cost,notes&#10;SKU001,25.50,Sample note&#10;SKU002,30.00"
                            value={bulkCostData}
                            onChange={(e) => setBulkCostData(e.target.value)}
                            rows={8}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleBulkImport}>
                            Import Costs
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" onClick={exportCosts}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Costs
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search SKUs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Cost (AED)</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSkuData.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant={item.hasCost ? "default" : "secondary"}>
                            {item.hasCost ? "Has Cost" : "Missing Cost"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingSku === item.sku ? (
                            <Input
                              type="number"
                              value={editingCost}
                              onChange={(e) => setEditingCost(e.target.value)}
                              className="w-24"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                            />
                          ) : item.cost !== undefined ? (
                            formatCurrency(item.cost)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={item.notes}>
                          {editingSku === item.sku ? (
                            <Input
                              value={editingNotes}
                              onChange={(e) => setEditingNotes(e.target.value)}
                              placeholder="Add notes..."
                            />
                          ) : (
                            item.notes || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSku === item.sku ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingSku(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => startEditing(item.sku)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {item.hasCost && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => {
                                    const cost = costs.find(c => c.sku === item.sku);
                                    if (cost?.id) deleteCost(cost.id, item.sku);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredSkuData.length === 0 && (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No SKUs Found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? "No SKUs match your search" : `No SKUs found from sales data`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
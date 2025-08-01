import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Save, X, Upload, Download, DollarSign, Store, ArrowLeft } from "lucide-react";
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
  const { selectedCountry } = useCountry();
  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedStore) {
      fetchCosts();
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

  const filteredCosts = costs.filter(cost =>
    cost.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* SKU Costs Content - Only show if store is selected */}
        {!selectedStore ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Store</h3>
              <p className="text-slate-600">
                Please select a store to manage SKU costs
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>SKU Costs for {stores.find(s => s.id === selectedStore)?.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {costs.length} SKUs with costs assigned
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
                    Export
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
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="font-medium">{cost.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cost.country}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingSku === cost.sku ? (
                            <Input
                              type="number"
                              value={editingCost}
                              onChange={(e) => setEditingCost(e.target.value)}
                              className="w-24"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            formatCurrency(cost.cost)
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={cost.notes}>
                          {editingSku === cost.sku ? (
                            <Input
                              value={editingNotes}
                              onChange={(e) => setEditingNotes(e.target.value)}
                              placeholder="Add notes..."
                            />
                          ) : (
                            cost.notes || "-"
                          )}
                        </TableCell>
                        <TableCell>{cost.updated_at ? formatDate(cost.updated_at) : "-"}</TableCell>
                        <TableCell>
                          {editingSku === cost.sku ? (
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
                                onClick={() => startEditing(cost.sku)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => cost.id && deleteCost(cost.id, cost.sku)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredCosts.length === 0 && (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No SKU Costs Found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? "No SKUs match your search" : `No costs added for this store yet`}
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
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoonOrderFeesData } from "@/types/noon-fees";
import { Search, Plus, Edit, Save, X, Upload, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Papa from "papaparse";

export interface SKUCost {
  id?: string;
  sku: string;
  cost: number;
  country: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface SKUCostManagerProps {
  feesData: NoonOrderFeesData[];
  onCostsUpdated: (costs: SKUCost[]) => void;
}

export function SKUCostManager({ feesData, onCostsUpdated }: SKUCostManagerProps) {
  const [costs, setCosts] = useState<SKUCost[]>([]);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkCostData, setBulkCostData] = useState<string>("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Load existing costs from database
  useEffect(() => {
    loadCosts();
  }, [selectedCountry]);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sku_costs')
        .select('*')
        .eq('country', selectedCountry);

      if (error) throw error;

      const formattedCosts: SKUCost[] = data.map(item => ({
        id: item.id,
        sku: item.sku,
        cost: Number(item.cost),
        country: item.country,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      setCosts(formattedCosts);
      onCostsUpdated(formattedCosts);
    } catch (error) {
      console.error('Error loading costs:', error);
      toast({
        title: "Error loading costs",
        description: "Failed to load existing SKU costs from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique SKUs from fees data
  const uniqueSKUs = Array.from(new Set(feesData.map(order => order.sku).filter(Boolean)));

  // Get SKU statistics
  const getSkuStatistics = () => {
    const skuStats = new Map<string, {
      orders: number;
      revenue: number;
      fees: number;
      netPayment: number;
      hasCost: boolean;
      cost?: number;
    }>();

    uniqueSKUs.forEach(sku => {
      const skuOrders = feesData.filter(order => order.sku === sku);
      const revenue = skuOrders.reduce((sum, order) => sum + (Number(order.invoice_price) || 0), 0);
      const fees = skuOrders.reduce((sum, order) => {
        const feeFields = [
          'fee_referral', 'fee_shipping', 'fee_noon_promo', 'fee_noon_markup',
          'fee_outbound_fbn', 'fee_weight_handling', 'fee_crossdock', 'fee_directship_outbound',
          'fee_damaged_return', 'fee_noon_penalty', 'fee_item_cancellation', 'fee_warranty_penalty',
          'fee_retention_penalty', 'fee_alternate_seller_fulfillment', 'fee_miscellaneous',
          'fee_direct_collection', 'fee_reinvoicing', 'fee_noon_rocket_referral'
        ];
        return sum + feeFields.reduce((feeSum, field) => {
          return feeSum + (Number(order[field as keyof NoonOrderFeesData]) || 0);
        }, 0);
      }, 0);
      const netPayment = skuOrders.reduce((sum, order) => sum + (Number(order.total_payment) || 0), 0);
      const costData = costs.find(c => c.sku === sku);

      skuStats.set(sku, {
        orders: skuOrders.length,
        revenue,
        fees,
        netPayment,
        hasCost: !!costData,
        cost: costData?.cost
      });
    });

    return Array.from(skuStats.entries()).map(([sku, stats]) => ({ sku, ...stats }));
  };

  const skuStats = getSkuStatistics();
  const filteredStats = skuStats.filter(stat => 
    stat.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEditing = (sku: string) => {
    const existingCost = costs.find(c => c.sku === sku);
    setEditingSku(sku);
    setEditingCost(existingCost?.cost.toString() || "");
    setEditingNotes(existingCost?.notes || "");
  };

  const saveCost = async () => {
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

    try {
      const existingCost = costs.find(c => c.sku === editingSku);
      
      if (existingCost?.id) {
        // Update existing cost
        const { error } = await supabase
          .from('sku_costs')
          .update({
            cost,
            notes: editingNotes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCost.id);

        if (error) throw error;
      } else {
        // Create new cost
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { error } = await supabase
          .from('sku_costs')
          .insert({
            sku: editingSku,
            cost,
            country: selectedCountry,
            notes: editingNotes.trim() || null,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Reload costs from database
      await loadCosts();
      
      setEditingSku(null);
      setEditingCost("");
      setEditingNotes("");

      toast({
        title: "Cost saved",
        description: `Cost for ${editingSku} has been saved to database`,
      });
    } catch (error) {
      console.error('Error saving cost:', error);
      toast({
        title: "Error saving cost",
        description: "Failed to save cost to database",
        variant: "destructive"
      });
    }
  };

  const cancelEditing = () => {
    setEditingSku(null);
    setEditingCost("");
    setEditingNotes("");
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      Papa.parse(bulkCostData, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          try {
            let importedCount = 0;
            const insertData = [];
            const updateData = [];

            for (const row of result.data as any[]) {
              const sku = row.sku || row.SKU;
              const cost = parseFloat(row.cost || row.Cost || row.COST);
              const notes = row.notes || row.Notes || row.NOTES;

              if (sku && !isNaN(cost) && cost >= 0) {
                const existingCost = costs.find(c => c.sku === sku);
                
                if (existingCost?.id) {
                  updateData.push({
                    id: existingCost.id,
                    cost,
                    notes: notes || null,
                    updated_at: new Date().toISOString()
                  });
                } else {
                  insertData.push({
                    sku,
                    cost,
                    country: selectedCountry,
                    notes: notes || null,
                    user_id: user.id
                  });
                }
                importedCount++;
              }
            }

            // Perform batch operations
            if (insertData.length > 0) {
              const { error: insertError } = await supabase
                .from('sku_costs')
                .insert(insertData);
              if (insertError) throw insertError;
            }

            if (updateData.length > 0) {
              for (const update of updateData) {
                const { error: updateError } = await supabase
                  .from('sku_costs')
                  .update({
                    cost: update.cost,
                    notes: update.notes,
                    updated_at: update.updated_at
                  })
                  .eq('id', update.id);
                if (updateError) throw updateError;
              }
            }

            // Reload costs from database
            await loadCosts();
            setBulkCostData("");
            setShowBulkDialog(false);

            toast({
              title: "Bulk import completed",
              description: `Imported costs for ${importedCount} SKUs to database`,
            });
          } catch (error) {
            console.error('Error saving bulk costs:', error);
            toast({
              title: "Import failed",
              description: "Error saving costs to database",
              variant: "destructive"
            });
          }
        },
        error: () => {
          toast({
            title: "Import failed",
            description: "Error parsing the cost data",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('Error in bulk import:', error);
      toast({
        title: "Import failed",
        description: "Authentication error",
        variant: "destructive"
      });
    }
  };

  const exportCosts = () => {
    const csvData = skuStats.map(stat => ({
      sku: stat.sku,
      cost: stat.cost || "",
      orders: stat.orders,
      revenue: stat.revenue.toFixed(2),
      net_payment: stat.netPayment.toFixed(2),
      notes: costs.find(c => c.sku === stat.sku)?.notes || ""
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sku_costs.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (hasCost: boolean) => {
    return hasCost ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Cost Added</Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">Missing Cost</Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateProfitMargin = (netPayment: number, cost: number) => {
    if (cost === 0) return 0;
    return ((netPayment - cost) / netPayment) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>SKU Cost Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {costs.length} of {uniqueSKUs.length} SKUs have costs assigned
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
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
            <Button variant="outline" size="sm" onClick={exportCosts}>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Net Payment</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((stat) => (
                <TableRow key={stat.sku}>
                  <TableCell className="font-medium">{stat.sku}</TableCell>
                  <TableCell>{getStatusBadge(stat.hasCost)}</TableCell>
                  <TableCell className="text-right">{stat.orders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(stat.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(stat.netPayment)}</TableCell>
                  <TableCell className="text-right">
                    {editingSku === stat.sku ? (
                      <Input
                        type="number"
                        value={editingCost}
                        onChange={(e) => setEditingCost(e.target.value)}
                        className="w-24"
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      stat.cost ? formatCurrency(stat.cost) : "-"
                    )}
                  </TableCell>
                   <TableCell className="text-right">
                     {stat.cost ? formatCurrency(stat.cost * stat.orders) : "-"}
                   </TableCell>
                   <TableCell className="text-right">
                     {stat.cost ? (
                       <span className={stat.netPayment - (stat.cost * stat.orders) > 0 ? "text-green-600" : "text-red-600"}>
                         {formatCurrency(stat.netPayment - (stat.cost * stat.orders))}
                       </span>
                     ) : "-"}
                   </TableCell>
                   <TableCell className="text-right">
                     {stat.cost ? (
                       <span className={calculateProfitMargin(stat.netPayment, stat.cost * stat.orders) > 0 ? "text-green-600" : "text-red-600"}>
                         {calculateProfitMargin(stat.netPayment, stat.cost * stat.orders).toFixed(1)}%
                       </span>
                     ) : "-"}
                   </TableCell>
                  <TableCell>
                    {editingSku === stat.sku ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveCost}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => startEditing(stat.sku)}
                      >
                        {stat.hasCost ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {editingSku && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Edit Cost for {editingSku}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add notes about this cost..."
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, TrendingUp, TrendingDown, Package, DollarSign, Save, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CarrefourSalesOrder } from "@/types/carrefour";
import { useCountry } from "@/contexts/CountryContext";

interface CarrefourSalesOrdersTableProps {
  refresh: number;
  filteredData?: CarrefourSalesOrder[];
  onRefresh: () => void;
}

interface EditingOrder {
  order_number: string;
  sale_value: number;
  seller_fees: number;
  pending_amount: number;
  cost: number;
  profit: number;
  status: 'Delivered' | 'Returned' | 'Cancelled' | 'Other';
}

export function CarrefourSalesOrdersTable({ refresh, filteredData, onRefresh }: CarrefourSalesOrdersTableProps) {
  const [salesOrders, setSalesOrders] = useState<CarrefourSalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingOrder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOrderData, setNewOrderData] = useState<EditingOrder>({
    order_number: "",
    sale_value: 0,
    seller_fees: 0,
    pending_amount: 0,
    cost: 0,
    profit: 0,
    status: 'Delivered',
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Use filtered data if provided, otherwise use all sales orders
  const displayData = filteredData || salesOrders;

  // Expose addNewRow function to parent component
  useEffect(() => {
    if (tableRef.current) {
      (tableRef.current as any).addNewRow = () => {
        setIsAddingNew(true);
        setNewOrderData({
          order_number: "",
          sale_value: 0,
          seller_fees: 0,
          pending_amount: 0,
          cost: 0,
          profit: 0,
          status: 'Delivered',
        });
      };
    }
  }, []);

  useEffect(() => {
    fetchSalesOrders();
  }, [refresh, selectedCountry]);

  const fetchSalesOrders = async () => {
    // Only fetch if no filtered data is provided
    if (filteredData) {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("carrefour_payments")
        .select("*")
        .eq("country", selectedCountry)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSalesOrders((data || []) as CarrefourSalesOrder[]);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sales order records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-calculate profit when values change
  const calculateProfit = (saleValue: number, cost: number, fees: number) => {
    return saleValue - cost - fees;
  };

  const handleEditClick = (order: CarrefourSalesOrder) => {
    setEditingId(order.id);
    setEditingData({
      order_number: order.order_number,
      sale_value: order.sale_value,
      seller_fees: order.seller_fees,
      pending_amount: order.pending_amount,
      cost: order.cost,
      profit: order.profit,
      status: order.status,
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleNewOrderCancel = () => {
    setIsAddingNew(false);
    setNewOrderData({
      order_number: "",
      sale_value: 0,
      seller_fees: 0,
      pending_amount: 0,
      cost: 0,
      profit: 0,
      status: 'Delivered',
    });
  };

  const handleEditSave = async () => {
    if (!editingData || !editingId) return;

    try {
      const { error } = await supabase
        .from("carrefour_payments")
        .update({
          order_number: editingData.order_number,
          sale_value: editingData.sale_value,
          seller_fees: editingData.seller_fees,
          pending_amount: editingData.pending_amount,
          cost: editingData.cost,
          profit: editingData.profit,
          status: editingData.status,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales order updated successfully",
      });

      setEditingId(null);
      setEditingData(null);
      onRefresh();
    } catch (error) {
      console.error("Error updating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to update sales order",
        variant: "destructive",
      });
    }
  };

  const handleNewOrderSave = async () => {
    if (!newOrderData.order_number) {
      toast({
        title: "Error",
        description: "Order number is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("carrefour_payments")
        .insert([{
          ...newOrderData,
          user_id: user.id,
          country: selectedCountry,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales order created successfully",
      });

      setIsAddingNew(false);
      setNewOrderData({
        order_number: "",
        sale_value: 0,
        seller_fees: 0,
        pending_amount: 0,
        cost: 0,
        profit: 0,
        status: 'Delivered',
      });
      onRefresh();
    } catch (error) {
      console.error("Error creating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to create sales order",
        variant: "destructive",
      });
    }
  };

  const updateEditingData = (field: keyof EditingOrder, value: string | number) => {
    if (!editingData) return;
    
    const updatedData = { ...editingData, [field]: value };
    
    // Auto-calculate profit when relevant fields change
    if (field === 'sale_value' || field === 'cost' || field === 'seller_fees') {
      updatedData.profit = calculateProfit(updatedData.sale_value, updatedData.cost, updatedData.seller_fees);
    }
    
    setEditingData(updatedData);
  };

  const updateNewOrderData = (field: keyof EditingOrder, value: string | number) => {
    const updatedData = { ...newOrderData, [field]: value };
    
    // Auto-calculate profit when relevant fields change
    if (field === 'sale_value' || field === 'cost' || field === 'seller_fees') {
      updatedData.profit = calculateProfit(updatedData.sale_value, updatedData.cost, updatedData.seller_fees);
    }
    
    setNewOrderData(updatedData);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("carrefour_payments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales order record deleted successfully",
      });

      onRefresh();
    } catch (error) {
      console.error("Error deleting sales order:", error);
      toast({
        title: "Error",
        description: "Failed to delete sales order record",
        variant: "destructive",
      });
    }
  };

  const renderEditableCell = (
    value: string | number,
    field: keyof EditingOrder,
    type: "text" | "number" | "select" = "text",
    isEditing: boolean = false,
    isNewRow: boolean = false
  ) => {
    if (!isEditing && !isNewRow) {
      if (field === 'status' && typeof value === 'string') {
        const statusColors = {
          'Delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
          'Returned': 'bg-red-100 text-red-800 border-red-200',
          'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
          'Other': 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return (
          <Badge className={`text-xs ${statusColors[value as keyof typeof statusColors] || statusColors.Other}`}>
            {value}
          </Badge>
        );
      }
      return <span>{value}</span>;
    }

    const currentData = isNewRow ? newOrderData : editingData;
    const updateFunction = isNewRow ? updateNewOrderData : updateEditingData;

    if (type === "select" && field === "status") {
      return (
        <Select
          value={currentData?.[field] as string || "Delivered"}
          onValueChange={(value) => updateFunction(field, value)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={currentData?.[field] || ""}
        onChange={(e) => {
          const newValue = type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
          updateFunction(field, newValue);
        }}
        className="h-8 text-sm"
        placeholder={type === "number" ? "0.00" : "Enter value"}
      />
    );
  };

  if (isLoading && !filteredData) {
    return <div className="text-center py-8">Loading sales orders...</div>;
  }

  return (
    <div ref={tableRef} data-table-component className="space-y-4">
      {/* Add New Row Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsAddingNew(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={isAddingNew}
        >
          <Plus className="h-4 w-4" />
          Add Row
        </Button>
      </div>

      {displayData.length === 0 && !isAddingNew ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Sales Orders Found</h3>
          <p className="text-sm text-muted-foreground">Start by adding your first sales order to track profit.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/40">
                <TableHead className="font-semibold text-emerald-700">Order Details</TableHead>
                <TableHead className="font-semibold text-emerald-700">Sale Value</TableHead>
                <TableHead className="font-semibold text-red-700">Cost</TableHead>
                <TableHead className="font-semibold text-yellow-700">Platform Fees</TableHead>
                <TableHead className="font-semibold text-blue-700">Net Profit</TableHead>
                <TableHead className="font-semibold text-orange-700">Outstanding</TableHead>
                <TableHead className="font-semibold text-purple-700">Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* New Row for Adding */}
              {isAddingNew && (
                <TableRow className="bg-emerald-50 border-emerald-200">
                  <TableCell>
                    {renderEditableCell("", "order_number", "text", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(0, "sale_value", "number", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(0, "cost", "number", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(0, "seller_fees", "number", false, true)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span className="font-bold text-emerald-600">
                        {newOrderData.profit.toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(0, "pending_amount", "number", false, true)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell("Delivered", "status", "select", false, true)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    New
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-emerald-100"
                        onClick={handleNewOrderSave}
                      >
                        <Save className="h-3 w-3 text-emerald-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-red-100"
                        onClick={handleNewOrderCancel}
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing Rows */}
              {displayData.map((order, index) => {
                const profitMargin = order.sale_value > 0 ? (order.profit / order.sale_value) * 100 : 0;
                const isEditing = editingId === order.id;
                
                return (
                  <TableRow 
                    key={order.id} 
                    className={`hover:bg-muted/20 transition-colors ${
                      isEditing ? "bg-blue-50 border-blue-200" : 
                      index % 2 === 0 ? "bg-background" : "bg-muted/5"
                    }`}
                  >
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.order_number, "order_number", "text", true)
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline" className="font-mono text-xs bg-emerald-50 border-emerald-200">
                            {order.order_number}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="h-3 w-3" />
                            Order ID
                          </div>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.sale_value, "sale_value", "number", true)
                      ) : (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          <span className="font-semibold text-emerald-600">
                            {order.sale_value.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.cost, "cost", "number", true)
                      ) : (
                        <span className="font-medium text-red-600">
                          {order.cost.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.seller_fees, "seller_fees", "number", true)
                      ) : (
                        <span className="font-medium text-yellow-600">
                          {order.seller_fees.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="font-bold text-blue-600">
                            {editingData?.profit?.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            {order.profit >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`font-bold ${
                              order.profit >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}>
                              {order.profit.toFixed(2)}
                            </span>
                          </div>
                          <Badge 
                            variant={order.profit >= 0 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {profitMargin.toFixed(1)}% margin
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        renderEditableCell(order.pending_amount, "pending_amount", "number", true)
                      ) : (
                        <Badge 
                          variant={order.pending_amount > 0 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {order.pending_amount.toFixed(2)}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {renderEditableCell(order.status, "status", "select", isEditing)}
                    </TableCell>
                    
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex justify-center space-x-1">
                        {isEditing ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-emerald-100"
                              onClick={handleEditSave}
                            >
                              <Save className="h-3 w-3 text-emerald-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-red-100"
                              onClick={handleEditCancel}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                              onClick={() => handleEditClick(order)}
                              disabled={editingId !== null || isAddingNew}
                            >
                              <Edit className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(order.id)}
                              disabled={editingId !== null || isAddingNew}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
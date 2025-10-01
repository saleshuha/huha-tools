import { useState } from "react";
import { useQuarterlyVelocityAnalytics, type VelocityAnalyticsItem } from "@/hooks/useQuarterlyVelocityAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Edit2, Check, X, RotateCcw } from "lucide-react";
export function VelocityAnalyticsSimple() {
  const {
    items,
    loading,
    saveManualOverride,
    clearManualOverride
  } = useQuarterlyVelocityAnalytics();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const filteredItems = items.filter(item => item.asin.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || item.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalItems = items.length;
  const totalAdded = items.reduce((sum, item) => sum + Number(item.total_added), 0);
  const totalSold = items.reduce((sum, item) => sum + Number(item.total_sold), 0);
  const totalPending = items.reduce((sum, item) => sum + item.current_quantity, 0);
  const handleEditClick = (item: VelocityAnalyticsItem) => {
    setEditingId(item.asin_id);
    setEditValue(String(item.manual_override || item.recommended_quantity));
  };
  const handleSaveEdit = async (item: VelocityAnalyticsItem) => {
    const quantity = parseInt(editValue);
    if (!isNaN(quantity) && quantity >= 0) {
      await saveManualOverride(item.asin_id, quantity, item.recommended_quantity);
    }
    setEditingId(null);
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };
  if (loading) {
    return <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>;
  }
  return <div className="space-y-6 p-6">
      {/* Summary Cards */}
      

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Velocity Analytics</CardTitle>
          <CardDescription>
            Track inventory movement by quarters and get intelligent ordering recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search by ASIN, SKU, or Title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Product Details</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Total Added</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Total Sold</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Current Stock</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Velocity</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Recommended Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map(item => {
              const isEditing = editingId === item.asin_id;
              const displayQty = item.manual_override || item.recommended_quantity;
              const hasOverride = item.manual_override !== undefined;
              return <tr key={item.asin_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        <div className="font-mono font-medium">{item.asin}</div>
                        <div className="text-xs text-muted-foreground font-mono">SKU: {item.sku || 'N/A'}</div>
                        <div className="text-xs max-w-xs truncate" title={item.title}>
                          {item.title || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {item.total_added}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {item.total_sold}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={item.current_quantity === 0 ? "destructive" : "default"}>
                        {item.current_quantity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <Badge variant="outline">
                        {(item.velocity_score || 0).toFixed(2)}/day
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? <>
                            <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-20 h-8 text-center" min="0" autoFocus />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleSaveEdit(item)}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleCancelEdit}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </> : <>
                            <span className={`font-medium ${hasOverride ? 'text-blue-600' : ''}`}>
                              {displayQty}
                            </span>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditClick(item)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {hasOverride && <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => clearManualOverride(item.asin_id)} title="Reset to system recommendation">
                                <RotateCcw className="w-4 h-4" />
                              </Button>}
                          </>}
                      </div>
                      {hasOverride && <div className="text-xs text-muted-foreground text-center mt-1">
                          System: {item.recommended_quantity}
                        </div>}
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>

          {filteredItems.length === 0 && <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items found</p>
            </div>}
        </div>
      </Card>
    </div>;
}
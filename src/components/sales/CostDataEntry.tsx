import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDropzone } from "react-dropzone";
import { Upload, Plus, Edit, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface CostDataEntryProps {
  onDataUpdated: (data: any) => void;
}

interface CostItem {
  id: string;
  itemName: string;
  sku: string;
  asin: string;
  costPrice: number;
}

export function CostDataEntry({ onDataUpdated }: CostDataEntryProps) {
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [newItem, setNewItem] = useState({
    itemName: '',
    sku: '',
    asin: '',
    costPrice: 0
  });
  const { toast } = useToast();

  const processFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      
      if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        Papa.parse(file, {
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
          header: true
        });
      }
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    try {
      const file = acceptedFiles[0];
      const data = await processFile(file);
      
      const processedItems = data.map((row: any, index: number) => ({
        id: `imported-${index}`,
        itemName: row['Item Name'] || row['itemName'] || '',
        sku: row['SKU'] || row['sku'] || '',
        asin: row['ASIN'] || row['asin'] || '',
        costPrice: parseFloat(row['Cost Price'] || row['costPrice'] || '0')
      }));
      
      setCostItems(prev => [...prev, ...processedItems]);
      onDataUpdated([...costItems, ...processedItems]);
      
      toast({
        title: "Cost data imported successfully",
        description: `Added ${processedItems.length} cost items`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to process the cost file. Please check the format.",
        variant: "destructive",
      });
    }
  }, [costItems, onDataUpdated, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const addNewItem = () => {
    if (!newItem.itemName || !newItem.sku) {
      toast({
        title: "Missing information",
        description: "Please fill in at least Item Name and SKU",
        variant: "destructive",
      });
      return;
    }

    const item: CostItem = {
      id: `manual-${Date.now()}`,
      ...newItem
    };

    const updatedItems = [...costItems, item];
    setCostItems(updatedItems);
    onDataUpdated(updatedItems);
    setNewItem({ itemName: '', sku: '', asin: '', costPrice: 0 });
    
    toast({
      title: "Cost item added",
      description: "New cost item has been added successfully",
    });
  };

  const updateItem = (item: CostItem) => {
    const updatedItems = costItems.map(i => i.id === item.id ? item : i);
    setCostItems(updatedItems);
    onDataUpdated(updatedItems);
    setEditingItem(null);
    
    toast({
      title: "Cost item updated",
      description: "Cost item has been updated successfully",
    });
  };

  const deleteItem = (id: string) => {
    const updatedItems = costItems.filter(i => i.id !== id);
    setCostItems(updatedItems);
    onDataUpdated(updatedItems);
    
    toast({
      title: "Cost item deleted",
      description: "Cost item has been removed",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload">Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Cost Item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    value={newItem.itemName}
                    onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                    placeholder="Enter item name"
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={newItem.sku}
                    onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <Label htmlFor="asin">ASIN</Label>
                  <Input
                    id="asin"
                    value={newItem.asin}
                    onChange={(e) => setNewItem(prev => ({ ...prev, asin: e.target.value }))}
                    placeholder="Enter ASIN (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={newItem.costPrice}
                    onChange={(e) => setNewItem(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <Button onClick={addNewItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Cost Item
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Upload Cost Data</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your cost data file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Expected columns: Item Name, SKU, ASIN, Cost Price
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {costItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Items ({costItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>ASIN</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          value={editingItem.itemName}
                          onChange={(e) => setEditingItem(prev => prev ? { ...prev, itemName: e.target.value } : null)}
                        />
                      ) : (
                        item.itemName
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          value={editingItem.sku}
                          onChange={(e) => setEditingItem(prev => prev ? { ...prev, sku: e.target.value } : null)}
                        />
                      ) : (
                        item.sku
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          value={editingItem.asin}
                          onChange={(e) => setEditingItem(prev => prev ? { ...prev, asin: e.target.value } : null)}
                        />
                      ) : (
                        item.asin
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editingItem.costPrice}
                          onChange={(e) => setEditingItem(prev => prev ? { ...prev, costPrice: parseFloat(e.target.value) || 0 } : null)}
                        />
                      ) : (
                        `$${item.costPrice.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {editingItem?.id === item.id ? (
                          <Button size="sm" onClick={() => updateItem(editingItem)}>
                            <Save className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setEditingItem(item)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Scan, Plus } from 'lucide-react';
import type { ReceivingItem } from '@/hooks/useStockReceiving';

interface ItemScannerProps {
  onScanComplete: (item: ReceivingItem) => void;
  disabled?: boolean;
}

export function ItemScanner({ onScanComplete, disabled }: ItemScannerProps) {
  const [formData, setFormData] = useState<ReceivingItem>({
    asin: '',
    sku_code: '',
    model_number: '',
    quantity: 1,
    serial_number: '',
    supplier_name: '',
    notes: '',
    title: ''
  });

  const [autoPrint, setAutoPrint] = useState(() => {
    return localStorage.getItem('stock-receiving-auto-print') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('stock-receiving-auto-print', autoPrint.toString());
  }, [autoPrint]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.asin && !formData.sku_code && !formData.model_number) {
      return;
    }

    onScanComplete(formData);
    
    // Reset form
    setFormData({
      asin: '',
      sku_code: '',
      model_number: '',
      quantity: 1,
      serial_number: '',
      supplier_name: '',
      notes: '',
      title: ''
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          Scan/Enter Received Item
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asin">ASIN</Label>
              <Input
                id="asin"
                value={formData.asin}
                onChange={(e) => setFormData({ ...formData, asin: e.target.value })}
                placeholder="B0ABCD1234"
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku_code">SKU Code</Label>
              <Input
                id="sku_code"
                value={formData.sku_code}
                onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                placeholder="SKU-12345"
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model_number">Model Number</Label>
              <Input
                id="model_number"
                value={formData.model_number}
                onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                placeholder="MODEL-XYZ"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Received *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                required
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Optional"
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Supplier Name</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="Supplier"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Product Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Product title"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              disabled={disabled}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-print"
              checked={autoPrint}
              onCheckedChange={(checked) => setAutoPrint(checked as boolean)}
              disabled={disabled}
            />
            <Label 
              htmlFor="auto-print" 
              className="text-sm font-normal cursor-pointer"
            >
              Auto-print labels after receiving
            </Label>
          </div>

          <Button type="submit" disabled={disabled} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Item to Receiving Queue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

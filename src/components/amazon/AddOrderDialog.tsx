import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateOrder } from '@/types/amazon-fulfillment';
import { useCountry } from '@/contexts/CountryContext';

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrder: (order: CreateOrder) => Promise<any>;
  loading: boolean;
}

export const AddOrderDialog = ({ open, onOpenChange, onCreateOrder, loading }: AddOrderDialogProps) => {
  const { selectedCountry } = useCountry();
  const [formData, setFormData] = useState<CreateOrder>({
    order_id: '',
    invoice_id: '',
    asin: '',
    sku: '',
    item_title: '',
    quantity: 1,
    item_cost: 0,
    currency: 'USD',
    status: 'Non Submitted',
    payment_status: 'pending',
    country: selectedCountry,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.order_id.trim()) return;

    try {
      await onCreateOrder(formData);
      // Reset form
      setFormData({
        order_id: '',
        invoice_id: '',
        asin: '',
        sku: '',
        item_title: '',
        quantity: 1,
        item_cost: 0,
        currency: 'USD',
        status: 'Non Submitted',
        payment_status: 'pending',
        country: selectedCountry,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const updateField = (field: keyof CreateOrder, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Order</DialogTitle>
          <DialogDescription>
            Create a new Amazon direct fulfillment order for {selectedCountry}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_id">Order ID *</Label>
              <Input
                id="order_id"
                value={formData.order_id}
                onChange={(e) => updateField('order_id', e.target.value)}
                placeholder="Enter order ID"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice_id">Invoice ID</Label>
              <Input
                id="invoice_id"
                value={formData.invoice_id || ''}
                onChange={(e) => updateField('invoice_id', e.target.value)}
                placeholder="Enter invoice ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asin">ASIN</Label>
              <Input
                id="asin"
                value={formData.asin || ''}
                onChange={(e) => updateField('asin', e.target.value)}
                placeholder="Enter ASIN"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku || ''}
                onChange={(e) => updateField('sku', e.target.value)}
                placeholder="Enter SKU"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item_title">Item Title</Label>
            <Input
              id="item_title"
              value={formData.item_title || ''}
              onChange={(e) => updateField('item_title', e.target.value)}
              placeholder="Enter item title"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => updateField('quantity', parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item_cost">Item Cost</Label>
              <Input
                id="item_cost"
                type="number"
                step="0.01"
                value={formData.item_cost}
                onChange={(e) => updateField('item_cost', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => updateField('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Non Submitted">Non Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(value) => updateField('payment_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_notes">Payment Notes</Label>
            <Textarea
              id="payment_notes"
              value={formData.payment_notes || ''}
              onChange={(e) => updateField('payment_notes', e.target.value)}
              placeholder="Enter any payment notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
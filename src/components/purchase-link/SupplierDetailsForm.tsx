import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Truck } from 'lucide-react';

export interface SupplierDetails {
  supplierName?: string;
  supplierOrderNumber?: string;
  estimatedDeliveryDate?: string;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
}

interface SupplierDetailsFormProps {
  details: SupplierDetails;
  onChange: (details: SupplierDetails) => void;
  disabled?: boolean;
}

export function SupplierDetailsForm({ details, onChange, disabled }: SupplierDetailsFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasDetails = details.supplierName || details.supplierOrderNumber || 
                     details.estimatedDeliveryDate || details.unitCost || 
                     details.totalCost || details.notes;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger 
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-between py-2"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          <span>Supplier Details</span>
          {hasDetails && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Added</span>}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3 space-y-3 border-t mt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Supplier Name</Label>
            <Input
              placeholder="Supplier name"
              value={details.supplierName || ''}
              onChange={(e) => onChange({ ...details, supplierName: e.target.value })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Order Number</Label>
            <Input
              placeholder="Order #"
              value={details.supplierOrderNumber || ''}
              onChange={(e) => onChange({ ...details, supplierOrderNumber: e.target.value })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Delivery Date</Label>
            <Input
              type="date"
              value={details.estimatedDeliveryDate || ''}
              onChange={(e) => onChange({ ...details, estimatedDeliveryDate: e.target.value })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Unit Cost</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={details.unitCost || ''}
              onChange={(e) => onChange({ ...details, unitCost: parseFloat(e.target.value) || undefined })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Total Cost</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={details.totalCost || ''}
              onChange={(e) => onChange({ ...details, totalCost: parseFloat(e.target.value) || undefined })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <Textarea
            placeholder="Any additional notes..."
            value={details.notes || ''}
            onChange={(e) => onChange({ ...details, notes: e.target.value })}
            disabled={disabled}
            className="min-h-[60px] text-sm resize-none"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

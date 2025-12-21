import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { ProfitSettings } from './ProductProfitAnalyzer';

interface ProductProfitSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ProfitSettings;
  onSettingsChange: (settings: ProfitSettings) => void;
}

export const ProductProfitSettingsDialog: React.FC<ProductProfitSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange
}) => {
  const updateSetting = (key: keyof ProfitSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profit Calculation Settings</DialogTitle>
          <DialogDescription>
            Configure rates and fees for profit calculations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currency Selection */}
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Display Currency
            </Label>
            <Select
              value={settings.currency}
              onValueChange={(value) => updateSetting('currency', value)}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All values will be converted to this currency
            </p>
          </div>

          {/* Shipping Method Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Label htmlFor="weight-shipping" className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Use Weight-Based Shipping
            </Label>
            <Switch
              id="weight-shipping"
              checked={settings.useWeightBasedShipping}
              onCheckedChange={(checked) => updateSetting('useWeightBasedShipping', checked)}
            />
          </div>

          {/* Shipping Rate */}
          {settings.useWeightBasedShipping ? (
            <div className="space-y-2">
              <Label htmlFor="shipping-rate" className="text-sm">
                Shipping Rate (per kg)
              </Label>
              <Input
                id="shipping-rate"
                type="number"
                step="0.01"
                value={settings.shippingRatePerKg}
                onChange={(e) => updateSetting('shippingRatePerKg', parseFloat(e.target.value) || 0)}
                placeholder="2.50"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="flat-shipping" className="text-sm">
                Flat Shipping Rate
              </Label>
              <Input
                id="flat-shipping"
                type="number"
                step="0.01"
                value={settings.flatShippingRate}
                onChange={(e) => updateSetting('flatShippingRate', parseFloat(e.target.value) || 0)}
                placeholder="5.00"
              />
            </div>
          )}

          {/* Commission */}
          <div className="space-y-2">
            <Label htmlFor="commission" className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Commission (%)
            </Label>
            <Input
              id="commission"
              type="number"
              step="0.1"
              value={settings.commissionPercentage}
              onChange={(e) => updateSetting('commissionPercentage', parseFloat(e.target.value) || 0)}
              placeholder="15"
            />
          </div>

          {/* Additional Fees */}
          <div className="space-y-2">
            <Label htmlFor="fees" className="text-sm">
              Additional Fees
            </Label>
            <Input
              id="fees"
              type="number"
              step="0.01"
              value={settings.additionalFees}
              onChange={(e) => updateSetting('additionalFees', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

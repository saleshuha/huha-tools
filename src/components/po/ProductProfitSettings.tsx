import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, DollarSign, TrendingUp, Package } from 'lucide-react';
import { ProfitSettings } from './ProductProfitAnalyzer';

interface ProductProfitSettingsProps {
  settings: ProfitSettings;
  onSettingsChange: (settings: ProfitSettings) => void;
}

export const ProductProfitSettings: React.FC<ProductProfitSettingsProps> = ({
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
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configuration
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Set rates and fees
        </p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Currency Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-xs flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              Currency
            </Label>
            <Select
              value={settings.currency}
              onValueChange={(value) => updateSetting('currency', value)}
            >
              <SelectTrigger id="currency" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shipping Method Toggle */}
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
            <Label htmlFor="weight-shipping" className="text-xs flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              Weight-Based
            </Label>
            <Switch
              id="weight-shipping"
              checked={settings.useWeightBasedShipping}
              onCheckedChange={(checked) => updateSetting('useWeightBasedShipping', checked)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Shipping Rate */}
          {settings.useWeightBasedShipping ? (
            <div className="space-y-1.5">
              <Label htmlFor="shipping-rate" className="text-xs">
                Rate (per kg)
              </Label>
              <Input
                id="shipping-rate"
                type="number"
                step="0.01"
                value={settings.shippingRatePerKg}
                onChange={(e) => updateSetting('shippingRatePerKg', parseFloat(e.target.value) || 0)}
                placeholder="2.50"
                className="h-8 text-xs"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="flat-shipping" className="text-xs">
                Flat Rate
              </Label>
              <Input
                id="flat-shipping"
                type="number"
                step="0.01"
                value={settings.flatShippingRate}
                onChange={(e) => updateSetting('flatShippingRate', parseFloat(e.target.value) || 0)}
                placeholder="5.00"
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Amazon Commission */}
          <div className="space-y-1.5">
            <Label htmlFor="commission" className="text-xs flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Commission (%)
            </Label>
            <Input
              id="commission"
              type="number"
              step="0.1"
              value={settings.commissionPercentage}
              onChange={(e) => updateSetting('commissionPercentage', parseFloat(e.target.value) || 0)}
              placeholder="15"
              className="h-8 text-xs"
            />
          </div>

          {/* Additional Fees */}
          <div className="space-y-1.5">
            <Label htmlFor="fees" className="text-xs">
              Additional Fees
            </Label>
            <Input
              id="fees"
              type="number"
              step="0.01"
              value={settings.additionalFees}
              onChange={(e) => updateSetting('additionalFees', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

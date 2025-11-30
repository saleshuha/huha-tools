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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration
        </CardTitle>
        <CardDescription>
          Set shipping rates, commission, and fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currency Selection */}
        <div className="space-y-2">
          <Label htmlFor="currency" className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Currency
          </Label>
          <Select
            value={settings.currency}
            onValueChange={(value) => updateSetting('currency', value)}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AED">AED (United Arab Emirates Dirham)</SelectItem>
              <SelectItem value="SAR">SAR (Saudi Riyal)</SelectItem>
              <SelectItem value="USD">USD (US Dollar)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Shipping Method Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="weight-shipping" className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Weight-Based Shipping
            </Label>
            <p className="text-xs text-muted-foreground">
              Use product weight for shipping cost
            </p>
          </div>
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
            <p className="text-xs text-muted-foreground">
              Cost per kilogram of product weight
            </p>
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
            <p className="text-xs text-muted-foreground">
              Fixed shipping cost per item
            </p>
          </div>
        )}

        {/* Amazon Commission */}
        <div className="space-y-2">
          <Label htmlFor="commission" className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Amazon Commission (%)
          </Label>
          <Input
            id="commission"
            type="number"
            step="0.1"
            value={settings.commissionPercentage}
            onChange={(e) => updateSetting('commissionPercentage', parseFloat(e.target.value) || 0)}
            placeholder="15"
          />
          <p className="text-xs text-muted-foreground">
            Percentage of selling price charged by Amazon
          </p>
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
          <p className="text-xs text-muted-foreground">
            FBA fees, storage fees, etc. (per item)
          </p>
        </div>

        {/* Summary Box */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
          <h4 className="text-sm font-medium">Cost Breakdown Example</h4>
          <div className="text-xs space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>
                {settings.useWeightBasedShipping 
                  ? `${settings.currency} ${settings.shippingRatePerKg}/kg`
                  : `${settings.currency} ${settings.flatShippingRate}/item`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Commission:</span>
              <span>{settings.commissionPercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span>Additional Fees:</span>
              <span>{settings.currency} {settings.additionalFees}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

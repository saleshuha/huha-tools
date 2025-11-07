import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, TrendingUp, Clock, PackageCheck, AlertTriangle, Calculator, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';

interface ReplenishmentConfig {
  id?: string;
  config_name: string;
  is_default: boolean;
  calculation_method: string;
  include_manual_adjustments: boolean;
  manual_adjustment_weight: number;
  include_po_restocks: boolean;
  po_restock_weight: number;
  include_returns: boolean;
  return_weight: number;
  lookback_days: number;
  safety_stock_days: number;
  lead_time_days: number;
  min_order_quantity: number;
  max_order_quantity: number;
  round_to_multiple: number;
  notes?: string;
}

interface ReplenishmentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  currentConfig?: ReplenishmentConfig;
}

export function ReplenishmentConfigDialog({
  open,
  onOpenChange,
  onSave,
  currentConfig,
}: ReplenishmentConfigDialogProps) {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  
  const [config, setConfig] = useState<ReplenishmentConfig>({
    config_name: 'New Configuration',
    is_default: false,
    calculation_method: 'simple',
    include_manual_adjustments: true,
    manual_adjustment_weight: 1.0,
    include_po_restocks: true,
    po_restock_weight: 1.0,
    include_returns: false,
    return_weight: 0.5,
    lookback_days: 90,
    safety_stock_days: 7,
    lead_time_days: 14,
    min_order_quantity: 1,
    max_order_quantity: 100,
    round_to_multiple: 1,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check for duplicate config name when creating new config
      if (!config.id) {
        const { data: existingConfigs } = await supabase
          .from('replenishment_calculation_configs')
          .select('id')
          .eq('user_id', user.id)
          .eq('country', selectedCountry)
          .eq('config_name', config.config_name.trim());

        if (existingConfigs && existingConfigs.length > 0) {
          toast({
            title: 'Duplicate configuration name',
            description: `A configuration named "${config.config_name}" already exists. Please choose a different name.`,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      }

      const configData = {
        ...config,
        user_id: user.id,
        country: selectedCountry,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        // Update existing config - check if name changed and conflicts
        const { data: existingConfigs } = await supabase
          .from('replenishment_calculation_configs')
          .select('id')
          .eq('user_id', user.id)
          .eq('country', selectedCountry)
          .eq('config_name', config.config_name.trim())
          .neq('id', config.id);

        if (existingConfigs && existingConfigs.length > 0) {
          toast({
            title: 'Duplicate configuration name',
            description: `A configuration named "${config.config_name}" already exists. Please choose a different name.`,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('replenishment_calculation_configs')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from('replenishment_calculation_configs')
          .insert(configData);

        if (error) throw error;
      }

      toast({
        title: 'Configuration saved',
        description: 'Your replenishment calculation settings have been updated.',
      });

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error saving configuration',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for preview calculation
  const calculateExampleWeighted = (cfg: ReplenishmentConfig): number => {
    let weighted = 45; // Base sales
    if (cfg.include_manual_adjustments) weighted += 5 * cfg.manual_adjustment_weight;
    if (cfg.include_po_restocks) weighted += 20 * cfg.po_restock_weight;
    if (cfg.include_returns) weighted += 2 * cfg.return_weight;
    return weighted;
  };

  const getMethodFormula = (cfg: ReplenishmentConfig): string => {
    const dailyVel = (calculateExampleWeighted(cfg) / cfg.lookback_days).toFixed(2);
    
    switch (cfg.calculation_method) {
      case 'simple':
        return `${calculateExampleWeighted(cfg)} ÷ 2 = ${(calculateExampleWeighted(cfg) / 2).toFixed(0)}`;
      case 'velocity_based':
        return `${dailyVel} × (${cfg.lead_time_days} + ${cfg.safety_stock_days}) = ${(parseFloat(dailyVel) * (cfg.lead_time_days + cfg.safety_stock_days)).toFixed(0)}`;
      case 'days_of_stock':
        return `${dailyVel} × ${cfg.lead_time_days + cfg.safety_stock_days} days = ${(parseFloat(dailyVel) * (cfg.lead_time_days + cfg.safety_stock_days)).toFixed(0)}`;
      case 'weighted_average':
        return `${dailyVel} × ${cfg.lead_time_days} + safety = ${(parseFloat(dailyVel) * cfg.lead_time_days + parseFloat(dailyVel) * cfg.safety_stock_days).toFixed(0)}`;
      default:
        return 'N/A';
    }
  };

  const calculateFinalExample = (cfg: ReplenishmentConfig): number => {
    const dailyVel = calculateExampleWeighted(cfg) / cfg.lookback_days;
    let qty = 0;
    
    switch (cfg.calculation_method) {
      case 'simple':
        qty = calculateExampleWeighted(cfg) / 2;
        break;
      case 'velocity_based':
      case 'days_of_stock':
      case 'weighted_average':
        qty = dailyVel * (cfg.lead_time_days + cfg.safety_stock_days);
        break;
    }
    
    // Apply constraints
    qty = Math.max(cfg.min_order_quantity, qty);
    qty = Math.min(cfg.max_order_quantity, qty);
    qty = Math.ceil(qty / cfg.round_to_multiple) * cfg.round_to_multiple;
    
    return qty;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Replenishment Calculation Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Configuration Name</Label>
            <Input
              value={config.config_name}
              onChange={(e) => setConfig({ ...config, config_name: e.target.value })}
              placeholder="e.g., Fast Moving Items Config"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={config.is_default}
              onCheckedChange={(checked) => setConfig({ ...config, is_default: checked })}
            />
            <Label>Set as default configuration</Label>
          </div>

          <Separator />

          <Tabs defaultValue="method" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="method">Method</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="timing">Timing</TabsTrigger>
              <TabsTrigger value="constraints">Constraints</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="method" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Calculation Method
                  </CardTitle>
                  <CardDescription>
                    Choose how recommended quantities are calculated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={config.calculation_method}
                    onValueChange={(value) => setConfig({ ...config, calculation_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (Total Sold ÷ 2)</SelectItem>
                      <SelectItem value="velocity_based">Velocity-Based (Daily Sales × Lead Time)</SelectItem>
                      <SelectItem value="days_of_stock">Days of Stock Coverage</SelectItem>
                      <SelectItem value="weighted_average">Weighted Average by Source</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                    {config.calculation_method === 'simple' && (
                      <p>Simple method divides total sales by 2 to estimate reorder quantity.</p>
                    )}
                    {config.calculation_method === 'velocity_based' && (
                      <p>Calculates based on daily sales velocity multiplied by lead time and safety stock days.</p>
                    )}
                    {config.calculation_method === 'days_of_stock' && (
                      <p>Orders enough stock to cover lead time plus safety stock based on recent sales patterns.</p>
                    )}
                    {config.calculation_method === 'weighted_average' && (
                      <p>Applies different weights to different stock change sources for more nuanced calculations.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4" />
                    Stock Change Sources
                  </CardTitle>
                  <CardDescription>
                    Choose which stock changes to include and set their impact factor. Higher impact = more influence on recommended quantities.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Manual Adjustments</Label>
                      <p className="text-sm text-muted-foreground">
                        Stock changes made manually by users
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={config.include_manual_adjustments}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, include_manual_adjustments: checked })
                        }
                      />
                      {config.include_manual_adjustments && (
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">Impact Factor</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={config.manual_adjustment_weight}
                            onChange={(e) =>
                              setConfig({ ...config, manual_adjustment_weight: parseFloat(e.target.value) || 1.0 })
                            }
                            placeholder="1.0 = full"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            1.0 = full impact, 0.5 = half
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>PO Fulfillments</Label>
                      <p className="text-sm text-muted-foreground">
                        Stock added from purchase orders
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={config.include_po_restocks}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, include_po_restocks: checked })
                        }
                      />
                      {config.include_po_restocks && (
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">Impact Factor</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={config.po_restock_weight}
                            onChange={(e) =>
                              setConfig({ ...config, po_restock_weight: parseFloat(e.target.value) || 1.0 })
                            }
                            placeholder="1.0 = full"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            1.0 = full impact, 0.5 = half
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Customer Returns</Label>
                      <p className="text-sm text-muted-foreground">
                        Items returned by customers
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={config.include_returns}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, include_returns: checked })
                        }
                      />
                      {config.include_returns && (
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">Impact Factor</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={config.return_weight}
                            onChange={(e) =>
                              setConfig({ ...config, return_weight: parseFloat(e.target.value) || 0.5 })
                            }
                            placeholder="0.5 = half"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            1.0 = full impact, 0.5 = half
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timing & Safety Stock
                  </CardTitle>
                  <CardDescription>
                    Configure time periods and safety buffers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Lookback Period (days)</Label>
                    <Input
                      type="number"
                      value={config.lookback_days}
                      onChange={(e) =>
                        setConfig({ ...config, lookback_days: parseInt(e.target.value) || 90 })
                      }
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      How far back to analyze sales history
                    </p>
                  </div>

                  <div>
                    <Label>Lead Time (days)</Label>
                    <Input
                      type="number"
                      value={config.lead_time_days}
                      onChange={(e) =>
                        setConfig({ ...config, lead_time_days: parseInt(e.target.value) || 14 })
                      }
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Expected time from order to delivery
                    </p>
                  </div>

                  <div>
                    <Label>Safety Stock (days)</Label>
                    <Input
                      type="number"
                      value={config.safety_stock_days}
                      onChange={(e) =>
                        setConfig({ ...config, safety_stock_days: parseInt(e.target.value) || 7 })
                      }
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Buffer stock to prevent stockouts
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="constraints" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Quantity Constraints
                  </CardTitle>
                  <CardDescription>
                    Set minimum, maximum, and rounding rules
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Minimum Order Quantity</Label>
                      <Input
                        type="number"
                        value={config.min_order_quantity}
                        onChange={(e) =>
                          setConfig({ ...config, min_order_quantity: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>

                    <div>
                      <Label>Maximum Order Quantity</Label>
                      <Input
                        type="number"
                        value={config.max_order_quantity}
                        onChange={(e) =>
                          setConfig({ ...config, max_order_quantity: parseInt(e.target.value) || 100 })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Round to Multiple Of</Label>
                    <Select
                      value={config.round_to_multiple.toString()}
                      onValueChange={(value) =>
                        setConfig({ ...config, round_to_multiple: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (No rounding)</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={config.notes || ''}
                      onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                      placeholder="Optional notes about this configuration"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Calculation Example
                  </CardTitle>
                  <CardDescription>
                    See how these settings calculate recommended quantities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm">Sample Scenario:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Sales ({config.lookback_days} days):</span>
                        <span className="ml-2 font-semibold">45 units</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Manual Adjustments:</span>
                        <span className="ml-2 font-semibold">-5 units</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">PO Restocks:</span>
                        <span className="ml-2 font-semibold">-20 units</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Returns:</span>
                        <span className="ml-2 font-semibold">-2 units</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Calculation Breakdown:</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">1. Weighted demand from sources:</span>
                        <span className="font-mono font-semibold">
                          {calculateExampleWeighted(config).toFixed(1)} units
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">2. Daily velocity:</span>
                        <span className="font-mono">
                          {calculateExampleWeighted(config).toFixed(1)} ÷ {config.lookback_days} = <span className="font-semibold">{(calculateExampleWeighted(config) / config.lookback_days).toFixed(2)}</span>
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">3. Method calculation:</span>
                        <span className="font-mono text-xs">
                          {getMethodFormula(config)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-primary/10 rounded border border-primary/20">
                        <span className="font-medium">4. Final recommended qty:</span>
                        <span className="font-mono font-bold text-primary text-lg">
                          {calculateFinalExample(config)} units
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-sm">Applied Sources:</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Customer Sales (weight: 1.0) ✓</li>
                      {config.include_manual_adjustments && (
                        <li>Manual Adjustments (weight: {config.manual_adjustment_weight}) ✓</li>
                      )}
                      {config.include_po_restocks && (
                        <li>PO Restocks (weight: {config.po_restock_weight}) ✓</li>
                      )}
                      {config.include_returns && (
                        <li>Returns (weight: {config.return_weight}) ✓</li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-sm">Applied Constraints:</div>
                    <div className="text-muted-foreground">
                      Min: {config.min_order_quantity}, Max: {config.max_order_quantity}, Round to: {config.round_to_multiple}
                    </div>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      This is a sample calculation. Actual recommendations will vary based on each item's real sales history.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

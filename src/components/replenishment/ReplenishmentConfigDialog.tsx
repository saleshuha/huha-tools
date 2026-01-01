import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Settings, Clock, AlertTriangle, Calculator, Info, ChevronRight, ShoppingCart, Package, RotateCcw, Truck, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';
import { MethodCard } from './MethodCard';
import { SourceWeightSlider } from './SourceWeightSlider';

interface ReplenishmentConfig {
  id?: string;
  config_name: string;
  is_default: boolean;
  calculation_method: string;
  include_sales: boolean;
  sales_weight: number;
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
  onSave: (savedConfigId?: string) => void;
  currentConfig?: ReplenishmentConfig;
}

const METHODS = [
  {
    method: 'simple',
    title: 'Simple Average',
    description: 'Divides total sales by 2 to estimate reorder quantity. Best for stable demand.',
    formula: 'Total Sold ÷ 2',
  },
  {
    method: 'velocity_based',
    title: 'Velocity Based',
    description: 'Uses daily sales rate multiplied by lead time and safety stock. Best for variable demand.',
    formula: 'Velocity × (Lead + Safety)',
    recommended: true,
  },
  {
    method: 'days_of_stock',
    title: 'Days of Stock',
    description: 'Orders enough to cover a specific number of days. Best for predictable lead times.',
    formula: 'Velocity × Coverage Days',
  },
  {
    method: 'weighted_average',
    title: 'Weighted Sources',
    description: 'Applies different weights to different stock change sources. Most flexible option.',
    formula: 'Σ(Source × Weight)',
  },
];

const STEPS = [
  { id: 'method', label: 'Method', icon: Calculator },
  { id: 'sources', label: 'Sources', icon: Package },
  { id: 'timing', label: 'Timing', icon: Clock },
  { id: 'constraints', label: 'Constraints', icon: AlertTriangle },
  { id: 'preview', label: 'Preview', icon: Zap },
];

export function ReplenishmentConfigDialog({
  open,
  onOpenChange,
  onSave,
  currentConfig,
}: ReplenishmentConfigDialogProps) {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const [currentStep, setCurrentStep] = useState(0);
  
  const [config, setConfig] = useState<ReplenishmentConfig>({
    config_name: 'New Configuration',
    is_default: false,
    calculation_method: 'velocity_based',
    include_sales: true,
    sales_weight: 1.0,
    include_manual_adjustments: true,
    manual_adjustment_weight: 1.0,
    include_po_restocks: false,
    po_restock_weight: 0.5,
    include_returns: false,
    return_weight: 0.3,
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
    } else {
      // Reset to defaults when creating new config
      setConfig({
        config_name: 'New Configuration',
        is_default: false,
        calculation_method: 'velocity_based',
        include_sales: true,
        sales_weight: 1.0,
        include_manual_adjustments: true,
        manual_adjustment_weight: 1.0,
        include_po_restocks: false,
        po_restock_weight: 0.5,
        include_returns: false,
        return_weight: 0.3,
        lookback_days: 90,
        safety_stock_days: 7,
        lead_time_days: 14,
        min_order_quantity: 1,
        max_order_quantity: 100,
        round_to_multiple: 1,
      });
    }
    setCurrentStep(0);
  }, [currentConfig, open]);

  const handleSave = async (saveAndRecalculate: boolean = false) => {
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
            description: `A configuration named "${config.config_name}" already exists.`,
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

      let savedId: string | undefined;

      if (config.id) {
        // Update existing config
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
            description: `A configuration named "${config.config_name}" already exists.`,
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
        savedId = config.id;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('replenishment_calculation_configs')
          .insert(configData)
          .select('id')
          .single();

        if (error) throw error;
        savedId = data?.id;
      }

      toast({
        title: 'Configuration saved',
        description: saveAndRecalculate 
          ? 'Settings saved. Recalculating all quantities...' 
          : 'Your replenishment calculation settings have been updated.',
      });

      onSave(savedId);
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
  const calculateExampleWeighted = (): number => {
    let weighted = 0;
    if (config.include_sales) weighted += 45 * config.sales_weight;
    if (config.include_manual_adjustments) weighted += 5 * config.manual_adjustment_weight;
    if (config.include_po_restocks) weighted += 20 * config.po_restock_weight;
    if (config.include_returns) weighted += 2 * config.return_weight;
    return weighted;
  };

  const calculateDailyVelocity = (): number => {
    return calculateExampleWeighted() / config.lookback_days;
  };

  const calculateFinalExample = (): number => {
    const dailyVel = calculateDailyVelocity();
    let qty = 0;
    
    switch (config.calculation_method) {
      case 'simple':
        qty = calculateExampleWeighted() / 2;
        break;
      case 'velocity_based':
      case 'days_of_stock':
      case 'weighted_average':
        qty = dailyVel * (config.lead_time_days + config.safety_stock_days);
        break;
    }
    
    // Apply constraints
    qty = Math.max(config.min_order_quantity, qty);
    qty = Math.min(config.max_order_quantity, qty);
    qty = Math.ceil(qty / config.round_to_multiple) * config.round_to_multiple;
    
    return qty;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Method
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Calculation Method</h3>
              <p className="text-sm text-muted-foreground">
                Select how recommended order quantities should be calculated
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {METHODS.map((m) => (
                <MethodCard
                  key={m.method}
                  method={m.method}
                  title={m.title}
                  description={m.description}
                  formula={m.formula}
                  isSelected={config.calculation_method === m.method}
                  onSelect={() => setConfig({ ...config, calculation_method: m.method })}
                  recommended={m.recommended}
                />
              ))}
            </div>
          </div>
        );

      case 1: // Sources
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configure Data Sources</h3>
              <p className="text-sm text-muted-foreground">
                Choose which stock changes to include and their impact weight
              </p>
            </div>
            
            <div className="space-y-4">
              <SourceWeightSlider
                label="Sales & Outflows"
                description="Stock reductions from sales (most important signal)"
                enabled={config.include_sales}
                weight={config.sales_weight}
                onEnabledChange={(v) => setConfig({ ...config, include_sales: v })}
                onWeightChange={(v) => setConfig({ ...config, sales_weight: v })}
                isPrimary
                icon={<ShoppingCart className="w-5 h-5" />}
              />

              <SourceWeightSlider
                label="Manual Adjustments"
                description="Stock changes made manually by users"
                enabled={config.include_manual_adjustments}
                weight={config.manual_adjustment_weight}
                onEnabledChange={(v) => setConfig({ ...config, include_manual_adjustments: v })}
                onWeightChange={(v) => setConfig({ ...config, manual_adjustment_weight: v })}
                icon={<Package className="w-5 h-5" />}
              />

              <SourceWeightSlider
                label="PO Fulfillments"
                description="Stock added from purchase orders"
                enabled={config.include_po_restocks}
                weight={config.po_restock_weight}
                onEnabledChange={(v) => setConfig({ ...config, include_po_restocks: v })}
                onWeightChange={(v) => setConfig({ ...config, po_restock_weight: v })}
                icon={<Truck className="w-5 h-5" />}
              />

              <SourceWeightSlider
                label="Customer Returns"
                description="Items returned by customers (reduces demand)"
                enabled={config.include_returns}
                weight={config.return_weight}
                onEnabledChange={(v) => setConfig({ ...config, include_returns: v })}
                onWeightChange={(v) => setConfig({ ...config, return_weight: v })}
                icon={<RotateCcw className="w-5 h-5" />}
              />
            </div>
          </div>
        );

      case 2: // Timing
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Timing & Safety Stock</h3>
              <p className="text-sm text-muted-foreground">
                Configure time periods and safety buffers
              </p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Lookback Period</Label>
                        <Badge variant="secondary">{config.lookback_days} days</Badge>
                      </div>
                      <Input
                        type="range"
                        min="30"
                        max="365"
                        value={config.lookback_days}
                        onChange={(e) =>
                          setConfig({ ...config, lookback_days: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        How far back to analyze sales history for demand calculation
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Lead Time</Label>
                        <Badge variant="secondary">{config.lead_time_days} days</Badge>
                      </div>
                      <Input
                        type="range"
                        min="1"
                        max="60"
                        value={config.lead_time_days}
                        onChange={(e) =>
                          setConfig({ ...config, lead_time_days: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Expected time from placing an order to receiving stock
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Safety Stock Buffer</Label>
                        <Badge variant="secondary">{config.safety_stock_days} days</Badge>
                      </div>
                      <Input
                        type="range"
                        min="0"
                        max="30"
                        value={config.safety_stock_days}
                        onChange={(e) =>
                          setConfig({ ...config, safety_stock_days: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Extra buffer stock to prevent stockouts during unexpected demand
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3: // Constraints
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Quantity Constraints</h3>
              <p className="text-sm text-muted-foreground">
                Set minimum, maximum, and rounding rules for order quantities
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Order Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.min_order_quantity}
                      onChange={(e) =>
                        setConfig({ ...config, min_order_quantity: parseInt(e.target.value) || 1 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Never recommend less than this
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Order Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.max_order_quantity}
                      onChange={(e) =>
                        setConfig({ ...config, max_order_quantity: parseInt(e.target.value) || 100 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Cap recommendations at this amount
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Round to Multiple Of</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 5, 10, 12].map((n) => (
                      <Button
                        key={n}
                        variant={config.round_to_multiple === n ? "default" : "outline"}
                        className="h-12"
                        onClick={() => setConfig({ ...config, round_to_multiple: n })}
                      >
                        {n === 1 ? 'No rounding' : `${n} units`}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    value={config.notes || ''}
                    onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                    placeholder="Add notes about this configuration..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4: // Preview
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Calculation Preview</h3>
              <p className="text-sm text-muted-foreground">
                See how your settings affect recommended quantities
              </p>
            </div>

            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sample Calculation</CardTitle>
                <CardDescription>Based on 45 sales, 5 manual adjustments, 20 PO items, 2 returns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1: Weighted demand */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <span className="text-sm font-medium">1. Weighted Demand</span>
                    <p className="text-xs text-muted-foreground">Sum of (source × weight)</p>
                  </div>
                  <Badge variant="secondary" className="text-lg font-mono">
                    {calculateExampleWeighted().toFixed(1)} units
                  </Badge>
                </div>

                {/* Step 2: Daily velocity */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <span className="text-sm font-medium">2. Daily Velocity</span>
                    <p className="text-xs text-muted-foreground">{calculateExampleWeighted().toFixed(1)} ÷ {config.lookback_days} days</p>
                  </div>
                  <Badge variant="secondary" className="text-lg font-mono">
                    {calculateDailyVelocity().toFixed(2)}/day
                  </Badge>
                </div>

                {/* Step 3: Method calculation */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <span className="text-sm font-medium">3. {METHODS.find(m => m.method === config.calculation_method)?.title}</span>
                    <p className="text-xs text-muted-foreground">
                      {config.calculation_method === 'simple' 
                        ? `${calculateExampleWeighted().toFixed(1)} ÷ 2`
                        : `${calculateDailyVelocity().toFixed(2)} × (${config.lead_time_days} + ${config.safety_stock_days})`
                      }
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg font-mono">
                    {config.calculation_method === 'simple' 
                      ? (calculateExampleWeighted() / 2).toFixed(1)
                      : (calculateDailyVelocity() * (config.lead_time_days + config.safety_stock_days)).toFixed(1)
                    } units
                  </Badge>
                </div>

                {/* Final result */}
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/30">
                  <div>
                    <span className="font-semibold">Final Recommendation</span>
                    <p className="text-xs text-muted-foreground">After applying min/max/rounding constraints</p>
                  </div>
                  <Badge className="text-xl font-mono bg-primary text-primary-foreground px-4 py-2">
                    {calculateFinalExample()} units
                  </Badge>
                </div>

                {/* Active sources summary */}
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground mb-2 block">Active Sources</Label>
                  <div className="flex flex-wrap gap-2">
                    {config.include_sales && (
                      <Badge variant="outline">Sales ×{config.sales_weight}</Badge>
                    )}
                    {config.include_manual_adjustments && (
                      <Badge variant="outline">Manual ×{config.manual_adjustment_weight}</Badge>
                    )}
                    {config.include_po_restocks && (
                      <Badge variant="outline">PO ×{config.po_restock_weight}</Badge>
                    )}
                    {config.include_returns && (
                      <Badge variant="outline">Returns ×{config.return_weight}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                This is a sample calculation. Actual recommendations will vary based on each item's real sales history.
              </AlertDescription>
            </Alert>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Replenishment Calculation Settings
          </DialogTitle>
        </DialogHeader>

        {/* Config Name */}
        <div className="flex items-center gap-4 py-2 border-b">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Configuration Name</Label>
            <Input
              value={config.config_name}
              onChange={(e) => setConfig({ ...config, config_name: e.target.value })}
              placeholder="e.g., Fast Moving Items Config"
              className="h-9 mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.is_default}
              onCheckedChange={(checked) => setConfig({ ...config, is_default: checked })}
              id="default-switch"
            />
            <Label htmlFor="default-switch" className="text-sm cursor-pointer">
              Set as default
            </Label>
          </div>
        </div>

        {/* Step Progress */}
        <div className="py-4">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  currentStep === index
                    ? "bg-primary text-primary-foreground"
                    : currentStep > index
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <step.icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </button>
            ))}
          </div>
          <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-1" />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {renderStepContent()}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onOpenChange(false)}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} className="gap-2">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Only'}
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
                  <Zap className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save & Recalculate'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Search, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Papa from 'papaparse';

interface ReplenishmentConfig {
  id: string;
  config_name: string;
  calculation_method: string;
  is_default: boolean;
}

interface RestockItem {
  id: string;
  asin?: string;
  serial_number?: string;
  title?: string;
  sku?: string;
  current_quantity?: number;
  quantity?: number;
  table_name: string;
}

interface ComparisonItem {
  id: string;
  identifier: string;
  title: string;
  current_quantity: number;
  quantities: Record<string, number>; // config_id -> recommended quantity
}

interface ConfigComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableConfigs: ReplenishmentConfig[];
  items: RestockItem[];
}

export function ConfigComparisonDialog({
  open,
  onOpenChange,
  availableConfigs,
  items,
}: ConfigComparisonDialogProps) {
  const { toast } = useToast();
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-select up to 2 configs when dialog opens
  useEffect(() => {
    if (open && availableConfigs.length > 0 && selectedConfigIds.length === 0) {
      const defaultConfig = availableConfigs.find(c => c.is_default);
      const otherConfig = availableConfigs.find(c => !c.is_default);
      
      const initialConfigs = [
        defaultConfig?.id,
        otherConfig?.id,
      ].filter(Boolean) as string[];
      
      setSelectedConfigIds(initialConfigs.slice(0, 2));
    }
  }, [open, availableConfigs]);

  const toggleConfig = (configId: string) => {
    if (selectedConfigIds.includes(configId)) {
      setSelectedConfigIds(selectedConfigIds.filter(id => id !== configId));
    } else if (selectedConfigIds.length < 3) {
      setSelectedConfigIds([...selectedConfigIds, configId]);
    } else {
      toast({
        title: "Maximum Reached",
        description: "You can compare up to 3 configurations at once",
        variant: "destructive",
      });
    }
  };

  const calculateRecommendedQuantity = async (
    item: RestockItem,
    configId: string
  ): Promise<number> => {
    try {
      const config = availableConfigs.find(c => c.id === configId);
      if (!config) return 1;

      const { data, error } = await supabase.functions.invoke('calculate-replenishment-quantity', {
        body: {
          inventory_id: item.id,
          inventory_type: item.table_name === 'asin_inventory' ? 'asin' : 'sku',
          config,
        },
      });

      if (error) {
        console.error('Error calculating for config:', configId, error);
        return 1;
      }

      return data?.recommended_quantity || 1;
    } catch (error) {
      console.error('Error calculating quantity:', error);
      return 1;
    }
  };

  const runComparison = async () => {
    if (selectedConfigIds.length < 2) {
      toast({
        title: "Select Configurations",
        description: "Please select at least 2 configurations to compare",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Take first 20 items for comparison to avoid long processing times
      const itemsToCompare = items.slice(0, 20);
      
      const comparisonResults: ComparisonItem[] = await Promise.all(
        itemsToCompare.map(async (item) => {
          const quantities: Record<string, number> = {};
          
          // Calculate for each selected config
          for (const configId of selectedConfigIds) {
            quantities[configId] = await calculateRecommendedQuantity(item, configId);
          }

          return {
            id: item.id,
            identifier: `${item.asin || item.sku || 'Unknown'} (${item.serial_number || ''})`,
            title: item.title || '',
            current_quantity: item.current_quantity || item.quantity || 0,
            quantities,
          };
        })
      );

      setComparisonData(comparisonResults);
      toast({
        title: "Comparison Complete",
        description: `Compared ${comparisonResults.length} items across ${selectedConfigIds.length} configurations`,
      });
    } catch (error) {
      console.error('Error running comparison:', error);
      toast({
        title: "Error",
        description: "Failed to run comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifferenceIndicator = (quantities: Record<string, number>) => {
    const values = Object.values(quantities);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min;
    const percentDiff = min > 0 ? ((diff / min) * 100).toFixed(0) : 0;

    if (diff === 0) {
      return { icon: Minus, color: 'text-muted-foreground', text: 'Same', badge: 'secondary' };
    } else if (diff <= 2) {
      return { icon: Minus, color: 'text-blue-500', text: `±${diff}`, badge: 'default' };
    } else {
      return { icon: TrendingUp, color: 'text-orange-500', text: `±${diff} (${percentDiff}%)`, badge: 'destructive' };
    }
  };

  const exportComparison = () => {
    const csvData = comparisonData.map(item => {
      const row: any = {
        Identifier: item.identifier,
        Title: item.title,
        'Current Qty': item.current_quantity,
      };

      selectedConfigIds.forEach(configId => {
        const configName = availableConfigs.find(c => c.id === configId)?.config_name || configId;
        row[`${configName} Recommended`] = item.quantities[configId];
      });

      // Add variance
      const values = Object.values(item.quantities);
      const min = Math.min(...values);
      const max = Math.max(...values);
      row['Max Difference'] = max - min;

      return row;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Comparison data exported to CSV",
    });
  };

  const filteredData = comparisonData.filter(item =>
    item.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configuration Comparison</DialogTitle>
          <p className="text-muted-foreground">
            Compare recommended quantities across different calculation methods
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Config Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Configurations (2-3)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableConfigs.map(config => (
                  <div
                    key={config.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedConfigIds.includes(config.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleConfig(config.id)}
                  >
                    <Checkbox
                      checked={selectedConfigIds.includes(config.id)}
                      onCheckedChange={() => toggleConfig(config.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{config.config_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {config.calculation_method}
                        {config.is_default && ' • Default'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <Button
                  onClick={runComparison}
                  disabled={loading || selectedConfigIds.length < 2}
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    'Run Comparison'
                  )}
                </Button>
                {comparisonData.length > 0 && (
                  <Button variant="outline" onClick={exportComparison} className="gap-2">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {comparisonData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Comparison Results ({filteredData.length} items)
                  </CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData.map(item => {
                    const diffIndicator = getDifferenceIndicator(item.quantities);
                    const DiffIcon = diffIndicator.icon;

                    return (
                      <div
                        key={item.id}
                        className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.identifier}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {item.title}
                            </div>
                          </div>
                          <Badge variant={diffIndicator.badge as any} className="gap-1 shrink-0">
                            <DiffIcon className="w-3 h-3" />
                            {diffIndicator.text}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Current Stock</div>
                            <div className="text-lg font-semibold">{item.current_quantity}</div>
                          </div>

                          {selectedConfigIds.map(configId => {
                            const config = availableConfigs.find(c => c.id === configId);
                            const quantity = item.quantities[configId];

                            return (
                              <div key={configId}>
                                <div className="text-xs text-muted-foreground mb-1 truncate">
                                  {config?.config_name}
                                </div>
                                <div className="text-lg font-semibold text-primary">
                                  {quantity}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

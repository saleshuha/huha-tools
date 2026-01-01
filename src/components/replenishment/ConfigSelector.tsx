import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  Plus, 
  Star, 
  Edit2, 
  Trash2, 
  Check,
  Settings2,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReplenishmentConfig {
  id: string;
  config_name: string;
  is_default: boolean;
  calculation_method: string;
  lookback_days: number;
  notes?: string;
}

interface ConfigSelectorProps {
  configs: ReplenishmentConfig[];
  selectedConfigId: string | null;
  onSelect: (configId: string) => void;
  onEdit: (config: ReplenishmentConfig) => void;
  onDelete: (config: ReplenishmentConfig) => void;
  onCreate: () => void;
  disabled?: boolean;
}

const methodLabels: Record<string, string> = {
  simple: 'Simple',
  velocity_based: 'Velocity',
  days_of_stock: 'Days of Stock',
  weighted_average: 'Weighted',
};

export function ConfigSelector({
  configs,
  selectedConfigId,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  disabled = false,
}: ConfigSelectorProps) {
  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-10 gap-2 min-w-[200px] justify-between font-medium",
                selectedConfig ? "border-primary/30 bg-primary/5" : "border-dashed"
              )}
              disabled={disabled}
            >
              <div className="flex items-center gap-2 truncate">
                <Calculator className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">
                  {selectedConfig?.config_name || 'Select configuration'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-[300px]">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Calculation Configurations
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {configs.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                No configurations found.
                <br />
                Create your first one below.
              </div>
            ) : (
              configs.map((config) => (
                <DropdownMenuItem
                  key={config.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer",
                    config.id === selectedConfigId && "bg-primary/10"
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    onSelect(config.id);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {config.id === selectedConfigId && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{config.config_name}</span>
                        {config.is_default && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600">
                            <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {methodLabels[config.calculation_method] || config.calculation_method} • {config.lookback_days}d lookback
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(config);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit configuration</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(config);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete configuration</TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
              ))
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onCreate}
              className="gap-2 text-primary cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Configuration
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SourceWeightSliderProps {
  label: string;
  description: string;
  enabled: boolean;
  weight: number;
  onEnabledChange: (enabled: boolean) => void;
  onWeightChange: (weight: number) => void;
  isPrimary?: boolean;
  icon?: React.ReactNode;
}

export function SourceWeightSlider({
  label,
  description,
  enabled,
  weight,
  onEnabledChange,
  onWeightChange,
  isPrimary,
  icon,
}: SourceWeightSliderProps) {
  const getWeightLabel = (w: number): string => {
    if (w === 0) return 'None';
    if (w <= 0.3) return 'Low';
    if (w <= 0.7) return 'Medium';
    if (w <= 1.0) return 'Normal';
    if (w <= 1.5) return 'High';
    return 'Max';
  };

  const getWeightColor = (w: number): string => {
    if (w === 0) return 'bg-muted text-muted-foreground';
    if (w <= 0.5) return 'bg-blue-500/20 text-blue-600';
    if (w <= 1.0) return 'bg-emerald-500/20 text-emerald-600';
    if (w <= 1.5) return 'bg-amber-500/20 text-amber-600';
    return 'bg-red-500/20 text-red-600';
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all duration-200",
      enabled 
        ? isPrimary 
          ? "bg-primary/5 border-primary/30" 
          : "bg-background border-border"
        : "bg-muted/30 border-transparent opacity-60"
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left side - Toggle and label */}
        <div className="flex items-start gap-3 flex-1">
          {icon && (
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Label className="font-medium">{label}</Label>
              {isPrimary && (
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">
                  Primary
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Right side - Switch */}
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {/* Weight slider - only show when enabled */}
      {enabled && (
        <div className="mt-4 pl-13">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground">Impact Weight</Label>
            <Badge className={cn("text-xs", getWeightColor(weight))}>
              {weight.toFixed(1)}x ({getWeightLabel(weight)})
            </Badge>
          </div>
          <Slider
            value={[weight]}
            onValueChange={(v) => onWeightChange(v[0])}
            min={0}
            max={2}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>0x (Ignore)</span>
            <span>1x (Normal)</span>
            <span>2x (Double)</span>
          </div>
        </div>
      )}
    </div>
  );
}

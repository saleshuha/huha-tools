import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calculator, TrendingUp, Calendar, Scale, CheckCircle2 } from 'lucide-react';

interface MethodCardProps {
  method: string;
  title: string;
  description: string;
  formula: string;
  isSelected: boolean;
  onSelect: () => void;
  recommended?: boolean;
}

const methodIcons: Record<string, React.ReactNode> = {
  simple: <Calculator className="w-6 h-6" />,
  velocity_based: <TrendingUp className="w-6 h-6" />,
  days_of_stock: <Calendar className="w-6 h-6" />,
  weighted_average: <Scale className="w-6 h-6" />,
};

export function MethodCard({
  method,
  title,
  description,
  formula,
  isSelected,
  onSelect,
  recommended,
}: MethodCardProps) {
  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-300 hover:shadow-lg",
        isSelected
          ? "border-2 border-primary ring-2 ring-primary/20 bg-primary/5"
          : "border-2 border-transparent hover:border-muted-foreground/30"
      )}
      onClick={onSelect}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      )}
      
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 text-[10px]">
            Recommended
          </Badge>
        </div>
      )}

      <CardContent className="p-5 pt-8">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
          isSelected 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          {methodIcons[method] || <Calculator className="w-6 h-6" />}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-base mb-2">{title}</h4>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>

        {/* Formula preview */}
        <div className={cn(
          "p-2 rounded-lg text-xs font-mono transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {formula}
        </div>
      </CardContent>
    </Card>
  );
}

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { getConfidenceLevel } from '@/utils/fuzzy-matcher';

interface MatchingConfidenceBadgeProps {
  confidence: number;
  showIcon?: boolean;
  className?: string;
}

export const MatchingConfidenceBadge: React.FC<MatchingConfidenceBadgeProps> = ({
  confidence,
  showIcon = true,
  className = ''
}) => {
  const level = getConfidenceLevel(confidence);

  const config = {
    high: {
      variant: 'default' as const,
      className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
      icon: CheckCircle2,
      label: 'High'
    },
    medium: {
      variant: 'secondary' as const,
      className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
      icon: AlertTriangle,
      label: 'Medium'
    },
    low: {
      variant: 'outline' as const,
      className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
      icon: AlertCircle,
      label: 'Low'
    }
  };

  const { className: badgeClass, icon: Icon, label } = config[level];

  return (
    <Badge 
      variant="outline" 
      className={`${badgeClass} ${className} flex items-center gap-1.5 font-medium`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
      <span className="text-xs opacity-75">({confidence}%)</span>
    </Badge>
  );
};

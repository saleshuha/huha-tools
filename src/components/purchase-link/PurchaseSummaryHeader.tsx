import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';

interface PurchaseSummaryHeaderProps {
  title?: string;
  description?: string;
  expiresAt?: string;
  stats: {
    total: number;
    purchased: number;
    partial: number;
    notAvailable: number;
    pending: number;
  };
  lastUpdated?: string;
}

export function PurchaseSummaryHeader({
  title,
  description,
  expiresAt,
  stats,
  lastUpdated,
}: PurchaseSummaryHeaderProps) {
  const completionPercentage = stats.total > 0
    ? Math.round(((stats.purchased + stats.partial * 0.5) / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-2">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary flex-shrink-0" />
            <h1 className="text-sm font-semibold truncate">{title || 'Purchase Tracking'}</h1>
          </div>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 ml-6 line-clamp-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {expiresAt && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              {new Date(expiresAt).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar + stats inline */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
            <div className="bg-green-500 transition-all duration-500" style={{ width: `${(stats.purchased / (stats.total || 1)) * 100}%` }} />
            <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${(stats.partial / (stats.total || 1)) * 100}%` }} />
            <div className="bg-red-400 transition-all duration-500" style={{ width: `${(stats.notAvailable / (stats.total || 1)) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-foreground flex-shrink-0">{completionPercentage}%</span>
        </div>

        {/* Compact stat pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatPill icon={<Package className="h-3 w-3" />} value={stats.total} label="Total" />
          <StatPill icon={<CheckCircle2 className="h-3 w-3 text-green-500" />} value={stats.purchased} label="Done" />
          <StatPill icon={<AlertCircle className="h-3 w-3 text-yellow-500" />} value={stats.partial} label="Partial" />
          <StatPill icon={<XCircle className="h-3 w-3 text-red-400" />} value={stats.notAvailable} label="N/A" />
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 bg-muted/60 rounded-full px-2 py-0.5">
      {icon}
      <span className="text-[11px] font-semibold">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

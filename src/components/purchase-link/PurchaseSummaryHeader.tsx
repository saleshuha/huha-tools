import { Card } from '@/components/ui/card';
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
    <Card className="overflow-hidden">
      {/* Top accent */}
      <div className="h-1 bg-primary" />
      
      <div className="p-4 md:p-6 space-y-4">
        {/* Title section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold leading-tight truncate">{title || 'Purchase Tracking'}</h1>
            {description && (
              <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {expiresAt && (
              <Badge variant="outline" className="text-[11px]">
                <Clock className="h-3 w-3 mr-1" />
                Expires {new Date(expiresAt).toLocaleDateString()}
              </Badge>
            )}
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground">
                Updated: {new Date(lastUpdated).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Stats + Ring */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Completion Ring */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 md:w-24 md:h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="7" fill="none" className="text-muted" />
                <circle
                  cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="7" fill="none"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - completionPercentage / 100)}`}
                  className="text-primary transition-all duration-700"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg md:text-xl font-bold">{completionPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
            <StatCard icon={<Package className="h-4 w-4" />} label="Total" value={stats.total.toLocaleString()} color="text-foreground" />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Done" value={stats.purchased.toLocaleString()} color="text-green-500" />
            <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Partial" value={stats.partial.toLocaleString()} color="text-yellow-500" />
            <StatCard icon={<XCircle className="h-4 w-4" />} label="N/A" value={stats.notAvailable.toLocaleString()} color="text-red-400" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{(stats.purchased + stats.partial).toLocaleString()} / {stats.total.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            <div className="bg-green-500 transition-all duration-500" style={{ width: `${(stats.purchased / (stats.total || 1)) * 100}%` }} />
            <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${(stats.partial / (stats.total || 1)) * 100}%` }} />
            <div className="bg-red-400 transition-all duration-500" style={{ width: `${(stats.notAvailable / (stats.total || 1)) * 100}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string; }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
      <div className={`flex items-center justify-center gap-1 ${color} mb-0.5`}>
        {icon}
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

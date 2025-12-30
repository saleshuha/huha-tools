import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, CheckCircle2, AlertCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

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
    <Card className="p-6">
      <div className="space-y-4">
        {/* Title and Description */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">{title || 'Purchase Tracking'}</h1>
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {expiresAt && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Expires {new Date(expiresAt).toLocaleDateString()}
              </Badge>
            )}
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last update: {new Date(lastUpdated).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Progress Ring and Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Completion Circle */}
          <div className="col-span-2 md:col-span-1 flex items-center justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercentage / 100)}`}
                  className="text-primary transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{completionPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <StatCard
            icon={<Package className="h-4 w-4" />}
            label="Total"
            value={stats.total}
            color="text-foreground"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Complete"
            value={stats.purchased}
            color="text-green-500"
          />
          <StatCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="Partial"
            value={stats.partial}
            color="text-yellow-500"
          />
          <StatCard
            icon={<XCircle className="h-4 w-4" />}
            label="Unavailable"
            value={stats.notAvailable}
            color="text-red-500"
          />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{stats.purchased + stats.partial} / {stats.total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${(stats.purchased / stats.total) * 100}%` }}
            />
            <div 
              className="bg-yellow-500 transition-all duration-500"
              style={{ width: `${(stats.partial / stats.total) * 100}%` }}
            />
            <div 
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${(stats.notAvailable / stats.total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

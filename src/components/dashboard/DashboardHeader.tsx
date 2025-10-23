import React from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: Date;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onRefresh,
  isRefreshing,
  lastUpdated
}) => {
  const { selectedCountry } = useCountry();
  const countryFlag = selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦';
  const countryName = selectedCountry === 'UAE' ? 'UAE' : 'Saudi Arabia';

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{countryFlag}</span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {countryName} Operations Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Comprehensive business intelligence and metrics
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

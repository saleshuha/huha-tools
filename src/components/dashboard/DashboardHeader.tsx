import React from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onRefresh,
  isRefreshing
}) => {
  const { selectedCountry } = useCountry();
  const countryFlag = selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦';
  const countryName = selectedCountry === 'UAE' ? 'UAE' : 'Saudi Arabia';

  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{countryFlag}</span>
            <div>
              <h1 className="text-2xl font-bold">
                {countryName} Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Business metrics and analytics
              </p>
            </div>
          </div>
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
  );
};

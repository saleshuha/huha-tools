import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Package, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface VelocityMetricsCardsProps {
  metrics: {
    fastMoving: number;
    mediumMoving: number;
    slowMoving: number;
    noSales: number;
    urgentRestocks: Array<{ asin_id: string; title: string; recommendation: number }>;
    weekSales: number;
    avgDailySales: number;
  } | null;
  loading: boolean;
}

export const VelocityMetricsCards: React.FC<VelocityMetricsCardsProps> = ({
  metrics,
  loading
}) => {
  const navigate = useNavigate();

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  if (!metrics) return null;

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/replenishment')}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Velocity & Restocks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Fast Moving</p>
            <p className="text-xl font-bold text-green-600">{metrics.fastMoving}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Slow Moving</p>
            <p className="text-xl font-bold text-orange-600">{metrics.slowMoving}</p>
          </div>
          <div>
            <p className="text-muted-foreground">7-Day Sales</p>
            <p className="text-xl font-bold">{metrics.weekSales}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Urgent Restocks</p>
            <p className="text-xl font-bold text-red-600">{metrics.urgentRestocks.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

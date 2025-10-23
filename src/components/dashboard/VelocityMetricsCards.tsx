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
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      {/* Velocity Summary */}
      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/replenishment')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-yellow-500" />
            Velocity Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Fast Moving</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{metrics.fastMoving}</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-green-500" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Medium Moving</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{metrics.mediumMoving}</span>
              <div className="flex gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-yellow-500" />
                ))}
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Slow Moving</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{metrics.slowMoving}</span>
              <div className="flex gap-0.5">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-orange-500" />
                ))}
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">No Sales</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{metrics.noSales}</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Restocks */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-red-500" />
            Urgent Restocks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {metrics.urgentRestocks.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
              <span className="truncate flex-1">{item.title || item.asin_id}</span>
              <span className="font-semibold text-orange-600 ml-2">→ {item.recommendation} units</span>
            </div>
          ))}
          {metrics.urgentRestocks.length > 5 && (
            <Button 
              variant="link" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => navigate('/replenishment')}
            >
              View All ({metrics.urgentRestocks.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 7-Day Sales */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-green-500" />
            7-Day Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Sold</span>
              <span className="text-2xl font-bold">{metrics.weekSales}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Daily Average</span>
              <span className="text-lg font-semibold">{metrics.avgDailySales.toFixed(1)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

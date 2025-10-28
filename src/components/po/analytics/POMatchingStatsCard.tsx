import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle } from 'lucide-react';
import { MatchingStatsData } from '@/hooks/usePOAnalytics';

interface POMatchingStatsCardProps {
  data: MatchingStatsData;
}

export const POMatchingStatsCard: React.FC<POMatchingStatsCardProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4" />
          Sunsky SKU Matching Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Match Rate</span>
            <span className="text-2xl font-bold">{data.rate}%</span>
          </div>
          <Progress value={data.rate} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Matched</span>
            </div>
            <p className="text-2xl font-bold">{data.matched}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Unmatched</span>
            </div>
            <p className="text-2xl font-bold">{data.unmatched}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

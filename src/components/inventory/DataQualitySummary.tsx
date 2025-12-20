import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, FileText, Type, ImageIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataQualitySummaryProps {
  missingSku: number;
  missingTitle: number;
  missingImages: number;
  totalAsins: number;
  onClickSku?: () => void;
  onClickTitle?: () => void;
  onClickImages?: () => void;
  className?: string;
}

export const DataQualitySummary: React.FC<DataQualitySummaryProps> = ({
  missingSku,
  missingTitle,
  missingImages,
  totalAsins,
  onClickSku,
  onClickTitle,
  onClickImages,
  className
}) => {
  const totalIssues = missingSku + missingTitle + missingImages;
  const issuePercentage = totalAsins > 0 ? (totalIssues / (totalAsins * 3)) * 100 : 0;
  
  // Determine severity
  const getSeverity = () => {
    if (issuePercentage === 0) return { color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Complete', border: 'border-emerald-500' };
    if (issuePercentage < 5) return { color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Good', border: 'border-emerald-500' };
    if (issuePercentage < 15) return { color: 'text-yellow-600', bg: 'bg-yellow-500/10', label: 'Fair', border: 'border-yellow-500' };
    if (issuePercentage < 30) return { color: 'text-orange-600', bg: 'bg-orange-500/10', label: 'Needs Work', border: 'border-orange-500' };
    return { color: 'text-red-600', bg: 'bg-red-500/10', label: 'Critical', border: 'border-red-500' };
  };

  const severity = getSeverity();
  const completeness = Math.round(100 - issuePercentage);

  const issues = [
    { label: 'Missing SKU', value: missingSku, icon: FileText, onClick: onClickSku, color: 'text-orange-600' },
    { label: 'Missing Title', value: missingTitle, icon: Type, onClick: onClickTitle, color: 'text-yellow-600' },
    { label: 'Missing Images', value: missingImages, icon: ImageIcon, onClick: onClickImages, color: 'text-pink-600' }
  ];

  return (
    <Card className={cn('border-2 bg-gradient-to-br from-card to-background', className)}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', severity.bg)}>
              <AlertTriangle className={cn('h-4 w-4', severity.color)} />
            </div>
            <CardTitle className="text-sm font-semibold">Data Quality</CardTitle>
          </div>
          <Badge variant="outline" className={cn('text-[10px]', severity.color)}>
            {severity.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Completeness bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Data Completeness</span>
            <span className={cn('font-medium', severity.color)}>{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-1.5" />
        </div>

        {/* Issue breakdown */}
        <div className="space-y-1.5">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center justify-between py-1 px-2 rounded-md transition-colors',
                issue.value > 0 ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60'
              )}
              onClick={issue.value > 0 ? issue.onClick : undefined}
            >
              <div className="flex items-center gap-2">
                <issue.icon className={cn('w-3 h-3', issue.value > 0 ? issue.color : 'text-muted-foreground')} />
                <span className="text-xs text-muted-foreground">{issue.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={cn('text-xs font-medium', issue.value > 0 ? issue.color : 'text-muted-foreground')}>
                  {issue.value.toLocaleString()}
                </span>
                {issue.value > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground">Total Issues</span>
          <span className={cn('text-sm font-bold', totalIssues > 0 ? severity.color : 'text-emerald-600')}>
            {totalIssues.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

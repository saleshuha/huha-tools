import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { ExcelData } from '@/types/excel';

interface MappingProgressIndicatorProps {
  sourceData: ExcelData | null;
  targetData: ExcelData | null;
  mappingCount: number;
}

export const MappingProgressIndicator: React.FC<MappingProgressIndicatorProps> = ({
  sourceData,
  targetData,
  mappingCount
}) => {
  return (
    <Card className="mb-8 p-6 bg-gradient-surface">
      <div className="flex items-center justify-center space-x-8">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            sourceData ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {sourceData ? <CheckCircle className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
          </div>
          <span className={sourceData ? 'text-success font-medium' : 'text-muted-foreground'}>
            Source File
          </span>
          {sourceData && (
            <Badge variant="secondary" className="ml-2">
              {sourceData.headers.length} columns
            </Badge>
          )}
        </div>

        <ArrowRight className="w-5 h-5 text-muted-foreground" />

        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            targetData ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {targetData ? <CheckCircle className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
          </div>
          <span className={targetData ? 'text-success font-medium' : 'text-muted-foreground'}>
            Target File
          </span>
          {targetData && (
            <Badge variant="secondary" className="ml-2">
              {targetData.headers.length} columns
            </Badge>
          )}
        </div>

        <ArrowRight className="w-5 h-5 text-muted-foreground" />

        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            mappingCount > 0 ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <span className="text-sm font-bold">{mappingCount}</span>
          </div>
          <span className={mappingCount > 0 ? 'text-success font-medium' : 'text-muted-foreground'}>
            Mappings
          </span>
        </div>
      </div>
    </Card>
  );
};
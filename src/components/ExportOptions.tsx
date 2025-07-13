import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileSpreadsheet, 
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import type { ExcelData } from '@/types/excel';

interface ExportOptionsProps {
  isReady: boolean;
  mappingCount: number;
  sourceData: ExcelData | null;
  targetData: ExcelData | null;
  onExport: () => void;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  isReady,
  mappingCount,
  sourceData,
  targetData,
  onExport
}) => {
  return (
    <Card className="p-6 bg-gradient-surface">
      <div className="text-center space-y-6">
        <h3 className="text-2xl font-semibold flex items-center justify-center space-x-2">
          <Download className="w-6 h-6 text-primary" />
          <span>Export Mapped Data</span>
        </h3>

        {isReady ? (
          <div className="space-y-6">
            {/* Export Summary */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="font-medium">Source Rows</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {sourceData?.data.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Data rows to export
                </div>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center space-x-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-accent" />
                  <span className="font-medium">Mappings</span>
                </div>
                <div className="text-2xl font-bold text-accent">
                  {mappingCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Column mappings created
                </div>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center space-x-2 mb-2">
                  <FileSpreadsheet className="w-4 h-4 text-success" />
                  <span className="font-medium">Target Columns</span>
                </div>
                <div className="text-2xl font-bold text-success">
                  {targetData?.headers.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total target structure
                </div>
              </div>
            </div>

            <Separator />

            {/* Export Details */}
            <div className="bg-success/10 rounded-lg p-4 border border-success/20">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-medium text-success">Ready to Export</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Source data will be mapped to target column structure</p>
                <p>• Unmapped columns will remain empty in the export</p>
                <p>• File will be saved as "mapped_data.xlsx"</p>
              </div>
            </div>

            {/* Export Button */}
            <Button 
              onClick={onExport}
              size="lg"
              className="btn-gradient text-lg px-8 py-3 shadow-medium hover:shadow-strong"
            >
              <Download className="w-5 h-5 mr-2" />
              Export Mapped Data
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="font-medium text-warning">Export Not Ready</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Complete these steps to enable export:</p>
                <div className="space-y-1 ml-4">
                  <div className="flex items-center space-x-2">
                    {sourceData ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-muted rounded-full" />
                    )}
                    <span className={sourceData ? 'text-success' : 'text-muted-foreground'}>
                      Upload source Excel file
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {targetData ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-muted rounded-full" />
                    )}
                    <span className={targetData ? 'text-success' : 'text-muted-foreground'}>
                      Upload target Excel file
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {mappingCount > 0 ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-muted rounded-full" />
                    )}
                    <span className={mappingCount > 0 ? 'text-success' : 'text-muted-foreground'}>
                      Create at least one column mapping
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Button disabled size="lg" className="text-lg px-8 py-3">
              <Download className="w-5 h-5 mr-2" />
              Export Mapped Data
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
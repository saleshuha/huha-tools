import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight } from "lucide-react";

interface ColumnMappingWizardProps {
  fileData: any;
  expectedColumns?: string[];
  onMappingComplete: (mappedData: any) => void;
}

export function ColumnMappingWizard({ 
  fileData, 
  expectedColumns = ['sku_code', 'title', 'description', 'cost', 'weight', 'notes'], 
  onMappingComplete 
}: ColumnMappingWizardProps) {
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [autoMapped, setAutoMapped] = useState<string[]>([]);

  const { headers = [], rows = [] } = fileData || {};

  // Safety check for fileData
  if (!fileData) {
    console.error('ColumnMappingWizard: fileData is required');
    return <div>Error: No file data provided</div>;
  }

  // Auto-detect columns based on similarity
  const autoDetectColumns = () => {
    const detected: { [key: string]: string } = {};
    const mapped: string[] = [];

    // Safety check for expectedColumns and headers
    if (!expectedColumns || !Array.isArray(expectedColumns) || !headers || !Array.isArray(headers)) {
      console.warn('Invalid expectedColumns or headers for auto-detection:', { expectedColumns, headers });
      setColumnMapping(detected);
      setAutoMapped(mapped);
      return;
    }

    expectedColumns.forEach(expectedCol => {
      const normalizedExpected = expectedCol.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const matchingHeader = headers.find((header: string) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedHeader.includes(normalizedExpected.split(' ')[0]) ||
               normalizedExpected.includes(normalizedHeader) ||
               normalizedHeader === normalizedExpected;
      });

      if (matchingHeader) {
        detected[expectedCol] = matchingHeader;
        mapped.push(expectedCol);
      }
    });

    setColumnMapping(detected);
    setAutoMapped(mapped);
  };

  // Auto-detect on mount
  useState(() => {
    autoDetectColumns();
  });

  const handleColumnChange = (expectedColumn: string, selectedHeader: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [expectedColumn]: selectedHeader
    }));
  };

  const processData = () => {
    const mappedData = rows.map((row: any[]) => {
      const processedRow: any = {};
      
      Object.entries(columnMapping).forEach(([expectedCol, headerCol]) => {
        const headerIndex = headers.indexOf(headerCol);
        if (headerIndex !== -1) {
          let value = row[headerIndex];
          
          // Convert numeric fields for Noon fees data
          if (expectedCol.toLowerCase().includes('price') || 
              expectedCol.toLowerCase().includes('fee_') || 
              expectedCol.toLowerCase().includes('total') ||
              expectedCol.toLowerCase().includes('amount') || 
              expectedCol.toLowerCase().includes('cost') ||
              expectedCol.toLowerCase().includes('payout') ||
              expectedCol.toLowerCase().includes('vat') ||
              expectedCol.toLowerCase().includes('commission') ||
              expectedCol.toLowerCase().includes('promo') ||
              expectedCol.toLowerCase().includes('markup')) {
            value = parseFloat(value) || 0;
          }
          
          // Keep original field names for Noon data structure
          processedRow[expectedCol] = value;
        }
      });
      
      return processedRow;
    });

    console.log('Processed data sample:', mappedData.slice(0, 2));
    onMappingComplete(mappedData.filter(row => Object.keys(row).length > 0));
  };

  const mappedCount = Object.keys(columnMapping).length;
  const isComplete = mappedCount >= Math.min(4, expectedColumns.length); // At least 4 core columns

  return (
    <div className="space-y-6 max-h-[90vh] overflow-hidden flex flex-col">
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Column Mapping
            <Badge variant={isComplete ? "default" : "secondary"}>
              {mappedCount}/{expectedColumns.length} mapped
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Map your file columns to the expected data fields
              </p>
              <Button variant="outline" size="sm" onClick={autoDetectColumns}>
                Auto-detect
              </Button>
            </div>
            
            <div className="grid gap-4 max-h-64 overflow-y-auto pr-2">
              {expectedColumns.map((expectedCol) => (
                <div key={expectedCol} className="flex items-center gap-4">
                  <div className="w-48 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {autoMapped.includes(expectedCol) && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium text-sm">{expectedCol}</span>
                    </div>
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <Select
                      value={columnMapping[expectedCol] || ""}
                      onValueChange={(value) => handleColumnChange(expectedCol, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column from your file" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {headers.map((header: string) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Sample Data Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto border rounded-lg m-4">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10 border-b">
                  <tr>
                    {Object.keys(columnMapping).map(expectedCol => (
                      <th key={expectedCol} className="text-left p-3 font-medium whitespace-nowrap bg-background">
                        {expectedCol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row: any[], index: number) => (
                    <tr key={index} className="hover:bg-muted/50">
                      {Object.values(columnMapping).map((headerCol, colIndex) => {
                        const headerIndex = headers.indexOf(headerCol);
                        const value = headerIndex !== -1 ? row[headerIndex] : '-';
                        return (
                          <td key={colIndex} className="p-3 border-b whitespace-nowrap max-w-xs truncate" title={String(value)}>
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end flex-shrink-0">
        <Button 
          onClick={processData} 
          disabled={!isComplete}
          className="min-w-32"
        >
          Process Data ({rows.length} rows)
        </Button>
      </div>
    </div>
  );
}
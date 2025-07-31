import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight } from "lucide-react";

interface ColumnMappingWizardProps {
  fileData: any;
  expectedColumns: string[];
  onMappingComplete: (mappedData: any) => void;
}

export function ColumnMappingWizard({ fileData, expectedColumns, onMappingComplete }: ColumnMappingWizardProps) {
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [autoMapped, setAutoMapped] = useState<string[]>([]);

  const { headers, rows } = fileData;

  // Auto-detect columns based on similarity
  const autoDetectColumns = () => {
    const detected: { [key: string]: string } = {};
    const mapped: string[] = [];

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
          
          // Convert numeric fields
          if (expectedCol.toLowerCase().includes('price') || 
              expectedCol.toLowerCase().includes('amount') || 
              expectedCol.toLowerCase().includes('cost') ||
              expectedCol.toLowerCase().includes('payout') ||
              expectedCol.toLowerCase().includes('vat') ||
              expectedCol.toLowerCase().includes('commission')) {
            value = parseFloat(value) || 0;
          }
          
          // Convert field names to camelCase
          const fieldName = expectedCol
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .replace(/\s+/g, ' ')
            .split(' ')
            .map((word, index) => 
              index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join('');
            
          processedRow[fieldName] = value;
        }
      });
      
      return processedRow;
    });

    onMappingComplete(mappedData.filter(row => Object.keys(row).length > 0));
  };

  const mappedCount = Object.keys(columnMapping).length;
  const isComplete = mappedCount >= Math.min(4, expectedColumns.length); // At least 4 core columns

  return (
    <div className="space-y-6">
      <Card>
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
            
            <div className="grid gap-4">
              {expectedColumns.map((expectedCol) => (
                <div key={expectedCol} className="flex items-center gap-4">
                  <div className="w-48">
                    <div className="flex items-center gap-2">
                      {autoMapped.includes(expectedCol) && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium">{expectedCol}</span>
                    </div>
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  
                  <div className="flex-1">
                    <Select
                      value={columnMapping[expectedCol] || ""}
                      onValueChange={(value) => handleColumnChange(expectedCol, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column from your file" />
                      </SelectTrigger>
                      <SelectContent>
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

      <Card>
        <CardHeader>
          <CardTitle>Sample Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {Object.keys(columnMapping).map(expectedCol => (
                    <th key={expectedCol} className="text-left p-2 border-b">
                      {expectedCol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row: any[], index: number) => (
                  <tr key={index}>
                    {Object.values(columnMapping).map((headerCol, colIndex) => {
                      const headerIndex = headers.indexOf(headerCol);
                      return (
                        <td key={colIndex} className="p-2 border-b">
                          {headerIndex !== -1 ? row[headerIndex] : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
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
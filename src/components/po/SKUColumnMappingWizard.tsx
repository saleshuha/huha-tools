import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, Save, Download, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ColumnMappingWizardProps {
  fileData: any;
  expectedColumns: string[];
  onMappingComplete: (mappedData: any, mapping: any) => void;
  savedMappings?: { [key: string]: any };
  onSaveMapping?: (name: string, mapping: any) => void;
}

interface SavedMapping {
  name: string;
  mapping: { [key: string]: string };
  columns: string[];
}

export function ColumnMappingWizard({ 
  fileData, 
  expectedColumns, 
  onMappingComplete, 
  savedMappings = {},
  onSaveMapping 
}: ColumnMappingWizardProps) {
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [autoMapped, setAutoMapped] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [mappingName, setMappingName] = useState('');

  const { headers, rows } = fileData;

  // Auto-detect columns based on similarity
  const autoDetectColumns = () => {
    const detected: { [key: string]: string } = {};
    const mapped: string[] = [];

    expectedColumns.forEach(expectedCol => {
      const normalizedExpected = expectedCol.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Enhanced matching logic for SKU fields
      const matchingHeader = headers.find((header: string) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Specific matching rules for SKU fields
        if (expectedCol === 'sku_code') {
          return normalizedHeader.includes('sku') || normalizedHeader.includes('code') || 
                 normalizedHeader.includes('item') || normalizedHeader.includes('product');
        }
        if (expectedCol === 'title') {
          return normalizedHeader.includes('title') || normalizedHeader.includes('name') || 
                 normalizedHeader.includes('description') || normalizedHeader.includes('product');
        }
        if (expectedCol === 'cost') {
          return normalizedHeader.includes('cost') || normalizedHeader.includes('price') || 
                 normalizedHeader.includes('amount');
        }
        if (expectedCol === 'weight') {
          return normalizedHeader.includes('weight') || normalizedHeader.includes('mass') || 
                 normalizedHeader.includes('kg') || normalizedHeader.includes('gram');
        }
        if (expectedCol === 'description') {
          return normalizedHeader.includes('desc') || normalizedHeader.includes('detail') || 
                 normalizedHeader.includes('info');
        }
        if (expectedCol === 'notes') {
          return normalizedHeader.includes('note') || normalizedHeader.includes('comment') || 
                 normalizedHeader.includes('remark');
        }
        
        // General matching
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

  // Load saved mapping
  const loadSavedMapping = (mappingKey: string) => {
    const savedMapping = savedMappings[mappingKey];
    if (savedMapping) {
      setColumnMapping(savedMapping);
      setAutoMapped(Object.keys(savedMapping));
    }
  };

  // Save current mapping
  const handleSaveMapping = () => {
    if (mappingName.trim() && onSaveMapping) {
      onSaveMapping(mappingName.trim(), columnMapping);
      setShowSaveDialog(false);
      setMappingName('');
    }
  };

  // Auto-detect on mount
  useState(() => {
    autoDetectColumns();
  });

  const handleColumnChange = (expectedColumn: string, selectedHeader: string) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      
      if (selectedHeader === "none") {
        // Remove the mapping if "none" is selected
        delete newMapping[expectedColumn];
      } else {
        // Set the mapping to the selected header
        newMapping[expectedColumn] = selectedHeader;
      }
      
      return newMapping;
    });
  };

  const processData = () => {
    const mappedData = rows.map((row: any[]) => {
      const processedRow: any = {};
      
      Object.entries(columnMapping).forEach(([expectedCol, headerCol]) => {
        const headerIndex = headers.indexOf(headerCol);
        if (headerIndex !== -1) {
          let value = row[headerIndex];
          
          // Convert numeric fields for SKU data
          if (expectedCol === 'cost' || expectedCol === 'weight') {
            value = parseFloat(value) || 0;
          }
          
          // Clean string fields
          if (typeof value === 'string') {
            value = value.trim();
          }
          
          processedRow[expectedCol] = value;
        }
      });
      
      return processedRow;
    });

    console.log('Processed SKU data sample:', mappedData.slice(0, 2));
    onMappingComplete(mappedData.filter(row => Object.keys(row).length > 0), columnMapping);
  };

  const mappedCount = Object.keys(columnMapping).length;
  const isComplete = mappedCount >= Math.min(2, expectedColumns.length); // At least SKU code and one other field

  return (
    <div className="space-y-6 flex flex-col min-h-0">
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            SKU Column Mapping
            <div className="flex items-center space-x-2">
              <Badge variant={isComplete ? "default" : "secondary"}>
                {mappedCount}/{expectedColumns.length} mapped
              </Badge>
              
              {/* Saved Mappings Dropdown */}
              {Object.keys(savedMappings).length > 0 && (
                <Select onValueChange={loadSavedMapping}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Load mapping" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {Object.keys(savedMappings).map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Map your file columns to SKU fields. At minimum, map SKU Code.
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={autoDetectColumns}>
                  Auto-detect
                </Button>
                
                {mappedCount > 0 && onSaveMapping && (
                  <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Save className="h-4 w-4 mr-1" />
                        Save Mapping
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Column Mapping</DialogTitle>
                        <DialogDescription>
                          Save this mapping configuration for future use
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="mapping-name">Mapping Name</Label>
                        <Input
                          id="mapping-name"
                          value={mappingName}
                          onChange={(e) => setMappingName(e.target.value)}
                          placeholder="Enter mapping name (e.g., Supplier A Format)"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveMapping} disabled={!mappingName.trim()}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            
            <div className="grid gap-4 max-h-64 overflow-y-auto pr-2">
              {expectedColumns.map((expectedCol) => (
                <div key={expectedCol} className="flex items-center gap-4">
                  <div className="w-48 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {autoMapped.includes(expectedCol) && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium text-sm">
                        {expectedCol}
                        {expectedCol === 'sku_code' && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {expectedCol === 'sku_code' && 'Required - Product identifier'}
                      {expectedCol === 'title' && 'Product name/title'}
                      {expectedCol === 'cost' && 'Unit cost in currency'}
                      {expectedCol === 'weight' && 'Weight in grams'}
                      {expectedCol === 'description' && 'Product description'}
                      {expectedCol === 'notes' && 'Additional notes'}
                    </div>
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <Select
                      value={columnMapping[expectedCol] || "none"}
                      onValueChange={(value) => handleColumnChange(expectedCol, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column from your file" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50 max-h-48">
                        <SelectItem value="none">-- None --</SelectItem>
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

      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Sample Data Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="flex-1 overflow-auto border rounded-lg m-4 max-h-96">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10 border-b">
                  <tr>
                    {Object.keys(columnMapping).map(expectedCol => (
                      <th key={expectedCol} className="text-left p-3 font-medium whitespace-nowrap bg-background">
                        {expectedCol}
                        {expectedCol === 'sku_code' && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row: any[], index: number) => (
                    <tr key={index} className="hover:bg-muted/50">
                      {Object.values(columnMapping).map((headerCol, colIndex) => {
                        const headerIndex = headers.indexOf(headerCol);
                        let value = headerIndex !== -1 ? row[headerIndex] : '-';
                        
                        // Format preview values
                        const expectedCol = Object.keys(columnMapping)[colIndex];
                        if (expectedCol === 'cost' || expectedCol === 'weight') {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            value = expectedCol === 'cost' ? numValue.toFixed(2) : numValue.toString();
                          }
                        }
                        
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
          
          {mappedCount === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Upload className="h-8 w-8 mb-2" />
              <p className="text-sm">Map columns above to see preview</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          {!columnMapping['sku_code'] && (
            <p className="text-orange-600">⚠️ SKU Code mapping is required</p>
          )}
          {mappedCount > 0 && (
            <p>Ready to process {rows.length} rows with {mappedCount} mapped columns</p>
          )}
        </div>
        
        <Button 
          onClick={processData} 
          disabled={!isComplete || !columnMapping['sku_code']}
          className="min-w-32"
        >
          Process SKU Data ({rows.length} rows)
        </Button>
      </div>
    </div>
  );
}
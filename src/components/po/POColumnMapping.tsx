import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, CheckCircle, RotateCcw } from 'lucide-react';

interface ColumnMappingProps {
  files: { file: File; headers: string[]; data: string[][] }[];
  onMappingComplete: (mappedData: any[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

interface ColumnMapping {
  [fileName: string]: {
    po_number: string;
    sku_code: string;
    quantity: string;
  };
}

const requiredFields = [
  { key: 'po_number', label: 'PO Number', required: true },
  { key: 'sku_code', label: 'SKU Code', required: true },
  { key: 'quantity', label: 'Quantity', required: true },
];

export function POColumnMapping({ files, onMappingComplete, onBack, isLoading }: ColumnMappingProps) {
  const [mappings, setMappings] = useState<ColumnMapping>({});

  const handleColumnMapping = (fileName: string, field: string, column: string) => {
    setMappings(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        [field]: column
      }
    }));
  };

  const getAutoMapping = (headers: string[], fileName: string) => {
    const autoMap: any = {};
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      // Auto-detect PO Number
      if (lowerHeader.includes('po') && (lowerHeader.includes('number') || lowerHeader.includes('no') || lowerHeader.includes('order'))) {
        autoMap.po_number = header;
      }
      // Auto-detect SKU
      else if (lowerHeader.includes('sku') || lowerHeader.includes('code') || lowerHeader.includes('item')) {
        autoMap.sku_code = header;
      }
      // Auto-detect Quantity
      else if (lowerHeader.includes('qty') || lowerHeader.includes('quantity') || lowerHeader.includes('amount')) {
        autoMap.quantity = header;
      }
    });

    if (Object.keys(autoMap).length > 0) {
      setMappings(prev => ({
        ...prev,
        [fileName]: { ...prev[fileName], ...autoMap }
      }));
    }
  };

  const isValidMapping = (fileName: string) => {
    const mapping = mappings[fileName];
    return mapping && 
           mapping.po_number && 
           mapping.sku_code && 
           mapping.quantity;
  };

  const canProceed = files.every(f => isValidMapping(f.file.name));

  const handleProceed = () => {
    const processedData: any[] = [];

    files.forEach(({ file, data }) => {
      const mapping = mappings[file.name];
      if (!mapping) return;

      const headers = data[0];
      const poIndex = headers.indexOf(mapping.po_number);
      const skuIndex = headers.indexOf(mapping.sku_code);
      const qtyIndex = headers.indexOf(mapping.quantity);

      // Process data rows (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[poIndex] && row[skuIndex] && row[qtyIndex]) {
          processedData.push({
            po_number: row[poIndex].trim(),
            sku_code: row[skuIndex].trim(),
            quantity: parseInt(row[qtyIndex]) || 1,
            file_name: file.name
          });
        }
      }
    });

    onMappingComplete(processedData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Map File Columns</h3>
          <p className="text-muted-foreground">
            Map your file columns to the required fields for PO processing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleProceed} 
            disabled={!canProceed || isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Process Files
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {files.map(({ file, headers, data }) => (
          <Card key={file.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{file.name}</span>
                  <Badge variant="outline">{headers.length} columns</Badge>
                  {isValidMapping(file.name) && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mapped
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getAutoMapping(headers, file.name)}
                >
                  Auto Map
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Column Mapping Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {requiredFields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <Select
                      value={mappings[file.name]?.[field.key] || ''}
                      onValueChange={(value) => handleColumnMapping(file.name, field.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Select Column --</SelectItem>
                        {headers.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview Section */}
              <div>
                <h4 className="text-sm font-medium mb-2">Preview (First 3 rows)</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map(header => (
                          <TableHead key={header} className="text-xs">
                            {header}
                            {Object.values(mappings[file.name] || {}).includes(header) && (
                              <ArrowRight className="inline h-3 w-3 ml-1 text-green-500" />
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.slice(1, 4).map((row, index) => (
                        <TableRow key={index}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="text-xs max-w-32 truncate">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mapping Preview */}
              {isValidMapping(file.name) && (
                <div className="bg-green-50 p-3 rounded-md">
                  <h5 className="text-sm font-medium text-green-800 mb-2">Mapping Preview</h5>
                  <div className="text-xs text-green-700 space-y-1">
                    <div>PO Number: <span className="font-mono">{mappings[file.name].po_number}</span></div>
                    <div>SKU Code: <span className="font-mono">{mappings[file.name].sku_code}</span></div>
                    <div>Quantity: <span className="font-mono">{mappings[file.name].quantity}</span></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {files.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="font-semibold mb-2">
                {canProceed ? 'Ready to Process' : 'Complete Mapping Required'}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {canProceed 
                  ? `All ${files.length} file(s) have been mapped and are ready for processing.`
                  : 'Please map all required columns for each file before proceeding.'
                }
              </p>
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Mapped ({files.filter(f => isValidMapping(f.file.name)).length})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Pending ({files.filter(f => !isValidMapping(f.file.name)).length})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, CheckCircle, RotateCcw, Edit3 } from 'lucide-react';

interface ColumnMappingProps {
  files: { file: File; headers: string[]; data: string[][] }[];
  onMappingComplete: (mappedData: any[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

interface ColumnMapping {
  [fileName: string]: {
    po_number: string;
    ship_to_location: string;
    asin: string;
    model_number: string;
    title: string;
    quantity: string; // This will map to "Outstanding Cases"
    external_id?: string; // Optional
    external_id_type?: string; // Optional
    manual_po_number?: string; // Add manual PO number option
  };
}

const requiredFields = [
  { key: 'po_number', label: 'PO Number', required: true },
  { key: 'ship_to_location', label: 'Ship to Location', required: true },
  { key: 'asin', label: 'ASIN', required: true },
  { key: 'model_number', label: 'Model Number', required: true },
  { key: 'title', label: 'Title', required: true },
  { key: 'quantity', label: 'Outstanding Cases (Quantity)', required: true },
];

const optionalFields = [
  { key: 'external_id', label: 'External Id', required: false },
  { key: 'external_id_type', label: 'External Id Type', required: false },
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

  const handleManualPONumber = (fileName: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        manual_po_number: value
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
      // Auto-detect Ship to Location
      else if (lowerHeader.includes('ship') && (lowerHeader.includes('to') || lowerHeader.includes('location'))) {
        autoMap.ship_to_location = header;
      }
      // Auto-detect ASIN
      else if (lowerHeader.includes('asin')) {
        autoMap.asin = header;
      }
      // Auto-detect Model Number
      else if (lowerHeader.includes('model') && lowerHeader.includes('number')) {
        autoMap.model_number = header;
      }
      // Auto-detect Title
      else if (lowerHeader.includes('title') || lowerHeader.includes('product') || lowerHeader.includes('name')) {
        autoMap.title = header;
      }
      // Auto-detect Quantity/Outstanding Cases
      else if (lowerHeader.includes('outstanding') && lowerHeader.includes('cases') || 
               lowerHeader.includes('qty') || lowerHeader.includes('quantity') || 
               lowerHeader.includes('cases')) {
        autoMap.quantity = header;
      }
      // Auto-detect External ID
      else if (lowerHeader.includes('external') && lowerHeader.includes('id')) {
        autoMap.external_id = header;
      }
      // Auto-detect External ID Type
      else if (lowerHeader.includes('external') && lowerHeader.includes('type')) {
        autoMap.external_id_type = header;
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
    const hasColumnPO = mapping && mapping.po_number && mapping.po_number !== 'none';
    const hasManualPO = mapping && mapping.manual_po_number && mapping.manual_po_number.trim();
    
    return mapping && 
           (hasColumnPO || hasManualPO) && // Either column mapped PO or manual PO
           mapping.ship_to_location && 
           mapping.asin && 
           mapping.model_number && 
           mapping.title && 
           mapping.quantity;
  };

  const canProceed = files.every(f => isValidMapping(f.file.name));

  const handleProceed = () => {
    const processedData: any[] = [];

    files.forEach(({ file, data }) => {
      const mapping = mappings[file.name];
      if (!mapping) return;

      const headers = data[0];
      const poIndex = mapping.po_number && mapping.po_number !== 'none' ? headers.indexOf(mapping.po_number) : -1;
      const shipToLocationIndex = headers.indexOf(mapping.ship_to_location);
      const asinIndex = headers.indexOf(mapping.asin);
      const modelNumberIndex = headers.indexOf(mapping.model_number);
      const titleIndex = headers.indexOf(mapping.title);
      const qtyIndex = headers.indexOf(mapping.quantity);
      const externalIdIndex = mapping.external_id ? headers.indexOf(mapping.external_id) : -1;
      const externalIdTypeIndex = mapping.external_id_type ? headers.indexOf(mapping.external_id_type) : -1;

      // Process data rows (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Check if all required fields have data
        if (row[shipToLocationIndex] && row[asinIndex] && row[modelNumberIndex] && 
            row[titleIndex] && row[qtyIndex]) {
          
          const poNumber = poIndex >= 0 ? row[poIndex]?.trim() : mapping.manual_po_number?.trim();
          
          if (poNumber) {
            processedData.push({
              po_number: poNumber,
              ship_to_location: row[shipToLocationIndex].trim(),
              asin: row[asinIndex].trim(),
              model_number: row[modelNumberIndex].trim(),
              title: row[titleIndex].trim(),
              quantity: parseInt(row[qtyIndex]) || 1,
              external_id: externalIdIndex >= 0 ? row[externalIdIndex]?.trim() : null,
              external_id_type: externalIdTypeIndex >= 0 ? row[externalIdTypeIndex]?.trim() : null,
              file_name: file.name
            });
          }
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
                      value={mappings[file.name]?.[field.key] || 'none'}
                      onValueChange={(value) => handleColumnMapping(file.name, field.key, value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Select Column --</SelectItem>
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

               {/* Optional Fields Section */}
               <div className="border-t pt-4">
                 <h4 className="text-sm font-medium mb-3 text-muted-foreground">Optional Fields</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {optionalFields.map(field => (
                     <div key={field.key} className="space-y-2">
                       <label className="text-sm font-medium text-muted-foreground">
                         {field.label}
                       </label>
                       <Select
                         value={mappings[file.name]?.[field.key] || 'none'}
                         onValueChange={(value) => handleColumnMapping(file.name, field.key, value === 'none' ? '' : value)}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Select column (optional)" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">-- Skip This Field --</SelectItem>
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
              </div>

              {/* Manual PO Number Section - Show if PO Number is not mapped */}
              {(!mappings[file.name]?.po_number || mappings[file.name]?.po_number === 'none') && (
                <div className="border-t pt-4">
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-3">
                    <div className="flex items-center space-x-2">
                      <Edit3 className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Manual PO Number Entry
                      </Label>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      Since PO Number column is not mapped, you can enter a PO number that will be used for all rows in this file.
                    </p>
                    <Input
                      placeholder="Enter PO Number (e.g., PO-2025-001)"
                      value={mappings[file.name]?.manual_po_number || ''}
                      onChange={(e) => handleManualPONumber(file.name, e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                </div>
              )}

              {/* Show current mapping status */}
              {mappings[file.name]?.manual_po_number && (
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                      Manual PO Number: <strong>{mappings[file.name].manual_po_number}</strong>
                    </span>
                  </div>
                </div>
              )}

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
                    <div>PO Number: <span className="font-mono">
                      {mappings[file.name].po_number && mappings[file.name].po_number !== 'none' 
                        ? `Column: ${mappings[file.name].po_number}` 
                        : `Manual: ${mappings[file.name].manual_po_number}`}
                    </span></div>
                    <div>Ship to Location: <span className="font-mono">{mappings[file.name].ship_to_location}</span></div>
                    <div>ASIN: <span className="font-mono">{mappings[file.name].asin}</span></div>
                    <div>Model Number: <span className="font-mono">{mappings[file.name].model_number}</span></div>
                    <div>Title: <span className="font-mono">{mappings[file.name].title}</span></div>
                    <div>Quantity: <span className="font-mono">{mappings[file.name].quantity}</span></div>
                    {mappings[file.name].external_id && (
                      <div>External ID: <span className="font-mono">{mappings[file.name].external_id}</span></div>
                    )}
                    {mappings[file.name].external_id_type && (
                      <div>External ID Type: <span className="font-mono">{mappings[file.name].external_id_type}</span></div>
                    )}
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
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, CheckCircle, RotateCcw, Edit3, AlertCircle } from 'lucide-react';

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
  { key: 'quantity', label: 'Outstanding Cases (Quantity)', required: true },
];

const optionalFields = [
  { key: 'model_number', label: 'Model Number', required: false },
  { key: 'title', label: 'Title', required: false },
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
           mapping.quantity;
  };

  const canProceed = files.every(f => isValidMapping(f.file.name));

  // Get validation summary for all files
  const getValidationSummary = () => {
    const issues: { file: string; message: string }[] = [];
    
    files.forEach(({ file }) => {
      const mapping = mappings[file.name];
      
      if (!mapping) {
        issues.push({ file: file.name, message: 'No mapping configured' });
        return;
      }

      const hasColumnPO = mapping.po_number && mapping.po_number !== 'none';
      const hasManualPO = mapping.manual_po_number && mapping.manual_po_number.trim();

      if (!hasColumnPO && !hasManualPO) {
        issues.push({ file: file.name, message: 'PO Number is required' });
      }
      if (!mapping.ship_to_location || mapping.ship_to_location === 'none') {
        issues.push({ file: file.name, message: 'Ship to Location is required' });
      }
      if (!mapping.asin || mapping.asin === 'none') {
        issues.push({ file: file.name, message: 'ASIN is required' });
      }
      if (!mapping.quantity || mapping.quantity === 'none') {
        issues.push({ file: file.name, message: 'Quantity is required' });
      }
    });

    return issues;
  };

  const validationIssues = getValidationSummary();

  const handleProceed = () => {
    const processedData: any[] = [];
    let totalFilesRows = 0;
    let totalSkippedRows = 0;
    const allSkippedReasons: string[] = [];
    let grandTotalDataRows = 0;

    console.log('🚀 POColumnMapping - Starting data processing...');
    console.log('🔍 STAGE 2: Column Mapping & Field Validation');

    files.forEach(({ file, data }) => {
      const mapping = mappings[file.name];
      if (!mapping) {
        console.log(`❌ No mapping found for file: ${file.name}`);
        return;
      }

      const fileDataRows = data.length - 1; // Exclude header
      grandTotalDataRows += fileDataRows;
      console.log(`📄 Processing file: ${file.name} with ${fileDataRows} data rows (${data.length} total rows including header)`);

      const headers = data[0];
      const poIndex = mapping.po_number && mapping.po_number !== 'none' ? headers.indexOf(mapping.po_number) : -1;
      const shipToLocationIndex = headers.indexOf(mapping.ship_to_location);
      const asinIndex = headers.indexOf(mapping.asin);
      const modelNumberIndex = headers.indexOf(mapping.model_number);
      const titleIndex = headers.indexOf(mapping.title);
      const qtyIndex = headers.indexOf(mapping.quantity);
      const externalIdIndex = mapping.external_id ? headers.indexOf(mapping.external_id) : -1;
      const externalIdTypeIndex = mapping.external_id_type ? headers.indexOf(mapping.external_id_type) : -1;

      console.log(`🔍 Column indices for ${file.name}:`, {
        poIndex,
        shipToLocationIndex,
        asinIndex,
        modelNumberIndex,
        titleIndex,
        qtyIndex
      });

      let fileProcessedRows = 0;
      let fileSkippedRows = 0;

      // Process data rows (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        totalFilesRows++;
        
        const rowNumber = i + 1; // +1 because we're counting from header
        const absoluteRowNumber = i; // For arrays (0-based for data rows)
        
        // Get PO number first
        const poNumber = poIndex >= 0 ? row[poIndex]?.trim() : mapping.manual_po_number?.trim();
        
        // Check each required field individually (model_number and title are now optional)
        const missingFields = [];
        if (!poNumber) missingFields.push('po_number');
        if (!row[shipToLocationIndex] || !row[shipToLocationIndex].trim()) missingFields.push('ship_to_location');
        if (!row[asinIndex] || !row[asinIndex].trim()) missingFields.push('asin');
        if (!row[qtyIndex] || !row[qtyIndex].toString().trim()) missingFields.push('quantity');
        
        if (missingFields.length > 0) {
          fileSkippedRows++;
          totalSkippedRows++;
          const skipReason = `${file.name} Row ${rowNumber}: Missing fields: ${missingFields.join(', ')}`;
          allSkippedReasons.push(skipReason);
          console.log(`❌ STAGE 2 SKIP: ${skipReason}`);
          console.log(`   Row data:`, {
            po_number: poNumber || 'MISSING',
            ship_to_location: row[shipToLocationIndex] || 'MISSING',
            asin: row[asinIndex] || 'MISSING',
            model_number: row[modelNumberIndex] || 'MISSING',
            title: row[titleIndex] || 'MISSING',
            quantity: row[qtyIndex] || 'MISSING'
          });
          continue;
        }
        
        // All required fields are present
        const processedRow = {
          po_number: poNumber,
          ship_to_location: row[shipToLocationIndex].trim(),
          asin: row[asinIndex].trim(),
          model_number: (row[modelNumberIndex] && row[modelNumberIndex].trim()) || null,
          title: (row[titleIndex] && row[titleIndex].trim()) || null,
          quantity: parseInt(row[qtyIndex]) || 1,
          external_id: externalIdIndex >= 0 ? row[externalIdIndex]?.trim() : null,
          external_id_type: externalIdTypeIndex >= 0 ? row[externalIdTypeIndex]?.trim() : null,
          file_name: file.name
        };
        
        processedData.push(processedRow);
        fileProcessedRows++;
        console.log(`✅ STAGE 2 PROCESSED: ${file.name} Row ${rowNumber} - PO: ${processedRow.po_number}, SKU: ${processedRow.model_number}, Qty: ${processedRow.quantity}`);
      }

      console.log(`📊 ${file.name} SUMMARY: ${fileProcessedRows} processed, ${fileSkippedRows} skipped out of ${fileDataRows} data rows`);
    });

    console.log('📊 STAGE 2 PROCESSING SUMMARY:');
    console.log(`📁 Total data rows across all files: ${grandTotalDataRows}`);
    console.log(`✅ Successfully processed: ${processedData.length}`);
    console.log(`❌ Skipped rows: ${totalSkippedRows}`);
    console.log(`🔢 Records going to Stage 3 (Database Insert): ${processedData.length}`);
    
    if (allSkippedReasons.length > 0) {
      console.log('❌ All skipped reasons:', allSkippedReasons);
    }

    console.log('🔄 Proceeding to Stage 3 (Database Processing)...');
    onMappingComplete(processedData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Map File Columns</h3>
          <p className="text-sm text-muted-foreground">
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
            Process Files {canProceed && `(${files.length})`}
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      {validationIssues.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Mapping Issues ({validationIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {validationIssues.map((issue, idx) => (
              <div key={idx} className="text-sm text-orange-700 dark:text-orange-300">
                <strong>{issue.file}:</strong> {issue.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Success Summary */}
      {canProceed && validationIssues.length === 0 && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">All files mapped correctly. Ready to process!</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">{/* ... keep existing code */}
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
                      {data.slice(1, 4).map((row, index) => {
                        // Ensure row has exactly the same length as headers
                        const normalizedRow = headers.map((_, cellIndex) => row[cellIndex] || '');
                        return (
                          <TableRow key={index}>
                            {normalizedRow.map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="text-xs max-w-32 truncate">
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
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
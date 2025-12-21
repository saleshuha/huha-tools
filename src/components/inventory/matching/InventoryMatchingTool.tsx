import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Loader2, X, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useInventoryMatching } from '@/hooks/useInventoryMatching';
import { ColumnMappingDialog } from './ColumnMappingDialog';
import { MatchingResultsDisplay } from './MatchingResultsDisplay';
import { useReactToPrint } from 'react-to-print';

interface InventoryMatchingToolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryMatchingTool({ open, onOpenChange }: InventoryMatchingToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [sessionName, setSessionName] = useState('');
  
  const printRef = useRef<HTMLDivElement>(null);
  
  const { 
    isProcessing, 
    results, 
    summary, 
    runMatching, 
    exportToCSV, 
    clearResults 
  } = useInventoryMatching();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Inventory Matching - ${sessionName}`
  });

  // Parse uploaded file
  const parseFile = useCallback(async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (extension === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            if (result.data.length === 0) {
              toast.error('No data found in file');
              return;
            }
            const headers = result.meta.fields || [];
            setHeaders(headers);
            setParsedData(result.data as Record<string, string>[]);
            setShowColumnMapping(true);
          },
          error: (error) => {
            toast.error(`Failed to parse CSV: ${error.message}`);
          }
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { defval: '' });
        
        if (data.length === 0) {
          toast.error('No data found in file');
          return;
        }
        
        const headers = Object.keys(data[0]);
        setHeaders(headers);
        setParsedData(data);
        setShowColumnMapping(true);
      } else {
        toast.error('Unsupported file format. Please upload CSV or Excel file.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse file');
    }
  }, []);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
      parseFile(file);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  // Handle column mapping confirmation
  const handleMappingConfirm = async ({ 
    identifierColumn, 
    quantityColumn, 
    sessionName: name 
  }: { 
    identifierColumn: string; 
    quantityColumn: string; 
    sessionName: string;
  }) => {
    setSessionName(name);
    setShowColumnMapping(false);

    // Extract items from parsed data
    const items = parsedData
      .map(row => ({
        identifier: String(row[identifierColumn] || '').trim(),
        quantity: parseInt(String(row[quantityColumn] || '0').replace(/[^0-9]/g, ''), 10) || 1
      }))
      .filter(item => item.identifier);

    if (items.length === 0) {
      toast.error('No valid items found in file');
      return;
    }

    // Run matching
    await runMatching(items, identifierColumn, name, file?.name);
  };

  // Reset state
  const handleReset = () => {
    setFile(null);
    setHeaders([]);
    setParsedData([]);
    clearResults();
    setSessionName('');
  };

  // Close dialog
  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const hasResults = results.length > 0 && summary;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={cn(
          'max-w-4xl max-h-[90vh] overflow-y-auto',
          hasResults && 'max-w-6xl'
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Inventory Requirements Matching
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!hasResults ? (
              <>
                {/* File Upload Zone */}
                <Card
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed p-8 cursor-pointer transition-all duration-200',
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                    isProcessing && 'pointer-events-none opacity-50'
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-muted-foreground">Processing file...</p>
                      </>
                    ) : file ? (
                      <>
                        <FileSpreadsheet className="w-12 h-12 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {parsedData.length} rows found
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove File
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {isDragActive ? 'Drop file here' : 'Drag & drop your file here'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            or click to browse (CSV, Excel)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                {/* Instructions */}
                <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="font-medium">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Upload a CSV or Excel file containing ASINs/SKUs and required quantities</li>
                    <li>Map your file columns to identifier (ASIN/SKU) and quantity</li>
                    <li>The system matches against your inventory and shows availability</li>
                    <li>Export or print the results for your records</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                {/* Results Display */}
                <MatchingResultsDisplay
                  results={results}
                  summary={summary}
                  sessionName={sessionName}
                  onExportCSV={() => exportToCSV(results, sessionName)}
                  onPrint={() => handlePrint()}
                  printRef={printRef}
                />

                {/* Reset Button */}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleReset}>
                    Run New Match
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Mapping Dialog */}
      <ColumnMappingDialog
        open={showColumnMapping}
        onOpenChange={setShowColumnMapping}
        headers={headers}
        sampleData={parsedData}
        onConfirm={handleMappingConfirm}
      />
    </>
  );
}

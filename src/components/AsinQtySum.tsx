import { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { useExcelExport } from '@/hooks/useExcelExport';
import { Calculator, Download, Upload, FileSpreadsheet, Settings } from 'lucide-react';
import { ExcelData } from '@/types/excel';

interface AsinSummary {
  asin: string;
  totalQty: number;
}

export function AsinQtySum() {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [summaryData, setSummaryData] = useState<AsinSummary[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [headerRowNumber, setHeaderRowNumber] = useState<number>(1);
  const [selectedAsinColumn, setSelectedAsinColumn] = useState<string>('');
  const [selectedQtyColumn, setSelectedQtyColumn] = useState<string>('');
  const { toast } = useToast();
  const { exportMappedData } = useExcelExport();

  const handleFileUpload = useCallback((data: ExcelData | null) => {
    setExcelData(data);
    setSummaryData([]);
    setShowConfiguration(!!data);
    setSelectedAsinColumn('');
    setSelectedQtyColumn('');
  }, []);

  const processAsinSum = useCallback(() => {
    if (!excelData?.data || excelData.data.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload an Excel file first",
        variant: "destructive"
      });
      return;
    }

    if (!selectedAsinColumn || !selectedQtyColumn) {
      toast({
        title: "Columns Not Selected",
        description: "Please select both ASIN and QTY columns",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log("Excel data:", excelData);
      console.log("Header row number:", headerRowNumber);
      console.log("Selected ASIN column:", selectedAsinColumn);
      console.log("Selected QTY column:", selectedQtyColumn);

      const headerRowIndex = headerRowNumber - 1; // Convert to 0-based index
      if (headerRowIndex >= excelData.data.length) {
        toast({
          title: "Invalid Header Row",
          description: "Header row number exceeds the number of rows in the file",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      const headers = excelData.data[headerRowIndex] as string[];
      const asinColumnIndex = headers.indexOf(selectedAsinColumn);
      const qtyColumnIndex = headers.indexOf(selectedQtyColumn);

      if (asinColumnIndex === -1 || qtyColumnIndex === -1) {
        toast({
          title: "Column Not Found",
          description: "Selected columns not found in the specified header row",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      const asinQtyMap = new Map<string, number>();

      // Process data starting from the row after headers
      for (let i = headerRowIndex + 1; i < excelData.data.length; i++) {
        const row = excelData.data[i] as (string | number)[];
        console.log(`Processing row ${i}:`, row);
        
        const asinValue = row[asinColumnIndex];
        const qtyValue = row[qtyColumnIndex];
        
        const asin = String(asinValue || '').trim();
        const qty = Number(qtyValue) || 0;

        console.log(`Row ${i}: ASIN=${asin}, QTY=${qty}`);

        if (asin && qty > 0) {
          const currentQty = asinQtyMap.get(asin) || 0;
          asinQtyMap.set(asin, currentQty + qty);
          console.log(`Updated ASIN ${asin}: ${currentQty} + ${qty} = ${currentQty + qty}`);
        }
      }

      console.log("Final ASIN map:", Array.from(asinQtyMap.entries()));

      const summaryResults: AsinSummary[] = Array.from(asinQtyMap.entries()).map(([asin, totalQty]) => ({
        asin,
        totalQty
      }));

      console.log("Summary results:", summaryResults);

      setSummaryData(summaryResults);
      setShowConfiguration(false);
      
      toast({
        title: "Processing Complete",
        description: `Found ${summaryResults.length} unique ASINs with total quantities`,
        variant: "default"
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: `Error details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }

    setIsProcessing(false);
  }, [excelData, headerRowNumber, selectedAsinColumn, selectedQtyColumn, toast]);

  const handleExport = useCallback(() => {
    if (summaryData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please process the ASIN data first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create CSV content
      const csvData = [
        ['ASIN', 'Total Quantity'],
        ...summaryData.map(item => [item.asin, item.totalQty.toString()])
      ];

      const csvContent = csvData.map(row => 
        row.map(field => {
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',')
      ).join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'ASIN_QTY_Summary.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export successful",
        description: `Exported ${summaryData.length} unique ASINs to CSV format`,
      });
    } catch (error) {
      toast({
        title: "Export error",
        description: "Failed to export file. Please try again.",
        variant: "destructive"
      });
    }
  }, [summaryData, toast]);

  const resetData = () => {
    setExcelData(null);
    setSummaryData([]);
    setShowConfiguration(false);
    setSelectedAsinColumn('');
    setSelectedQtyColumn('');
  };

  // Get available columns for dropdowns
  const getAvailableColumns = () => {
    if (!excelData?.data || excelData.data.length === 0) return [];
    const headerRowIndex = headerRowNumber - 1;
    if (headerRowIndex >= excelData.data.length) return [];
    return excelData.data[headerRowIndex] as string[];
  };

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calculator className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">ASIN QTY Sum</h1>
          </div>
          <p className="text-muted-foreground">
            Upload an Excel file to sum quantities by unique ASIN and export the results
          </p>
        </div>

        {/* File Upload */}
        <Card className="glass-container p-6">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Upload Excel File</h2>
          </div>
          
          <FileUpload
            onFileUpload={handleFileUpload}
            accept=".xlsx,.xls"
            multiple={false}
            title="Upload Excel File with ASIN and QTY columns"
            description="Supported formats: .xlsx, .xls"
          />

          {excelData && !showConfiguration && (
            <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 text-success">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-medium">
                  File loaded: {excelData.data.length - 1} rows of data
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Configuration */}
        {showConfiguration && excelData && (
          <Card className="glass-container p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Configure Processing</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Header Row Number */}
              <div className="space-y-2">
                <Label htmlFor="headerRow" className="text-sm font-medium">
                  Header Row Number
                </Label>
                <Input
                  id="headerRow"
                  type="number"
                  min="1"
                  max={excelData.data.length}
                  value={headerRowNumber}
                  onChange={(e) => setHeaderRowNumber(Number(e.target.value))}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Row number containing column headers (default: 1)
                </p>
              </div>

              {/* ASIN Column */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  ASIN Column
                </Label>
                <Select value={selectedAsinColumn} onValueChange={setSelectedAsinColumn}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select ASIN column" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-input z-50">
                    {getAvailableColumns().map((column, index) => (
                      <SelectItem key={index} value={column} className="hover:bg-muted">
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* QTY Column */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Quantity Column
                </Label>
                <Select value={selectedQtyColumn} onValueChange={setSelectedQtyColumn}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select QTY column" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-input z-50">
                    {getAvailableColumns().map((column, index) => (
                      <SelectItem key={index} value={column} className="hover:bg-muted">
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={resetData}>
                Start Over
              </Button>
              <Button 
                onClick={processAsinSum} 
                disabled={isProcessing || !selectedAsinColumn || !selectedQtyColumn}
                className="bg-primary hover:bg-primary/90"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Calculate Sum'}
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {summaryData.length > 0 && (
          <Card className="glass-container p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">ASIN Summary Results</h3>
                <p className="text-muted-foreground">
                  {summaryData.length} unique ASINs found
                </p>
              </div>
              <Button onClick={handleExport} className="bg-primary hover:bg-primary/90">
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            </div>

            <div className="max-h-96 overflow-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">ASIN</th>
                    <th className="text-right p-3 font-semibold">Total Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.map((item, index) => (
                    <tr key={item.asin} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-3 font-mono">{item.asin}</td>
                      <td className="p-3 text-right font-semibold">{item.totalQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
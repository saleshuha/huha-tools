import { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { useExcelExport } from '@/hooks/useExcelExport';
import { Calculator, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { ExcelData } from '@/types/excel';

interface AsinSummary {
  asin: string;
  totalQty: number;
}

export function AsinQtySum() {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [summaryData, setSummaryData] = useState<AsinSummary[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { exportMappedData } = useExcelExport();

  const handleFileUpload = useCallback((data: ExcelData | null) => {
    setExcelData(data);
    setSummaryData([]);
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

    setIsProcessing(true);
    
    try {
      console.log("Excel data:", excelData);
      console.log("Data length:", excelData.data.length);
      console.log("First row (headers):", excelData.data[0]);

      const headers = excelData.data[0] as string[];
      console.log("Headers array:", headers);

      // More flexible column detection
      const asinColumnIndex = headers.findIndex(header => {
        const headerLower = String(header).toLowerCase().trim();
        return headerLower.includes('asin') || headerLower === 'sku' || headerLower.includes('product');
      });
      
      const qtyColumnIndex = headers.findIndex(header => {
        const headerLower = String(header).toLowerCase().trim();
        return headerLower.includes('qty') || 
               headerLower.includes('quantity') || 
               headerLower.includes('amount') ||
               headerLower.includes('count');
      });

      console.log("ASIN column index:", asinColumnIndex);
      console.log("QTY column index:", qtyColumnIndex);

      if (asinColumnIndex === -1) {
        toast({
          title: "ASIN Column Not Found",
          description: `Could not find ASIN column. Available columns: ${headers.join(', ')}`,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      if (qtyColumnIndex === -1) {
        toast({
          title: "Quantity Column Not Found",
          description: `Could not find QTY column. Available columns: ${headers.join(', ')}`,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      const asinQtyMap = new Map<string, number>();

      // Process data starting from row 1 (skip headers)
      for (let i = 1; i < excelData.data.length; i++) {
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
  }, [excelData, toast]);

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

          {excelData && (
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

        {/* Process Button */}
        {excelData && (
          <Card className="glass-container p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Process ASIN Data</h3>
                <p className="text-muted-foreground">Calculate total quantities for each unique ASIN</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetData}>
                  Reset
                </Button>
                <Button 
                  onClick={processAsinSum} 
                  disabled={isProcessing}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Calculate Sum'}
                </Button>
              </div>
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
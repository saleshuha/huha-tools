import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { exportToCSV } from '@/utils/csv';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ExportControlsProps {
  parsedData: Record<string, any>[];
  headers: string[];
  selectedRows: Set<number>;
  fileName: string;
}

export function ExportControls({
  parsedData,
  headers,
  selectedRows,
  fileName,
}: ExportControlsProps) {
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (selectedRows.size === 0) {
      toast({
        title: 'No rows selected',
        description: 'Please select at least one row to export',
        variant: 'destructive',
      });
      return;
    }

    // Get selected data
    const selectedData = Array.from(selectedRows)
      .sort((a, b) => a - b)
      .map(index => parsedData[index]);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFileName = fileName.replace(/\.[^/.]+$/, '');
    const exportFileName = `${baseFileName}_selected_${timestamp}.csv`;

    try {
      exportToCSV(selectedData, headers, exportFileName);

      toast({
        title: 'Export successful',
        description: `${selectedRows.size} products exported to ${exportFileName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExportExcel = () => {
    if (selectedRows.size === 0) {
      toast({
        title: 'No rows selected',
        description: 'Please select at least one row to export',
        variant: 'destructive',
      });
      return;
    }

    // Get selected data
    const selectedData = Array.from(selectedRows)
      .sort((a, b) => a - b)
      .map(index => parsedData[index]);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFileName = fileName.replace(/\.[^/.]+$/, '');
    const exportFileName = `${baseFileName}_selected_${timestamp}.xlsx`;

    try {
      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(selectedData, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      // Export
      XLSX.writeFile(workbook, exportFileName);

      toast({
        title: 'Export successful',
        description: `${selectedRows.size} products exported to ${exportFileName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={handleExportCSV}
        disabled={selectedRows.size === 0}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export CSV {selectedRows.size > 0 && `(${selectedRows.size})`}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={selectedRows.size === 0}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export Excel {selectedRows.size > 0 && `(${selectedRows.size})`}
      </Button>
    </div>
  );
}

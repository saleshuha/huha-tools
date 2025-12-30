import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportData {
  poNumber: string;
  asin?: string;
  skuCode?: string;
  title?: string;
  requiredQty: number;
  purchasedQty: number;
  status: string;
  supplierName?: string;
  supplierOrderNumber?: string;
  notes?: string;
}

interface ExportButtonProps {
  data: ExportData[];
  linkTitle?: string;
}

export function ExportButton({ data, linkTitle }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        'PO Number',
        'ASIN',
        'SKU',
        'Title',
        'Required Qty',
        'Purchased Qty',
        'Status',
        'Supplier Name',
        'Supplier Order #',
        'Notes'
      ];
      
      const rows = data.map(item => [
        item.poNumber,
        item.asin || '',
        item.skuCode || '',
        item.title || '',
        item.requiredQty,
        item.purchasedQty,
        item.status,
        item.supplierName || '',
        item.supplierOrderNumber || '',
        item.notes || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => 
          typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
        ).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${linkTitle || 'purchase-status'}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('Exported to CSV');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToText = () => {
    setIsExporting(true);
    try {
      const lines = data.map(item => {
        const statusEmoji = item.status === 'purchased' ? '✅' : 
                           item.status === 'partial' ? '⚠️' : 
                           item.status === 'not_available' ? '❌' : '⏳';
        return `${statusEmoji} ${item.poNumber} | ${item.title || 'No title'}\n   Required: ${item.requiredQty} | Purchased: ${item.purchasedQty}`;
      });
      
      const summary = `
Purchase Status Report
${linkTitle ? `Link: ${linkTitle}` : ''}
Generated: ${new Date().toLocaleString()}
${'='.repeat(50)}

${lines.join('\n\n')}

${'='.repeat(50)}
Total Items: ${data.length}
Purchased: ${data.filter(d => d.status === 'purchased').length}
Partial: ${data.filter(d => d.status === 'partial').length}
Not Available: ${data.filter(d => d.status === 'not_available').length}
Pending: ${data.filter(d => d.status === 'pending').length}
      `.trim();
      
      const blob = new Blob([summary], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${linkTitle || 'purchase-status'}-${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      
      toast.success('Exported to text file');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToText}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { StockChange } from './StockHistoryChangeCard';
import { format } from 'date-fns';

interface StockHistoryExportProps {
  changes: StockChange[];
  itemIdentifier: string;
}

export function StockHistoryExport({ changes, itemIdentifier }: StockHistoryExportProps) {
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Reference',
      'Previous Qty',
      'New Qty',
      'Change',
      'Reason',
      'User',
      'Notes',
      'Cost',
      'Total Value',
      'Location'
    ];
    
    const rows = changes.map(c => [
      format(new Date(c.created_at), 'yyyy-MM-dd HH:mm:ss'),
      c.reference_type || '',
      c.reference_number || '',
      c.previous_quantity,
      c.new_quantity,
      c.change_amount,
      c.change_reason,
      c.user_email || c.user_name || '',
      c.notes || '',
      c.cost_per_unit || '',
      c.total_value || '',
      c.warehouse_location || ''
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    downloadFile(csv, `stock-history-${itemIdentifier}-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
  };

  const exportToJSON = () => {
    const data = {
      item: itemIdentifier,
      exportDate: new Date().toISOString(),
      totalChanges: changes.length,
      changes: changes.map(c => ({
        date: c.created_at,
        type: c.reference_type,
        reference: c.reference_number,
        quantities: {
          previous: c.previous_quantity,
          new: c.new_quantity,
          change: c.change_amount
        },
        reason: c.change_reason,
        user: c.user_email || c.user_name,
        notes: c.notes,
        cost: c.cost_per_unit,
        totalValue: c.total_value,
        location: c.warehouse_location,
        metadata: c.metadata
      }))
    };
    
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `stock-history-${itemIdentifier}-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
  };

  const exportToText = () => {
    let text = `Stock History Report\n`;
    text += `Item: ${itemIdentifier}\n`;
    text += `Export Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
    text += `Total Changes: ${changes.length}\n`;
    text += `${'='.repeat(80)}\n\n`;
    
    changes.forEach((c, i) => {
      text += `Change #${i + 1}\n`;
      text += `Date: ${format(new Date(c.created_at), 'yyyy-MM-dd HH:mm:ss')}\n`;
      text += `Type: ${c.reference_type || 'N/A'}\n`;
      text += `Reference: ${c.reference_number || 'N/A'}\n`;
      text += `Quantity Change: ${c.previous_quantity} → ${c.new_quantity} (${c.change_amount > 0 ? '+' : ''}${c.change_amount})\n`;
      text += `Reason: ${c.change_reason}\n`;
      if (c.user_email || c.user_name) text += `User: ${c.user_email || c.user_name}\n`;
      if (c.notes) text += `Notes: ${c.notes}\n`;
      if (c.cost_per_unit) text += `Cost: $${c.cost_per_unit}\n`;
      if (c.total_value) text += `Total Value: $${c.total_value}\n`;
      if (c.warehouse_location) text += `Location: ${c.warehouse_location}\n`;
      text += `${'-'.repeat(80)}\n\n`;
    });
    
    downloadFile(text, `stock-history-${itemIdentifier}-${format(new Date(), 'yyyy-MM-dd')}.txt`, 'text/plain');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (changes.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} className="gap-2 cursor-pointer">
          <FileJson className="w-4 h-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToText} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          Export as Text
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {changes.length} changes will be exported
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

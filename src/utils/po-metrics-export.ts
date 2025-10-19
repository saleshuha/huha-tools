import * as XLSX from 'xlsx';
import { POOrder } from '@/components/POTracker';

interface ExportMetric {
  name: string;
  value: number;
  subValue?: string;
  percentage?: number;
}

export const exportMetricToCSV = (
  orders: POOrder[],
  metricName: string
): void => {
  if (orders.length === 0) {
    throw new Error('No orders to export');
  }

  // Prepare data for export
  const exportData = orders.map(order => ({
    'PO Number': order.po_number,
    'ASIN': order.asin || '',
    'Model Number': order.model_number || '',
    'Title': order.title || '',
    'Quantity': order.quantity,
    'Status': order.status,
    'SKU Code': order.sku_code || '',
    'Serial Number': order.serial_number || '',
    'Order Date': order.order_date || '',
    'Expected Delivery': order.expected_delivery || '',
    'Unit Cost': order.unit_cost || '',
    'Total Cost': order.total_cost || '',
    'Supplier Order #': order.supplier_order_number || '',
    'Tracking #': order.tracking_number || '',
    'Notes': order.notes || '',
    'File Name': order.file_name || '',
    'Country': order.country || ''
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, metricName.substring(0, 31)); // Excel sheet name limit
  
  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `PO-${metricName.replace(/\s+/g, '-')}-${timestamp}.xlsx`;
  
  // Download
  XLSX.writeFile(wb, filename);
};

export const exportAllMetrics = (
  metricsData: {
    summary: ExportMetric[];
    inStock: POOrder[];
    outOfStock: POOrder[];
    notMatched: POOrder[];
    matched: POOrder[];
    placed: POOrder[];
    pending: POOrder[];
  }
): void => {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryWs = XLSX.utils.json_to_sheet(
    metricsData.summary.map(m => ({
      'Metric': m.name,
      'Value': m.value,
      'Details': m.subValue || '',
      'Percentage': m.percentage !== undefined ? `${m.percentage.toFixed(1)}%` : ''
    }))
  );
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Helper function to create order sheet
  const createOrderSheet = (orders: POOrder[], sheetName: string) => {
    if (orders.length > 0) {
      const data = orders.map(order => ({
        'PO Number': order.po_number,
        'ASIN': order.asin || '',
        'Model Number': order.model_number || '',
        'Title': order.title || '',
        'Quantity': order.quantity,
        'Status': order.status,
        'SKU Code': order.sku_code || '',
        'Unit Cost': order.unit_cost || '',
        'Total Cost': order.total_cost || '',
        'Order Date': order.order_date || '',
        'Country': order.country || ''
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  };

  // Add all detail sheets
  createOrderSheet(metricsData.inStock, 'In Stock');
  createOrderSheet(metricsData.outOfStock, 'Out of Stock');
  createOrderSheet(metricsData.notMatched, 'Not Matched');
  createOrderSheet(metricsData.matched, 'Matched');
  createOrderSheet(metricsData.placed, 'Placed');
  createOrderSheet(metricsData.pending, 'Pending');

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `PO-All-Metrics-${timestamp}.xlsx`;
  
  // Download
  XLSX.writeFile(wb, filename);
};

export const calculateMetricPercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Utility functions for CSV export functionality

export interface CSVExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
}

// Convert data to CSV format
export function convertToCSV(
  data: Record<string, any>[],
  headers: string[],
  options: CSVExportOptions = {}
): string {
  const { includeHeaders = true, delimiter = ',' } = options;
  
  const rows: string[] = [];
  
  // Add headers if requested
  if (includeHeaders) {
    rows.push(headers.join(delimiter));
  }
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      
      // Handle null/undefined values
      if (value == null) return '';
      
      // Convert to string and escape if contains delimiter or quotes
      const stringValue = String(value);
      
      // If value contains delimiter, quotes, or newlines, wrap in quotes and escape existing quotes
      if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    
    rows.push(row.join(delimiter));
  });
  
  return rows.join('\n');
}

// Download CSV file
export function downloadCSV(
  csvContent: string,
  filename: string = 'export.csv'
): void {
  // Add UTF-8 BOM for better Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

// Export data directly to CSV
export function exportToCSV(
  data: Record<string, any>[],
  headers: string[],
  filename?: string,
  options: CSVExportOptions = {}
): void {
  const csvContent = convertToCSV(data, headers, options);
  const finalFilename = filename || options.filename || 'export.csv';
  
  downloadCSV(csvContent, finalFilename);
}

// Helper to format date for CSV
export function formatDateForCSV(date: string | Date | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Helper to format currency for CSV
export function formatCurrencyForCSV(amount: number, currency: string = 'USD'): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
  
  return `${amount.toFixed(2)} ${currency}`;
}

// Helper to sanitize filename
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\-_\.]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Generate filename with timestamp
export function generateTimestampedFilename(
  base: string,
  extension: string = 'csv'
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedBase = sanitizeFilename(base);
  
  return `${sanitizedBase}_${timestamp}.${extension}`;
}
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParseResult {
  data: any[];
  totalRows: number;
  fileName: string;
}

/**
 * Simplified file parser with consistent data cleaning
 * Returns clean, ready-to-use data
 */
export const parseFileSimply = async (file: File): Promise<any[]> => {
  console.log('🔍 File Parser START:', {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024).toFixed(2)} KB`,
    extension: file.name.split('.').pop()?.toLowerCase()
  });

  const fileName = file.name.toLowerCase();
  const isCSV = fileName.endsWith('.csv') || file.type.includes('csv');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                 file.type.includes('spreadsheet') || file.type.includes('excel');

  if (!isCSV && !isExcel) {
    throw new Error(`Unsupported file type. Please upload CSV (.csv) or Excel (.xlsx, .xls) files.`);
  }

  return new Promise((resolve, reject) => {
    if (isCSV) {
      parseCSV(file, resolve, reject);
    } else {
      parseExcel(file, resolve, reject);
    }
  });
};

/**
 * Parse CSV file
 */
function parseCSV(
  file: File,
  resolve: (data: any[]) => void,
  reject: (error: Error) => void
) {
  console.log('📊 Parsing CSV file...');
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: 'greedy', // Skip empty lines more aggressively
    worker: false,
    dynamicTyping: false, // Keep as strings for consistent handling
    transformHeader: (header) => header?.trim() || '',
    complete: (results) => {
      try {
        if (results.errors && results.errors.length > 0) {
          console.warn('⚠️ CSV parse warnings:', results.errors.slice(0, 3));
        }

        const rawData = results.data || [];
        const cleanData = cleanParsedData(rawData);

        console.log('✅ CSV parsed:', {
          rawRows: rawData.length,
          cleanRows: cleanData.length,
          removed: rawData.length - cleanData.length
        });

        if (cleanData.length === 0) {
          reject(new Error('No valid data rows found in CSV file. Please check file contents.'));
          return;
        }

        resolve(cleanData);
      } catch (error) {
        console.error('❌ CSV processing error:', error);
        reject(new Error('Failed to process CSV file. Please check file format.'));
      }
    },
    error: (error) => {
      console.error('❌ CSV parse error:', error);
      reject(new Error(`CSV parsing failed: ${error.message}`));
    }
  });
}

/**
 * Parse Excel file
 */
function parseExcel(
  file: File,
  resolve: (data: any[]) => void,
  reject: (error: Error) => void
) {
  console.log('📋 Parsing Excel file...');
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { 
        type: 'array',
        cellDates: true,
        cellNF: false
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        reject(new Error('No sheets found in Excel file.'));
        return;
      }

      console.log('📋 Excel sheets found:', workbook.SheetNames);
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        reject(new Error('Could not read first sheet from Excel file.'));
        return;
      }

      const rawData = XLSX.utils.sheet_to_json(firstSheet, { 
        defval: '', // Default empty cells to empty string
        raw: false, // Convert to strings
        blankrows: false // Skip blank rows
      });

      const cleanData = cleanParsedData(rawData);

      console.log('✅ Excel parsed:', {
        rawRows: rawData.length,
        cleanRows: cleanData.length,
        removed: rawData.length - cleanData.length
      });

      if (cleanData.length === 0) {
        reject(new Error('No valid data rows found in Excel file. Please check file contents.'));
        return;
      }

      resolve(cleanData);
    } catch (error) {
      console.error('❌ Excel processing error:', error);
      reject(new Error(`Excel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  };
  
  reader.onerror = () => {
    reject(new Error('Failed to read Excel file. File may be corrupted.'));
  };
  
  reader.readAsArrayBuffer(file);
}

/**
 * Clean parsed data - remove empty rows and normalize
 */
function cleanParsedData(data: any[]): any[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.filter(row => {
    // Row must be an object
    if (!row || typeof row !== 'object') {
      return false;
    }

    // Row must have at least one non-empty value
    const values = Object.values(row);
    const hasContent = values.some(value => {
      if (value === null || value === undefined) return false;
      const strValue = String(value).trim();
      return strValue !== '' && strValue !== 'null' && strValue !== 'undefined';
    });

    return hasContent;
  }).map(row => {
    // Trim all string values
    const trimmedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        trimmedRow[key] = value.trim();
      } else {
        trimmedRow[key] = value;
      }
    }
    return trimmedRow;
  });
}

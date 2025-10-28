import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const parseFileSimply = async (file: File): Promise<any[]> => {
  console.log('🔍 Simple File Parser START:', {
    name: file.name,
    type: file.type,
    size: file.size,
    extension: file.name.split('.').pop()?.toLowerCase()
  });

  // Detect file type
  const fileName = file.name.toLowerCase();
  const isCSV = fileName.endsWith('.csv') || file.type.includes('csv');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                 file.type.includes('spreadsheet') || file.type.includes('excel');
  
  console.log('🔍 File type detection:', { isCSV, isExcel, fileName, mimeType: file.type });

  return new Promise((resolve, reject) => {
    if (isCSV) {
      console.log('📊 Processing CSV file...');
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        dynamicTyping: false,
        transformHeader: (header) => header?.trim() || '',
        complete: (results) => {
          try {
            console.log('📊 CSV Results:', {
              rows: results.data?.length || 0,
              errors: results.errors?.length || 0,
              firstRow: results.data?.[0]
            });

            const data = results.data || [];
            
            if (results.errors?.length > 0) {
              console.warn('📊 CSV Warnings:', results.errors.slice(0, 3));
            }

            // Simple filter - just remove null/undefined rows
            const cleanData = data.filter(row => row && typeof row === 'object' && Object.keys(row).length > 0);
            
            console.log('📊 Final CSV data:', cleanData.length, 'rows');
            resolve(cleanData.length > 0 ? cleanData : data);
            
          } catch (error) {
            console.error('📊 CSV processing error:', error);
            reject(new Error('CSV processing failed'));
          }
        },
        error: (error) => {
          console.error('📊 Papa parse error:', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });

    } else if (isExcel) {
      console.log('📋 Processing Excel file...');
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('📋 Reading Excel data...');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false
          });
          
          console.log('📋 Excel sheets:', workbook.SheetNames);
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          if (!firstSheet) {
            throw new Error('No sheets found in Excel file');
          }
          
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
            defval: '',
            raw: false,
            blankrows: false
          });
          
          console.log('📋 Excel Results:', {
            rows: jsonData.length,
            firstRow: jsonData[0]
          });
          
          // Simple filter - just remove null/undefined rows
          const cleanData = jsonData.filter(row => row && typeof row === 'object' && Object.keys(row).length > 0);
          
          console.log('📋 Final Excel data:', cleanData.length, 'rows');
          resolve(cleanData.length > 0 ? cleanData : jsonData);
          
        } catch (error) {
          console.error('📋 Excel processing error:', error);
          reject(new Error(`Excel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
      
    } else {
      console.error('❌ Unsupported file type:', fileName, file.type);
      reject(new Error(`Unsupported file type. Please upload CSV (.csv) or Excel (.xlsx, .xls) files.`));
    }
  });
};
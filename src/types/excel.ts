export interface ExcelData {
  headers: string[];
  data: any[][];
  fileName: string;
  sheetNames?: string[];
  selectedSheet?: string;
  originalWorkbook?: any; // Store the original XLSX workbook for target files
}

export interface ColumnMapping {
  [sourceColumn: string]: string[]; // source column -> array of target columns
}

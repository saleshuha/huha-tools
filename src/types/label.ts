export interface LabelSize {
  width: number;
  height: number;
  unit: 'mm' | 'px';
}

export interface LabelElement {
  id: string;
  type: 'text' | 'multitext' | 'barcode' | 'qr' | 'rectangle' | 'circle' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  
  // Multi-line text properties
  lineHeight?: number;
  maxLines?: number;
  wordWrap?: boolean;
  
  // Shape properties
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  
  // Barcode/QR properties
  barcodeType?: 'CODE128' | 'EAN13' | 'QR' | 'CODE39';
  showText?: boolean;
  
  // Data mapping
  dataColumn?: string;
  dataTransform?: {
    prefix?: string;
    suffix?: string;
    uppercase?: boolean;
    truncate?: number;
  };
  
  // Image properties
  src?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
}

export interface LabelDoc {
  id: string;
  name: string;
  size: LabelSize;
  elements: LabelElement[];
  datasetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabelDataset {
  id: string;
  name: string;
  description: string;
  headers: string[];
  data: any[][];
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrintSettings {
  format: 'pdf' | 'zpl' | 'html';
  paperSize: 'a4' | 'letter' | 'custom';
  orientation: 'portrait' | 'landscape';
  dpi: 203 | 300;
  copies: number;
  labelsPerPage: number;
  margin: number;
}

export const LABEL_PRESETS: Record<string, LabelSize> = {
  'address': { width: 89, height: 36, unit: 'mm' },
  'shipping': { width: 102, height: 152, unit: 'mm' },
  'product': { width: 50, height: 30, unit: 'mm' },
  'barcode': { width: 70, height: 25, unit: 'mm' },
  'small': { width: 38, height: 25, unit: 'mm' },
  'medium': { width: 70, height: 42, unit: 'mm' },
  'large': { width: 102, height: 76, unit: 'mm' },
};
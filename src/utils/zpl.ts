import { Canvas, Object as FabricObject, Text, Rect } from 'fabric';

export interface ZPLSettings {
  dpi: 203 | 300;
  labelWidth: number; // in dots
  labelHeight: number; // in dots
}

export interface MappedObject extends FabricObject {
  dataColumn?: string;
  dataMode?: 'static' | 'column';
  transform?: {
    prefix?: string;
    suffix?: string;
    uppercase?: boolean;
    truncate?: number;
  };
  barcodeOptions?: {
    symbology: 'CODE128' | 'EAN13';
    height: number;
    displayValue: boolean;
  };
  qrOptions?: {
    moduleSize: number;
    margin: number;
  };
}

/**
 * Convert pixels to dots based on DPI
 */
export function pixelsToDots(pixels: number, dpi: number): number {
  return Math.round((pixels * dpi) / 72); // 72 DPI is the standard screen DPI
}

/**
 * Apply data transforms to a value
 */
export function applyTransforms(value: string, transforms?: {
  prefix?: string;
  suffix?: string;
  uppercase?: boolean;
  truncate?: number;
}): string {
  if (!transforms) return value;
  
  let result = value;
  
  if (transforms.prefix) result = transforms.prefix + result;
  if (transforms.suffix) result = result + transforms.suffix;
  if (transforms.uppercase) result = result.toUpperCase();
  if (transforms.truncate && result.length > transforms.truncate) {
    result = result.substring(0, transforms.truncate) + '...';
  }
  
  return result;
}

/**
 * Get data value for an object from dataset row
 */
export function getDataValue(
  obj: MappedObject, 
  dataRow: any[], 
  headers: string[]
): string {
  if (obj.dataMode === 'static') {
    return (obj as any).text || '';
  }
  
  if (obj.dataMode === 'column' && obj.dataColumn) {
    const columnIndex = headers.indexOf(obj.dataColumn);
    if (columnIndex !== -1) {
      const rawValue = dataRow[columnIndex]?.toString() || '';
      return applyTransforms(rawValue, obj.transform);
    }
  }
  
  return '';
}

/**
 * Convert Fabric.js text object to ZPL
 */
function textToZPL(obj: fabric.Text & MappedObject, settings: ZPLSettings, dataValue: string): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const fontSize = Math.round((obj.fontSize || 14) / 2); // ZPL font sizing is different
  
  // Basic font selection (ZPL has limited fonts)
  let fontCode = 'A'; // Default font
  if (obj.fontFamily?.toLowerCase().includes('arial')) fontCode = 'A';
  else if (obj.fontFamily?.toLowerCase().includes('helvetica')) fontCode = 'B';
  else if (obj.fontFamily?.toLowerCase().includes('courier')) fontCode = 'D';
  
  const rotation = 'N'; // Normal rotation (could be enhanced)
  
  return `^FO${x},${y}^A${fontCode}${rotation},${fontSize},${fontSize}^FD${dataValue}^FS`;
}

/**
 * Convert Fabric.js rectangle to ZPL
 */
function rectangleToZPL(obj: fabric.Rect, settings: ZPLSettings): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const width = pixelsToDots(obj.width || 100, settings.dpi);
  const height = pixelsToDots(obj.height || 50, settings.dpi);
  const thickness = pixelsToDots(obj.strokeWidth || 1, settings.dpi);
  
  return `^FO${x},${y}^GB${width},${height},${thickness},B,0^FS`;
}

/**
 * Convert barcode data to ZPL
 */
function barcodeToZPL(
  obj: fabric.Object & MappedObject, 
  settings: ZPLSettings, 
  dataValue: string
): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const height = pixelsToDots(obj.barcodeOptions?.height || 50, settings.dpi);
  
  let barcodeCommand = '';
  
  if (obj.barcodeOptions?.symbology === 'EAN13') {
    // EAN-13 barcode
    barcodeCommand = `^FO${x},${y}^BEN,${height},Y,N^FD${dataValue}^FS`;
  } else {
    // CODE128 (default)
    barcodeCommand = `^FO${x},${y}^BCN,${height},Y,N,N^FD${dataValue}^FS`;
  }
  
  // Add human readable text below if enabled
  if (obj.barcodeOptions?.displayValue) {
    const textY = y + height + pixelsToDots(5, settings.dpi);
    barcodeCommand += `\n^FO${x},${textY}^A0N,20,20^FD${dataValue}^FS`;
  }
  
  return barcodeCommand;
}

/**
 * Convert QR code data to ZPL
 */
function qrCodeToZPL(
  obj: fabric.Object & MappedObject, 
  settings: ZPLSettings, 
  dataValue: string
): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const moduleSize = obj.qrOptions?.moduleSize || 4;
  
  // ZPL QR Code: ^BQ = QR Code, N = normal orientation, 2 = model 2
  return `^FO${x},${y}^BQN,2,${moduleSize}^FDMA,${dataValue}^FS`;
}

/**
 * Convert a single Fabric.js object to ZPL based on its type
 */
function objectToZPL(
  obj: fabric.Object & MappedObject, 
  settings: ZPLSettings,
  dataRow: any[],
  headers: string[]
): string {
  const objType = obj.type;
  
  if (objType === 'text' || objType === 'i-text') {
    const dataValue = getDataValue(obj, dataRow, headers);
    return textToZPL(obj as fabric.Text & MappedObject, settings, dataValue);
  }
  
  if (objType === 'rect') {
    return rectangleToZPL(obj as fabric.Rect, settings);
  }
  
  // Handle custom barcode objects (you'd need to mark these with a custom property)
  if ((obj as any).isBarcode) {
    const dataValue = getDataValue(obj, dataRow, headers);
    return barcodeToZPL(obj, settings, dataValue);
  }
  
  // Handle custom QR code objects (you'd need to mark these with a custom property)
  if ((obj as any).isQRCode) {
    const dataValue = getDataValue(obj, dataRow, headers);
    return qrCodeToZPL(obj, settings, dataValue);
  }
  
  return ''; // Unsupported object type
}

/**
 * Convert entire Fabric.js canvas to ZPL for a single label
 */
export function canvasToZPL(
  canvas: fabric.Canvas,
  settings: ZPLSettings,
  dataRow: any[] = [],
  headers: string[] = []
): string {
  const objects = canvas.getObjects() as (fabric.Object & MappedObject)[];
  
  let zpl = `^XA`; // Start of label
  
  // Set label dimensions
  zpl += `\n^PW${settings.labelWidth}`;
  zpl += `\n^LL${settings.labelHeight}`;
  
  // Process each object
  objects.forEach(obj => {
    const objectZPL = objectToZPL(obj, settings, dataRow, headers);
    if (objectZPL) {
      zpl += `\n${objectZPL}`;
    }
  });
  
  zpl += `\n^XZ`; // End of label
  
  return zpl;
}

/**
 * Generate ZPL for multiple labels (bulk printing)
 */
export function generateBulkZPL(
  canvas: fabric.Canvas,
  settings: ZPLSettings,
  dataset: { data: any[][], headers: string[] }
): string {
  let bulkZPL = '';
  
  dataset.data.forEach((row) => {
    const labelZPL = canvasToZPL(canvas, settings, row, dataset.headers);
    bulkZPL += labelZPL + '\n';
  });
  
  return bulkZPL;
}

/**
 * Get common label size presets in dots for different DPIs
 */
export function getLabelSizePresets(dpi: 203 | 300) {
  const presets = {
    '4x6': { width: 4 * dpi, height: 6 * dpi }, // 4" x 6" shipping label
    '4x3': { width: 4 * dpi, height: 3 * dpi }, // 4" x 3" label
    '2x1': { width: 2 * dpi, height: 1 * dpi }, // 2" x 1" address label
    '3x2': { width: 3 * dpi, height: 2 * dpi }, // 3" x 2" product label
    '4x2': { width: 4 * dpi, height: 2 * dpi }, // 4" x 2" shipping label
  };
  
  return presets;
}

/**
 * Validate ZPL content for common issues
 */
export function validateZPL(zpl: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!zpl.includes('^XA')) {
    errors.push('Missing label start command ^XA');
  }
  
  if (!zpl.includes('^XZ')) {
    errors.push('Missing label end command ^XZ');
  }
  
  // Check for field commands without proper formatting
  const fieldCommands = zpl.match(/\^FD[^^\n]*\^FS/g);
  if (fieldCommands) {
    fieldCommands.forEach((cmd, index) => {
      if (!cmd.includes('^FS')) {
        errors.push(`Field command ${index + 1} missing ^FS terminator`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
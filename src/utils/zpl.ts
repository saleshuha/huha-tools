// Legacy ZPL utilities - use zpl-generator.ts instead
export interface ZPLSettings {
  dpi: 203 | 300;
  labelWidth: number;
  labelHeight: number;
}

export interface MappedObject {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  text?: string;
  dataColumn?: string;
  dataMode?: 'static' | 'column';
  dataTransform?: {
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
    return obj.text || '';
  }
  
  if (obj.dataMode === 'column' && obj.dataColumn) {
    const columnIndex = headers.indexOf(obj.dataColumn);
    if (columnIndex !== -1) {
      const rawValue = dataRow[columnIndex]?.toString() || '';
      return applyTransforms(rawValue, obj.dataTransform);
    }
  }
  
  return '';
}

/**
 * Convert text object to ZPL
 */
function textToZPL(obj: MappedObject, settings: ZPLSettings, dataValue: string): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const fontSize = Math.round(14 / 2); // Default font size
  
  return `^FO${x},${y}^A0N,${fontSize},${fontSize}^FD${dataValue}^FS`;
}

/**
 * Convert rectangle to ZPL
 */
function rectangleToZPL(obj: MappedObject, settings: ZPLSettings): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const width = pixelsToDots(obj.width || 100, settings.dpi);
  const height = pixelsToDots(obj.height || 50, settings.dpi);
  
  return `^FO${x},${y}^GB${width},${height},2,B,0^FS`;
}

/**
 * Convert barcode data to ZPL
 */
function barcodeToZPL(
  obj: MappedObject, 
  settings: ZPLSettings, 
  dataValue: string
): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const height = pixelsToDots(obj.barcodeOptions?.height || 50, settings.dpi);
  
  let barcodeCommand = '';
  
  if (obj.barcodeOptions?.symbology === 'EAN13') {
    barcodeCommand = `^FO${x},${y}^BEN,${height},Y,N^FD${dataValue}^FS`;
  } else {
    barcodeCommand = `^FO${x},${y}^BCN,${height},Y,N,N^FD${dataValue}^FS`;
  }
  
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
  obj: MappedObject, 
  settings: ZPLSettings, 
  dataValue: string
): string {
  const x = pixelsToDots(obj.left || 0, settings.dpi);
  const y = pixelsToDots(obj.top || 0, settings.dpi);
  const moduleSize = obj.qrOptions?.moduleSize || 4;
  
  return `^FO${x},${y}^BQN,2,${moduleSize}^FDMA,${dataValue}^FS`;
}

/**
 * Convert object to ZPL based on its type
 */
function objectToZPL(
  obj: MappedObject, 
  settings: ZPLSettings,
  dataRow: any[],
  headers: string[]
): string {
  const objType = obj.type;
  
  if (objType === 'text' || objType === 'i-text') {
    const dataValue = getDataValue(obj, dataRow, headers);
    return textToZPL(obj, settings, dataValue);
  }
  
  if (objType === 'rect') {
    return rectangleToZPL(obj, settings);
  }
  
  if ((obj as any).isBarcode) {
    const dataValue = getDataValue(obj, dataRow, headers);
    return barcodeToZPL(obj, settings, dataValue);
  }
  
  if ((obj as any).isQRCode) {
    const dataValue = getDataValue(obj, dataRow, headers);
    return qrCodeToZPL(obj, settings, dataValue);
  }
  
  return '';
}

/**
 * Simple ZPL generation for basic labels
 */
export function generateSimpleZPL(
  settings: ZPLSettings,
  content: string = "Sample Label"
): string {
  return `^XA
^PW${settings.labelWidth}
^LL${settings.labelHeight}
^FO50,50^A0N,50,50^FD${content}^FS
^XZ`;
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
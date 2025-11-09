// Simplified ZPL generator for label printing
export interface ZPLSettings {
  dpi: 203 | 300;
  labelWidth: number;
  labelHeight: number;
}

export interface LabelElement {
  type: 'text' | 'multitext' | 'barcode' | 'qr' | 'rectangle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  barcodeType?: 'CODE128' | 'EAN13';
  showBarcodeText?: boolean;
}

/**
 * Convert pixels to dots based on DPI
 */
function pixelsToDots(pixels: number, dpi: number): number {
  return Math.round((pixels * dpi) / 72);
}

/**
 * Generate ZPL for a text element
 */
function generateTextZPL(element: LabelElement, settings: ZPLSettings): string {
  const x = pixelsToDots(element.x, settings.dpi);
  const y = pixelsToDots(element.y, settings.dpi);
  const fontSize = Math.round((element.fontSize || 14) / 2);
  
  return `^FO${x},${y}^A0N,${fontSize},${fontSize}^FD${element.content}^FS`;
}

/**
 * Generate ZPL for a multitext element (multi-line text)
 */
function generateMultitextZPL(element: LabelElement, settings: ZPLSettings): string {
  const x = pixelsToDots(element.x, settings.dpi);
  const y = pixelsToDots(element.y, settings.dpi);
  const fontSize = Math.round((element.fontSize || 12) / 2);
  
  // Split content by newlines and render each line
  const lines = element.content.split('\n');
  const lineHeight = fontSize + 5; // Add spacing between lines
  
  let zpl = '';
  lines.forEach((line, index) => {
    const lineY = y + (index * lineHeight);
    zpl += `^FO${x},${lineY}^A0N,${fontSize},${fontSize}^FD${line}^FS`;
    if (index < lines.length - 1) zpl += '\n';
  });
  
  return zpl;
}

/**
 * Generate ZPL for a barcode element  
 */
function generateBarcodeZPL(element: LabelElement, settings: ZPLSettings): string {
  const x = pixelsToDots(element.x, settings.dpi);
  const y = pixelsToDots(element.y, settings.dpi);
  const height = pixelsToDots(element.height || 50, settings.dpi);
  
  let zpl = '';
  if (element.barcodeType === 'EAN13') {
    zpl = `^FO${x},${y}^BEN,${height},Y,N^FD${element.content}^FS`;
  } else {
    zpl = `^FO${x},${y}^BCN,${height},Y,N,N^FD${element.content}^FS`;
  }
  
  if (element.showBarcodeText) {
    const textY = y + height + pixelsToDots(5, settings.dpi);
    zpl += `\n^FO${x},${textY}^A0N,20,20^FD${element.content}^FS`;
  }
  
  return zpl;
}

/**
 * Generate ZPL for a QR code element
 */
function generateQRZPL(element: LabelElement, settings: ZPLSettings): string {
  const x = pixelsToDots(element.x, settings.dpi);
  const y = pixelsToDots(element.y, settings.dpi);
  
  return `^FO${x},${y}^BQN,2,4^FDMA,${element.content}^FS`;
}

/**
 * Generate ZPL for a rectangle element
 */
function generateRectangleZPL(element: LabelElement, settings: ZPLSettings): string {
  const x = pixelsToDots(element.x, settings.dpi);
  const y = pixelsToDots(element.y, settings.dpi);
  const width = pixelsToDots(element.width || 100, settings.dpi);
  const height = pixelsToDots(element.height || 50, settings.dpi);
  
  return `^FO${x},${y}^GB${width},${height},2,B,0^FS`;
}

/**
 * Generate complete ZPL for a label
 */
export function generateLabelZPL(elements: LabelElement[], settings: ZPLSettings): string {
  let zpl = `^XA\n^PW${settings.labelWidth}\n^LL${settings.labelHeight}`;
  
  elements.forEach(element => {
    let elementZPL = '';
    
    switch (element.type) {
      case 'text':
        elementZPL = generateTextZPL(element, settings);
        break;
      case 'multitext':
        elementZPL = generateMultitextZPL(element, settings);
        break;
      case 'barcode': 
        elementZPL = generateBarcodeZPL(element, settings);
        break;
      case 'qr':
        elementZPL = generateQRZPL(element, settings);
        break;
      case 'rectangle':
        elementZPL = generateRectangleZPL(element, settings);
        break;
    }
    
    if (elementZPL) {
      zpl += `\n${elementZPL}`;
    }
  });
  
  zpl += '\n^XZ';
  return zpl;
}

/**
 * Generate bulk ZPL for multiple labels
 */
export function generateBulkZPL(
  elements: LabelElement[], 
  settings: ZPLSettings, 
  dataRows: any[][]
): string {
  let bulkZPL = '';
  
  dataRows.forEach(row => {
    // Create elements with data from this row
    const populatedElements = elements.map(element => ({
      ...element,
      content: row[0]?.toString() || element.content // Simplified - would need proper column mapping
    }));
    
    const labelZPL = generateLabelZPL(populatedElements, settings);
    bulkZPL += labelZPL + '\n';
  });
  
  return bulkZPL;
}

/**
 * Get label size presets
 */
export function getLabelSizePresets(dpi: 203 | 300) {
  return {
    '4x6': { width: 4 * dpi, height: 6 * dpi },
    '4x3': { width: 4 * dpi, height: 3 * dpi },
    '2x1': { width: 2 * dpi, height: 1 * dpi },
    '3x2': { width: 3 * dpi, height: 2 * dpi }
  };
}

/**
 * Validate ZPL content
 */
export function validateZPL(zpl: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!zpl.includes('^XA')) {
    errors.push('Missing label start command ^XA');
  }
  
  if (!zpl.includes('^XZ')) {
    errors.push('Missing label end command ^XZ');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
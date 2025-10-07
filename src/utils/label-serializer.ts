import { LabelElement, LabelDataset } from '@/types/label';

/**
 * Resolves the content for a label element with data mapping and transforms
 */
export function resolveMappedContent(
  element: LabelElement,
  dataRow: any[] = [],
  headers: string[] = []
): string {
  // If dataColumn is specified, ALWAYS prioritize data mapping over text field
  if (element.dataColumn) {
    console.log('🔍 Data mapping debug:', {
      dataColumn: element.dataColumn,
      headers,
      dataRow,
      hasHeaders: headers.length > 0,
      hasData: dataRow.length > 0
    });
    
    if (headers.length > 0 && dataRow.length > 0) {
      // Case-insensitive column matching
      const columnIndex = headers.findIndex(header => 
        header.toLowerCase() === element.dataColumn.toLowerCase()
      );
      
      console.log('🔍 Column search:', {
        searchingFor: element.dataColumn,
        foundAt: columnIndex,
        value: columnIndex >= 0 ? dataRow[columnIndex] : 'NOT FOUND'
      });
      
      if (columnIndex >= 0 && dataRow[columnIndex] !== undefined && dataRow[columnIndex] !== null) {
        let content = String(dataRow[columnIndex]);
        
        // Apply transforms
        if (element.dataTransform) {
          const transform = element.dataTransform;
          if (transform.prefix) content = transform.prefix + content;
          if (transform.suffix) content = content + transform.suffix;
          if (transform.uppercase) content = content.toUpperCase();
          if (transform.truncate) content = content.substring(0, transform.truncate);
        }
        
        console.log('✅ Data mapped successfully:', content);
        return content;
      }
    }
    // If dataColumn is specified but no data found, return empty string
    console.log('❌ No data found for column:', element.dataColumn);
    return '';
  }
  
  // Only use element.text if no dataColumn is specified
  return element.text !== undefined && element.text !== '' ? element.text : 'Sample';
}

/**
 * Convert pixels to millimeters (assuming 96 DPI)
 */
export function pxToMM(pixels: number): number {
  return pixels * 0.264583;
}

/**
 * Convert millimeters to pixels (assuming 96 DPI)
 */
export function mmToPx(mm: number): number {
  return mm / 0.264583;
}

/**
 * Get element bounds in millimeters
 */
export function getElementBoundsMM(element: LabelElement) {
  return {
    x: pxToMM(element.x),
    y: pxToMM(element.y),
    width: pxToMM(element.width),
    height: pxToMM(element.height)
  };
}

/**
 * Serialize label element to JSON with all custom properties
 */
export function serializeLabelElement(element: LabelElement): any {
  return {
    id: element.id,
    type: element.type,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    
    // Text properties
    text: element.text,
    fontSize: element.fontSize,
    fontFamily: element.fontFamily,
    fontWeight: element.fontWeight,
    textAlign: element.textAlign,
    color: element.color,
    
    // Shape properties
    fill: element.fill,
    stroke: element.stroke,
    strokeWidth: element.strokeWidth,
    borderRadius: element.borderRadius,
    
    // Barcode/QR properties
    barcodeType: element.barcodeType,
    showText: element.showText,
    
    // Data mapping
    dataColumn: element.dataColumn,
    dataTransform: element.dataTransform,
    
    // Image properties
    src: element.src,
    objectFit: element.objectFit,
  };
}

/**
 * Deserialize JSON to label element
 */
export function deserializeLabelElement(data: any): LabelElement {
  return {
    id: data.id || crypto.randomUUID(),
    type: data.type || 'text',
    x: data.x || 0,
    y: data.y || 0,
    width: data.width || 100,
    height: data.height || 30,
    rotation: data.rotation,
    
    // Text properties
    text: data.text,
    fontSize: data.fontSize,
    fontFamily: data.fontFamily,
    fontWeight: data.fontWeight,
    textAlign: data.textAlign,
    color: data.color,
    
    // Shape properties
    fill: data.fill,
    stroke: data.stroke,
    strokeWidth: data.strokeWidth,
    borderRadius: data.borderRadius,
    
    // Barcode/QR properties
    barcodeType: data.barcodeType,
    showText: data.showText,
    
    // Data mapping
    dataColumn: data.dataColumn,
    dataTransform: data.dataTransform,
    
    // Image properties
    src: data.src,
    objectFit: data.objectFit,
  };
}
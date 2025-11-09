/**
 * Utility functions for label rendering and data mapping
 */

export interface DataTransform {
  prefix?: string;
  suffix?: string;
  uppercase?: boolean;
  truncate?: number;
}

export interface LabelElement {
  type: string;
  text?: string;
  content?: string;
  dataColumn?: string;
  dataTransform?: DataTransform;
  left: number;
  top: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
}

/**
 * Resolves the content for a label element with data mapping and transforms
 */
export function resolveMappedContent(
  element: LabelElement,
  dataRow: any[] = [],
  headers: string[] = []
): string {
  let content = element.text || element.content || 'Sample';
  
  // Apply data mapping if available
  if (element.dataColumn && headers.length > 0 && dataRow.length > 0) {
    // Case-insensitive column matching
    const columnIndex = headers.findIndex(h => 
      h.toLowerCase() === element.dataColumn?.toLowerCase()
    );
    
    if (columnIndex >= 0 && dataRow[columnIndex] !== undefined) {
      content = String(dataRow[columnIndex]);
      
      // Apply transforms
      if (element.dataTransform) {
        const transform = element.dataTransform;
        if (transform.prefix) content = transform.prefix + content;
        if (transform.suffix) content = content + transform.suffix;
        if (transform.uppercase) content = content.toUpperCase();
        if (transform.truncate) content = content.substring(0, transform.truncate);
      }
    }
  }
  
  return content;
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
    x: pxToMM(element.left),
    y: pxToMM(element.top),
    width: pxToMM(element.width || 100),
    height: pxToMM(element.height || 20)
  };
}
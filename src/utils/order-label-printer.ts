// Order label printing utilities for Zebra printers
import { generateLabelZPL, LabelElement, ZPLSettings, getLabelSizePresets } from './zpl-generator';

export interface OrderItem {
  orderId: string;
  asin?: string;
  sku?: string;
  itemTitle?: string;
  itemQuantity: number;
}

export interface OrderLabelSettings {
  labelSize: '4x6' | '4x3' | '3x2' | '2x1';
  dpi: 203 | 300;
  showOrderId: boolean;
  showAsin: boolean;
  showSku: boolean;
  showTitle: boolean;
  showQuantity: boolean;
  includeBarcode: boolean;
  barcodeContent: 'asin' | 'sku' | 'orderId';
}

const DEFAULT_SETTINGS: OrderLabelSettings = {
  labelSize: '4x3',
  dpi: 203,
  showOrderId: true,
  showAsin: true,
  showSku: true,
  showTitle: true,
  showQuantity: true,
  includeBarcode: true,
  barcodeContent: 'asin'
};

/**
 * Generate label elements for an order item
 */
function generateOrderLabelElements(order: OrderItem, settings: OrderLabelSettings): LabelElement[] {
  const elements: LabelElement[] = [];
  let yPosition = 10;
  const lineHeight = 30;
  const leftMargin = 10;

  // Order ID
  if (settings.showOrderId && order.orderId) {
    elements.push({
      type: 'text',
      x: leftMargin,
      y: yPosition,
      content: `Order: ${order.orderId}`,
      fontSize: 12
    });
    yPosition += lineHeight;
  }

  // ASIN
  if (settings.showAsin && order.asin) {
    elements.push({
      type: 'text',
      x: leftMargin,
      y: yPosition,
      content: `ASIN: ${order.asin}`,
      fontSize: 16
    });
    yPosition += lineHeight;
  }

  // SKU
  if (settings.showSku && order.sku) {
    elements.push({
      type: 'text',
      x: leftMargin,
      y: yPosition,
      content: `SKU: ${order.sku}`,
      fontSize: 16
    });
    yPosition += lineHeight;
  }

  // Title (truncated if too long)
  if (settings.showTitle && order.itemTitle) {
    const truncatedTitle = order.itemTitle.length > 35 
      ? order.itemTitle.substring(0, 35) + '...' 
      : order.itemTitle;
    
    elements.push({
      type: 'text',
      x: leftMargin,
      y: yPosition,
      content: truncatedTitle,
      fontSize: 14
    });
    yPosition += lineHeight;
  }

  // Quantity
  if (settings.showQuantity) {
    elements.push({
      type: 'text',
      x: leftMargin,
      y: yPosition,
      content: `Qty: ${order.itemQuantity}`,
      fontSize: 16
    });
    yPosition += lineHeight;
  }

  // Barcode
  if (settings.includeBarcode) {
    let barcodeContent = '';
    switch (settings.barcodeContent) {
      case 'asin':
        barcodeContent = order.asin || order.sku || order.orderId;
        break;
      case 'sku':
        barcodeContent = order.sku || order.asin || order.orderId;
        break;
      case 'orderId':
        barcodeContent = order.orderId;
        break;
    }

    if (barcodeContent) {
      elements.push({
        type: 'barcode',
        x: leftMargin,
        y: yPosition + 5,
        content: barcodeContent,
        height: 50,
        barcodeType: 'CODE128',
        showBarcodeText: true
      });
    }
  }

  return elements;
}

/**
 * Generate ZPL for a single order label
 */
export function generateOrderLabelZPL(order: OrderItem, settings: OrderLabelSettings = DEFAULT_SETTINGS): string {
  const sizePresets = getLabelSizePresets(settings.dpi);
  const labelSize = sizePresets[settings.labelSize];
  
  const zplSettings: ZPLSettings = {
    dpi: settings.dpi,
    labelWidth: labelSize.width,
    labelHeight: labelSize.height
  };

  const elements = generateOrderLabelElements(order, settings);
  return generateLabelZPL(elements, zplSettings);
}

/**
 * Generate ZPL for bulk order labels
 */
export function generateBulkOrderLabelsZPL(orders: OrderItem[], settings: OrderLabelSettings = DEFAULT_SETTINGS): string {
  let bulkZPL = '';
  
  orders.forEach(order => {
    const labelZPL = generateOrderLabelZPL(order, settings);
    bulkZPL += labelZPL + '\n';
  });
  
  return bulkZPL;
}

/**
 * Send ZPL to printer (browser-based printing)
 */
export function printZPLToPrinter(zpl: string, printerName?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create a blob with the ZPL data
      const blob = new Blob([zpl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link to download the ZPL file
      const link = document.createElement('a');
      link.href = url;
      link.download = `label-${Date.now()}.zpl`;
      
      // For direct printing, we'll open in a new window
      // In a real implementation, you'd integrate with Zebra Browser Print or similar
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print ZPL Label</title>
              <style>
                body { font-family: monospace; white-space: pre-wrap; padding: 20px; }
                .instructions { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
                .zpl-content { background: #fff; border: 1px solid #ccc; padding: 10px; }
              </style>
            </head>
            <body>
              <div class="instructions">
                <h3>ZPL Label Content</h3>
                <p>Copy this ZPL code and send it to your Zebra printer, or use Zebra Browser Print for direct printing.</p>
                <button onclick="navigator.clipboard.writeText(document.querySelector('.zpl-content').textContent)">Copy ZPL</button>
              </div>
              <div class="zpl-content">${zpl}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
      
      URL.revokeObjectURL(url);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download ZPL file
 */
export function downloadZPLFile(zpl: string, filename: string = 'labels.zpl'): void {
  const blob = new Blob([zpl], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Preview ZPL label content
 */
export function previewOrderLabel(order: OrderItem, settings: OrderLabelSettings = DEFAULT_SETTINGS): string {
  const elements = generateOrderLabelElements(order, settings);
  
  let preview = `Order Label Preview:\n`;
  preview += `==================\n`;
  
  elements.forEach(element => {
    if (element.type === 'text') {
      preview += `${element.content}\n`;
    } else if (element.type === 'barcode') {
      preview += `[BARCODE: ${element.content}]\n`;
    }
  });
  
  return preview;
}
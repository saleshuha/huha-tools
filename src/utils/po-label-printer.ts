// ZPL label generation for PO items
import { generateLabelZPL, LabelElement, ZPLSettings } from './zpl-generator';
import { POPrintItem } from './po-print-helpers';

export interface POLabelSettings extends ZPLSettings {
  includeImages?: boolean;
  includeBarcode?: boolean;
}

const DEFAULT_PO_LABEL_SETTINGS: POLabelSettings = {
  dpi: 203,
  labelWidth: 4 * 203, // 4 inches
  labelHeight: 6 * 203, // 6 inches
  includeImages: false, // Images in ZPL are complex, default to false
  includeBarcode: true
};

/**
 * Generate label elements for a single PO item
 */
function generatePOLabelElements(
  item: POPrintItem, 
  settings: POLabelSettings
): LabelElement[] {
  const elements: LabelElement[] = [];
  let yOffset = 50;

  // Stock indicator if fulfilled from stock
  if (item.fulfilledFromStock) {
    elements.push({
      type: 'text',
      x: 50,
      y: yOffset,
      content: '✓ FROM STOCK',
      fontSize: 14,
      fontFamily: 'Arial'
    });
    yOffset += 40;
  }

  // Title section
  elements.push({
    type: 'text',
    x: 50,
    y: yOffset,
    content: 'PURCHASE ORDER ITEM',
    fontSize: 20,
    fontFamily: 'Arial'
  });

  yOffset += 60;

  // ASIN with barcode if enabled
  if (settings.includeBarcode && item.asin && item.asin !== 'N/A') {
    elements.push({
      type: 'text',
      x: 50,
      y: yOffset,
      content: 'ASIN:',
      fontSize: 16,
      fontFamily: 'Arial'
    });

    yOffset += 40;

    elements.push({
      type: 'barcode',
      x: 50,
      y: yOffset,
      content: item.asin,
      height: 80,
      barcodeType: 'CODE128',
      showBarcodeText: true
    });

    yOffset += 140;
  } else {
    elements.push({
      type: 'text',
      x: 50,
      y: yOffset,
      content: `ASIN: ${item.asin}`,
      fontSize: 18,
      fontFamily: 'Arial'
    });

    yOffset += 50;
  }

  // SKU if available
  if (item.sku_code) {
    elements.push({
      type: 'text',
      x: 50,
      y: yOffset,
      content: `SKU: ${item.sku_code}`,
      fontSize: 14,
      fontFamily: 'Arial'
    });

    yOffset += 40;
  }

  // Title (truncated if too long)
  const truncatedTitle = item.title.length > 60 
    ? item.title.substring(0, 60) + '...' 
    : item.title;

  elements.push({
    type: 'text',
    x: 50,
    y: yOffset,
    content: truncatedTitle,
    fontSize: 14,
    fontFamily: 'Arial'
  });

  yOffset += 80;

  // Quantity box
  elements.push({
    type: 'rectangle',
    x: 50,
    y: yOffset,
    width: 200,
    height: 100,
    content: '' // Required by LabelElement interface
  });

  elements.push({
    type: 'text',
    x: 60,
    y: yOffset + 20,
    content: 'QTY',
    fontSize: 16,
    fontFamily: 'Arial'
  });

  elements.push({
    type: 'text',
    x: 80,
    y: yOffset + 50,
    content: item.quantity.toString(),
    fontSize: 36,
    fontFamily: 'Arial'
  });

  // PO Numbers
  yOffset += 120;

  elements.push({
    type: 'text',
    x: 50,
    y: yOffset,
    content: `PO: ${item.poNumbers.join(', ')}`,
    fontSize: 12,
    fontFamily: 'Arial'
  });

  // Stock quantity breakdown if applicable
  if (item.fulfilledFromStock && item.stockQuantity) {
    yOffset += 30;
    elements.push({
      type: 'text',
      x: 50,
      y: yOffset,
      content: `Stock Qty: ${item.stockQuantity}`,
      fontSize: 12,
      fontFamily: 'Arial'
    });
    
    if (item.supplierQuantity > 0) {
      yOffset += 25;
      elements.push({
        type: 'text',
        x: 50,
        y: yOffset,
        content: `Supplier Qty: ${item.supplierQuantity}`,
        fontSize: 12,
        fontFamily: 'Arial'
      });
    }
  }

  // Serial numbers if available
  if (item.serialNumber) {
    yOffset += 30;
    elements.push({
      type: 'text',
      x: 50,
      y: yOffset,
      content: `SN: ${item.serialNumber}`,
      fontSize: 10,
      fontFamily: 'Arial'
    });
  }

  return elements;
}

/**
 * Generate ZPL for a single PO label
 */
export function generatePOLabelZPL(
  item: POPrintItem, 
  settings: POLabelSettings = DEFAULT_PO_LABEL_SETTINGS
): string {
  const elements = generatePOLabelElements(item, settings);
  return generateLabelZPL(elements, settings);
}

/**
 * Generate ZPL for multiple PO labels
 */
export function generateBulkPOLabelsZPL(
  items: POPrintItem[], 
  settings: POLabelSettings = DEFAULT_PO_LABEL_SETTINGS,
  copiesPerItem: number = 1
): string {
  let bulkZPL = '';
  
  items.forEach(item => {
    const singleLabelZPL = generatePOLabelZPL(item, settings);
    
    // Add copies if needed
    for (let i = 0; i < copiesPerItem; i++) {
      bulkZPL += singleLabelZPL + '\n';
    }
  });
  
  return bulkZPL;
}

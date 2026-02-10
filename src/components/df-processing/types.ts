export interface DFOrderItem {
  orderId: string;
  orderStatus: string;
  warehouseCode: string;
  orderPlaceDate: string;
  requiredShipDate: string;
  shipMethod: string;
  shipToName: string;
  shipToCity: string;
  shipToState: string;
  shipToCountry: string;
  sku: string;
  asin: string;
  itemTitle: string;
  itemQuantity: number;
  itemCost: string;
  sourceFile: string;
  // Added by steps
  sourceStatus?: 'sunsky' | 'other';
  sunskyCost?: number;
  sunskySku?: string;
  inventoryStatus?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'not-tracked';
  availableQty?: number;
  inventoryId?: string;
  inventoryType?: 'asin' | 'sku';
  matchType?: 'asin' | 'sku';
  serialNumber?: string;
  isProcessed?: boolean;
}

export type WizardStep = 1 | 2 | 3 | 4;

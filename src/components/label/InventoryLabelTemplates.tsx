import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package2, QrCode, Hash, Warehouse, Archive } from 'lucide-react';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { LabelElement } from '@/types/label';
import { toast } from 'sonner';

export const InventoryLabelTemplates: React.FC = () => {
  const { addElement, document: labelDoc } = useLabelDoc();

  const createWarehouseInventoryLabel = () => {
    if (!labelDoc) {
      toast.error('Please create a label first');
      return;
    }

    const elements: Omit<LabelElement, 'id'>[] = [
      // Header
      {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: labelDoc.size.width * 3.78, // Convert mm to px
        height: 25,
        fill: '#1f2937',
        stroke: '#000000',
        strokeWidth: 1,
      },
      {
        type: 'text',
        x: 10,
        y: 5,
        width: (labelDoc.size.width * 3.78) - 20,
        height: 15,
        text: 'WAREHOUSE INVENTORY',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#ffffff',
        textAlign: 'center',
      },
      // Item Type Badge
      {
        type: 'rectangle',
        x: 5,
        y: 35,
        width: 50,
        height: 15,
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 1,
        borderRadius: 3,
      },
      {
        type: 'text',
        x: 7,
        y: 37,
        width: 46,
        height: 11,
        text: 'ASIN',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#ffffff',
        textAlign: 'center',
        dataColumn: 'Type',
        dataTransform: { uppercase: true },
      },
      // ASIN/SKU Code
      {
        type: 'text',
        x: 60,
        y: 35,
        width: 120,
        height: 15,
        text: 'B08XXXX',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'ASIN',
      },
      // Title
      {
        type: 'text',
        x: 5,
        y: 55,
        width: (labelDoc.size.width * 3.78) - 10,
        height: 30,
        text: 'Product Title Here',
        fontSize: 9,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      // Quantity Section
      {
        type: 'text',
        x: 5,
        y: 90,
        width: 30,
        height: 12,
        text: 'QTY:',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'rectangle',
        x: 35,
        y: 88,
        width: 40,
        height: 16,
        fill: '#f3f4f6',
        stroke: '#d1d5db',
        strokeWidth: 1,
        borderRadius: 3,
      },
      {
        type: 'text',
        x: 40,
        y: 91,
        width: 30,
        height: 10,
        text: '1',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'center',
        dataColumn: 'Quantity',
      },
      // Status
      {
        type: 'text',
        x: 85,
        y: 90,
        width: 60,
        height: 12,
        text: 'In Stock',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#059669',
        dataColumn: 'Status',
      },
      // Serial/Bin Number
      {
        type: 'text',
        x: 5,
        y: 110,
        width: 40,
        height: 10,
        text: 'Serial:',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#6b7280',
      },
      {
        type: 'text',
        x: 45,
        y: 110,
        width: 100,
        height: 10,
        text: 'SN001234',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#374151',
        dataColumn: 'Serial/Bin',
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('Warehouse inventory label template created');
  };

  const createQRInventoryLabel = () => {
    if (!labelDoc) {
      toast.error('Please create a label first');
      return;
    }

    const elements: Omit<LabelElement, 'id'>[] = [
      // QR Code
      {
        type: 'qr',
        x: 5,
        y: 5,
        width: 40,
        height: 40,
        text: 'INVENTORY_ID',
        dataColumn: 'ID',
      },
      // Product Info
      {
        type: 'text',
        x: 50,
        y: 5,
        width: 130,
        height: 15,
        text: 'Product Name',
        fontSize: 9,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      {
        type: 'text',
        x: 50,
        y: 20,
        width: 80,
        height: 12,
        text: 'ASIN/SKU',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#374151',
        dataColumn: 'ASIN',
      },
      {
        type: 'text',
        x: 50,
        y: 32,
        width: 50,
        height: 10,
        text: 'Qty: 1',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Quantity',
        dataTransform: { prefix: 'Qty: ' },
      },
      // Footer
      {
        type: 'text',
        x: 5,
        y: 48,
        width: 175,
        height: 8,
        text: 'Scan QR for inventory details',
        fontSize: 6,
        fontFamily: 'Arial',
        color: '#9ca3af',
        textAlign: 'center',
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('QR inventory label template created');
  };

  const createBarcodeInventoryLabel = () => {
    if (!labelDoc) {
      toast.error('Please create a label first');
      return;
    }

    const elements: Omit<LabelElement, 'id'>[] = [
      // Title
      {
        type: 'text',
        x: 5,
        y: 5,
        width: (labelDoc.size.width * 3.78) - 10,
        height: 20,
        text: 'Product Title',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      // ASIN/SKU
      {
        type: 'text',
        x: 5,
        y: 25,
        width: 80,
        height: 15,
        text: 'CODE123',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#374151',
        dataColumn: 'ASIN',
      },
      // Barcode
      {
        type: 'barcode',
        x: 5,
        y: 45,
        width: 120,
        height: 25,
        text: 'BARCODE_DATA',
        barcodeType: 'CODE128',
        showText: true,
        dataColumn: 'ASIN',
      },
      // Quantity and Status
      {
        type: 'text',
        x: 130,
        y: 25,
        width: 50,
        height: 12,
        text: 'Qty: 1',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Quantity',
        dataTransform: { prefix: 'Qty: ' },
      },
      {
        type: 'text',
        x: 130,
        y: 37,
        width: 60,
        height: 10,
        text: 'Available',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#059669',
        dataColumn: 'Status',
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('Barcode inventory label template created');
  };

  const createCompactInventoryLabel = () => {
    if (!labelDoc) {
      toast.error('Please create a label first');
      return;
    }

    const elements: Omit<LabelElement, 'id'>[] = [
      // Compact Header
      {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: labelDoc.size.width * 3.78,
        height: 18,
        fill: '#374151',
        stroke: '#000000',
        strokeWidth: 1,
      },
      {
        type: 'text',
        x: 5,
        y: 3,
        width: 80,
        height: 12,
        text: 'INVENTORY',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#ffffff',
      },
      {
        type: 'text',
        x: 85,
        y: 3,
        width: 100,
        height: 12,
        text: 'ASIN123',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#ffffff',
        dataColumn: 'ASIN',
      },
      // Compact Info
      {
        type: 'text',
        x: 5,
        y: 22,
        width: 150,
        height: 15,
        text: 'Item Name',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      {
        type: 'text',
        x: 5,
        y: 35,
        width: 40,
        height: 10,
        text: 'Q:1',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Quantity',
        dataTransform: { prefix: 'Q:' },
      },
      {
        type: 'text',
        x: 50,
        y: 35,
        width: 60,
        height: 10,
        text: 'Available',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#059669',
        dataColumn: 'Status',
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('Compact inventory label template created');
  };

  const createDetailedInventoryLabel = () => {
    if (!labelDoc) {
      toast.error('Please create a label first');
      return;
    }

    const elements: Omit<LabelElement, 'id'>[] = [
      // Header Section
      {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: labelDoc.size.width * 3.78,
        height: 30,
        fill: '#1e40af',
        stroke: '#1e3a8a',
        strokeWidth: 2,
      },
      {
        type: 'text',
        x: 10,
        y: 8,
        width: (labelDoc.size.width * 3.78) - 20,
        height: 14,
        text: 'DETAILED INVENTORY LABEL',
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#ffffff',
        textAlign: 'center',
      },
      // Item Information Grid
      {
        type: 'text',
        x: 10,
        y: 40,
        width: 30,
        height: 12,
        text: 'Type:',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 45,
        y: 40,
        width: 60,
        height: 12,
        text: 'ASIN',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Type',
        dataTransform: { uppercase: true },
      },
      {
        type: 'text',
        x: 110,
        y: 40,
        width: 35,
        height: 12,
        text: 'Code:',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 150,
        y: 40,
        width: 100,
        height: 12,
        text: 'B08XXXXX',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'ASIN',
      },
      // Product Title
      {
        type: 'text',
        x: 10,
        y: 55,
        width: (labelDoc.size.width * 3.78) - 20,
        height: 25,
        text: 'Product Title Goes Here',
        fontSize: 9,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      // SKU Section
      {
        type: 'text',
        x: 10,
        y: 85,
        width: 30,
        height: 12,
        text: 'SKU:',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 45,
        y: 85,
        width: 120,
        height: 12,
        text: 'SKU123456',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'SKU',
      },
      // Quantity and Status Row
      {
        type: 'rectangle',
        x: 10,
        y: 100,
        width: 60,
        height: 20,
        fill: '#f9fafb',
        stroke: '#d1d5db',
        strokeWidth: 1,
        borderRadius: 4,
      },
      {
        type: 'text',
        x: 15,
        y: 103,
        width: 50,
        height: 8,
        text: 'QUANTITY',
        fontSize: 6,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#6b7280',
        textAlign: 'center',
      },
      {
        type: 'text',
        x: 15,
        y: 110,
        width: 50,
        height: 10,
        text: '1',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'center',
        dataColumn: 'Quantity',
      },
      // Status Badge
      {
        type: 'rectangle',
        x: 80,
        y: 100,
        width: 70,
        height: 20,
        fill: '#dcfce7',
        stroke: '#16a34a',
        strokeWidth: 1,
        borderRadius: 4,
      },
      {
        type: 'text',
        x: 85,
        y: 103,
        width: 60,
        height: 8,
        text: 'STATUS',
        fontSize: 6,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#15803d',
        textAlign: 'center',
      },
      {
        type: 'text',
        x: 85,
        y: 110,
        width: 60,
        height: 10,
        text: 'In Stock',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#15803d',
        textAlign: 'center',
        dataColumn: 'Status',
      },
      // Serial Number
      {
        type: 'text',
        x: 10,
        y: 125,
        width: 40,
        height: 10,
        text: 'Serial:',
        fontSize: 7,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#6b7280',
      },
      {
        type: 'text',
        x: 55,
        y: 125,
        width: 120,
        height: 10,
        text: 'SN123456789',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#374151',
        dataColumn: 'Serial/Bin',
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('Detailed inventory label template created');
  };

  const templates = [
    {
      name: 'Warehouse Label',
      description: 'Professional warehouse inventory label with status indicators',
      icon: Warehouse,
      action: createWarehouseInventoryLabel,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      recommended: true,
    },
    {
      name: 'QR Code Label',
      description: 'Compact label with QR code for quick scanning',
      icon: QrCode,
      action: createQRInventoryLabel,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      name: 'Barcode Label',
      description: 'Standard barcode label for inventory tracking',
      icon: Hash,
      action: createBarcodeInventoryLabel,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    },
    {
      name: 'Compact Label',
      description: 'Space-efficient label for small items',
      icon: Archive,
      action: createCompactInventoryLabel,
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    },
    {
      name: 'Detailed Label',
      description: 'Comprehensive label with all inventory information',
      icon: Package2,
      action: createDetailedInventoryLabel,
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    },
  ];

  return (
    <Card className="w-full h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          Inventory Label Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Professional inventory labels pre-mapped with your inventory data fields
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          {templates.map((template) => (
            <div key={template.name} className="relative">
              {template.recommended && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 z-10 bg-green-100 text-green-800 text-xs px-2 py-0.5"
                >
                  Recommended
                </Badge>
              )}
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 hover:bg-accent/50 transition-all duration-200"
                onClick={template.action}
                disabled={!labelDoc}
              >
                <div className="flex items-start gap-4 w-full">
                  <div className={`p-3 rounded-lg ${template.color} flex-shrink-0`}>
                    <template.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left space-y-1">
                    <div className="font-semibold text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {template.description}
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          ))}
        </div>
        
        {!labelDoc && (
          <div className="p-4 bg-muted/50 rounded-lg text-center border-2 border-dashed border-border">
            <Package2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Create a new label to use templates</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Click "New Label" in the header to get started</p>
          </div>
        )}

        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
          <div className="flex items-center gap-2">
            <Package2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">Inventory Template Features:</p>
          </div>
          <ul className="space-y-1.5 text-xs text-blue-800 dark:text-blue-200">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              Pre-mapped to inventory data (ASIN, SKU, Title, Quantity, Status)
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              Professional layouts optimized for warehouse use
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              Support for barcodes, QR codes, and serial numbers
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              Ready for thermal and standard printers
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
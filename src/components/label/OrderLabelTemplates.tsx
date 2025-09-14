import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Tag, FileText, Barcode } from 'lucide-react';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { LabelElement } from '@/types/label';
import { toast } from 'sonner';

export const OrderLabelTemplates: React.FC = () => {
  const { addElement, document: labelDoc } = useLabelDoc();

  const createShippingLabelTemplate = () => {
    if (!labelDoc) {
      toast.error('Please create a label first');
      return;
    }

    const elements: Omit<LabelElement, 'id'>[] = [
      // Header Background
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
      // Title
      {
        type: 'text',
        x: 10,
        y: 5,
        width: (labelDoc.size.width * 3.78) - 20,
        height: 15,
        text: 'AMAZON ORDER LABEL',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#ffffff',
        textAlign: 'center',
      },
      // Order Number Section
      {
        type: 'text',
        x: 10,
        y: 35,
        width: 70,
        height: 15,
        text: 'Order #:',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 85,
        y: 35,
        width: 150,
        height: 15,
        text: 'ORDER123456',
        fontSize: 10,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Order Number',
      },
      // ASIN Section
      {
        type: 'text',
        x: 10,
        y: 55,
        width: 50,
        height: 15,
        text: 'ASIN:',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 65,
        y: 55,
        width: 120,
        height: 15,
        text: 'B08XXXXX',
        fontSize: 10,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'ASIN',
      },
      // SKU Section  
      {
        type: 'text',
        x: 10,
        y: 75,
        width: 50,
        height: 15,
        text: 'SKU:',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 65,
        y: 75,
        width: 120,
        height: 15,
        text: 'SKU123',
        fontSize: 10,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'SKU',
      },
      // Product Title Section
      {
        type: 'text',
        x: 10,
        y: 95,
        width: (labelDoc.size.width * 3.78) - 20,
        height: 30,
        text: 'Product Title Here',
        fontSize: 9,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      // Quantity Section with Background
      {
        type: 'rectangle',
        x: 10,
        y: 130,
        width: 50,
        height: 20,
        fill: '#f3f4f6',
        stroke: '#d1d5db',
        strokeWidth: 1,
        borderRadius: 3,
      },
      {
        type: 'text',
        x: 15,
        y: 135,
        width: 40,
        height: 10,
        text: 'Qty: 1',
        fontSize: 9,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'center',
        dataColumn: 'Quantity',
        dataTransform: { prefix: 'Qty: ' },
      },
      // Barcode Section
      {
        type: 'barcode',
        x: 80,
        y: 130,
        width: 100,
        height: 25,
        text: 'BARCODE_DATA',
        barcodeType: 'CODE128',
        showText: true,
        dataColumn: 'ASIN',
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('Amazon order label template created');
  };

  const createProductLabelTemplate = () => {
    if (!labelDoc) {
      toast.error('Please create a label first');
      return;
    }

    const elements: Omit<LabelElement, 'id'>[] = [
      // Product Title
      {
        type: 'text',
        x: 5,
        y: 5,
        width: 190,
        height: 25,
        text: 'Product Name',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      // SKU/ASIN
      {
        type: 'text',
        x: 5,
        y: 30,
        width: 90,
        height: 15,
        text: 'SKU/ASIN',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'SKU',
      },
      // Quantity Badge
      {
        type: 'rectangle',
        x: 150,
        y: 30,
        width: 45,
        height: 15,
        fill: '#f0f0f0',
        stroke: '#333333',
        strokeWidth: 1,
      },
      {
        type: 'text',
        x: 155,
        y: 32,
        width: 35,
        height: 11,
        text: 'Qty: 1',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Quantity',
        dataTransform: { prefix: 'Qty: ' },
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('Product label template created');
  };

  const createInventoryLabelTemplate = () => {
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
        width: 200,
        height: 20,
        fill: '#333333',
        stroke: '#000000',
        strokeWidth: 1,
      },
      {
        type: 'text',
        x: 5,
        y: 3,
        width: 190,
        height: 14,
        text: 'INVENTORY ITEM',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#ffffff',
        textAlign: 'center',
      },
      // Item Details
      {
        type: 'text',
        x: 5,
        y: 25,
        width: 40,
        height: 12,
        text: 'Type:',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
      },
      {
        type: 'text',
        x: 45,
        y: 25,
        width: 50,
        height: 12,
        text: 'ASIN',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Type',
      },
      {
        type: 'text',
        x: 5,
        y: 40,
        width: 190,
        height: 20,
        text: 'Item Title',
        fontSize: 9,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Title',
      },
      // ID/Serial
      {
        type: 'text',
        x: 5,
        y: 65,
        width: 190,
        height: 10,
        text: 'ID: SERIAL_NUMBER',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#666666',
        dataColumn: 'Serial/Bin',
        dataTransform: { prefix: 'ID: ' },
      },
      // Status & Quantity
      {
        type: 'text',
        x: 5,
        y: 80,
        width: 60,
        height: 12,
        text: 'Status:',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
      },
      {
        type: 'text',
        x: 65,
        y: 80,
        width: 60,
        height: 12,
        text: 'In Stock',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#008000',
        dataColumn: 'Status',
      },
      {
        type: 'text',
        x: 130,
        y: 80,
        width: 65,
        height: 12,
        text: 'Qty: 1',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'Quantity',
        dataTransform: { prefix: 'Qty: ' },
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('Inventory label template created');
  };

  const templates = [
    {
      name: 'Shipping Label',
      description: 'Standard shipping label with order details and barcode',
      icon: Package,
      action: createShippingLabelTemplate,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      name: 'Product Label',
      description: 'Compact product label for retail items',
      icon: Tag,
      action: createProductLabelTemplate,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      name: 'Inventory Label',
      description: 'Detailed inventory tracking label',
      icon: FileText,
      action: createInventoryLabelTemplate,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    },
  ];

  return (
    <Card className="w-80 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          Label Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quick start templates for common label types
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.map((template) => (
          <div key={template.name} className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={template.action}
              disabled={!labelDoc}
            >
              <div className="flex items-start gap-3 w-full">
                <div className={`p-2 rounded-md ${template.color}`}>
                  <template.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.description}
                  </div>
                </div>
              </div>
            </Button>
          </div>
        ))}
        
        {!labelDoc && (
          <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
            Create a new label to use templates
          </div>
        )}

        <div className="p-3 bg-muted rounded-lg text-xs space-y-2">
          <p className="font-medium">Template Features:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Pre-mapped data fields</li>
            <li>• Optimized layouts</li>
            <li>• Ready for printing</li>
            <li>• Customizable elements</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
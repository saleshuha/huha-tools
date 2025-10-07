import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, ShoppingCart } from 'lucide-react';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { LabelElement } from '@/types/label';
import { toast } from 'sonner';

export const POLabelTemplates: React.FC = () => {
  const { addElement, document: labelDoc } = useLabelDoc();

  const createPOShippingLabel = () => {
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
        width: labelDoc.size.width * 3.78,
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
        text: 'PURCHASE ORDER',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#ffffff',
        textAlign: 'center',
      },
      // PO Number
      {
        type: 'text',
        x: 5,
        y: 35,
        width: 60,
        height: 12,
        text: 'PO Number:',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 70,
        y: 35,
        width: 100,
        height: 12,
        text: 'PO-001234',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'PO Number',
      },
      // Model Number
      {
        type: 'text',
        x: 5,
        y: 50,
        width: 60,
        height: 12,
        text: 'Model:',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#374151',
      },
      {
        type: 'text',
        x: 70,
        y: 50,
        width: 120,
        height: 12,
        text: 'MODEL123',
        fontSize: 9,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'model_number',
      },
      // Title
      {
        type: 'text',
        x: 5,
        y: 70,
        width: (labelDoc.size.width * 3.78) - 10,
        height: 30,
        text: 'Product Title Here',
        fontSize: 9,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'title',
      },
      // Quantity
      {
        type: 'text',
        x: 5,
        y: 105,
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
        y: 103,
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
        y: 106,
        width: 30,
        height: 10,
        text: '1',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'center',
        dataColumn: 'quantity',
      },
      // Status
      {
        type: 'text',
        x: 85,
        y: 105,
        width: 60,
        height: 12,
        text: 'Pending',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#f59e0b',
        dataColumn: 'status',
      },
      // ASIN
      {
        type: 'text',
        x: 5,
        y: 142,
        width: 30,
        height: 10,
        text: 'ASIN:',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#6b7280',
      },
      {
        type: 'text',
        x: 35,
        y: 142,
        width: 80,
        height: 10,
        text: 'B01234ABCD',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#374151',
        dataColumn: 'asin',
      },
      // Ship To
      {
        type: 'text',
        x: 5,
        y: 125,
        width: 40,
        height: 10,
        text: 'Ship To:',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#6b7280',
      },
      {
        type: 'text',
        x: 45,
        y: 125,
        width: 140,
        height: 10,
        text: 'Warehouse Location',
        fontSize: 7,
        fontFamily: 'Arial',
        color: '#374151',
        dataColumn: 'Ship To',
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('PO shipping label template created');
  };

  const createPOBarcodeLabel = () => {
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
        dataColumn: 'title',
      },
      // Model Number
      {
        type: 'text',
        x: 5,
        y: 25,
        width: 80,
        height: 15,
        text: 'MODEL123',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#374151',
        dataColumn: 'model_number',
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
        dataColumn: 'model_number',
      },
      // PO Info
      {
        type: 'text',
        x: 130,
        y: 25,
        width: 50,
        height: 12,
        text: 'PO-001',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'PO Number',
      },
      {
        type: 'text',
        x: 130,
        y: 37,
        width: 50,
        height: 12,
        text: 'Qty: 1',
        fontSize: 8,
        fontFamily: 'Arial',
        color: '#000000',
        dataColumn: 'quantity',
        dataTransform: { prefix: 'Qty: ' },
      },
    ];

    elements.forEach(element => addElement(element));
    toast.success('PO barcode label template created');
  };

  const templates = [
    {
      name: 'PO Shipping Label',
      description: 'Complete shipping label with PO details, model number, and destination',
      icon: <Truck className="h-5 w-5" />,
      action: createPOShippingLabel,
      color: 'bg-blue-500',
      preview: 'Full shipping information with PO number, model, quantity, and ship-to details'
    },
    {
      name: 'PO Barcode Label',
      description: 'Compact label with barcode for PO item tracking',
      icon: <Package className="h-5 w-5" />,
      action: createPOBarcodeLabel,
      color: 'bg-green-500',
      preview: 'Barcode label with model number, PO reference, and quantity'
    }
  ];

  return (
    <Card className="border-2 border-border/50 bg-gradient-to-br from-card/80 to-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          PO Label Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quick templates for purchase order labels and tracking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map((template, index) => (
          <div key={index} className="space-y-3">
            <Button
              onClick={template.action}
              disabled={!labelDoc}
              className="w-full h-auto p-4 bg-gradient-to-r from-primary/90 to-primary/80 hover:from-primary hover:to-primary/90 border-2 border-primary/30 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={`p-2 rounded-lg ${template.color} text-white shadow-sm`}>
                  {template.icon}
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-primary-foreground text-sm">
                    {template.name}
                  </h4>
                  <p className="text-xs text-primary-foreground/80 mt-1">
                    {template.description}
                  </p>
                </div>
              </div>
            </Button>
            <div className="px-2">
              <Badge variant="outline" className="text-xs border-muted-foreground/30 bg-muted/30">
                {template.preview}
              </Badge>
            </div>
          </div>
        ))}
        
        {!labelDoc && (
          <div className="text-center py-6 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Create a label first to use PO templates</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
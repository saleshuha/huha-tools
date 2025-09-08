import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { 
  Type, 
  Square, 
  Circle, 
  BarChart3, 
  QrCode, 
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { toast } from 'sonner';

export const LeftToolbox: React.FC = () => {
  const { addElement } = useLabelDoc();

  const handleAddElement = (type: string) => {
    const baseProps = {
      x: 50,
      y: 50,
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000'
    };

    switch (type) {
      case 'text':
        addElement({
          type: 'text',
          text: 'Sample Text',
          width: 100,
          height: 20,
          ...baseProps
        });
        break;
      case 'rectangle':
        addElement({
          type: 'rectangle',
          width: 100,
          height: 60,
          fill: '#e5e7eb',
          stroke: '#374151',
          strokeWidth: 1,
          x: 50,
          y: 50
        });
        break;
      case 'circle':
        addElement({
          type: 'circle',
          width: 60,
          height: 60,
          fill: '#e5e7eb',
          stroke: '#374151',
          strokeWidth: 1,
          x: 50,
          y: 50
        });
        break;
      case 'barcode':
        addElement({
          type: 'barcode',
          text: '123456789',
          width: 120,
          height: 40,
          ...baseProps
        });
        break;
      case 'qr':
        addElement({
          type: 'qr',
          text: 'Sample QR Data',
          width: 60,
          height: 60,
          ...baseProps
        });
        break;
    }
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} element added`);
  };

  const elements = [
    { type: 'text', label: 'Text', icon: Type, description: 'Add text element' },
    { type: 'rectangle', label: 'Rectangle', icon: Square, description: 'Add rectangle shape' },
    { type: 'circle', label: 'Circle', icon: Circle, description: 'Add circle shape' },
    { type: 'barcode', label: 'Barcode', icon: BarChart3, description: 'Add barcode element' },
    { type: 'qr', label: 'QR Code', icon: QrCode, description: 'Add QR code element' }
  ];

  const alignmentTools = [
    { icon: AlignLeft, label: 'Left', action: 'align-left' },
    { icon: AlignCenter, label: 'Center', action: 'align-center' },
    { icon: AlignRight, label: 'Right', action: 'align-right' }
  ];

  return (
    <Card className="h-full border-2 border-border/60 bg-gradient-to-br from-card/80 to-card/60 shadow-lg">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Square className="h-4 w-4 text-primary" />
          Elements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-full">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Add Elements Section */}
            <div className="space-y-3">
              <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20">
                Add Elements
              </Badge>
              <div className="grid gap-2">
                {elements.map((element) => {
                  const IconComponent = element.icon;
                  return (
                    <Button
                      key={element.type}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddElement(element.type)}
                      className="w-full justify-start gap-2 h-10 border-border/50 hover:border-primary/40 hover:bg-primary/5 text-foreground font-medium"
                    >
                      <IconComponent className="h-4 w-4 text-primary" />
                      <span className="text-sm">{element.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Quick Alignment Tools */}
            <div className="space-y-3 pt-4 border-t border-border/30">
              <Badge variant="secondary" className="text-xs px-2 py-1 bg-accent/10 text-accent-foreground border-accent/20">
                Quick Tools
              </Badge>
              <div className="grid grid-cols-3 gap-1">
                {alignmentTools.map((tool) => {
                  const IconComponent = tool.icon;
                  return (
                    <Button
                      key={tool.action}
                      variant="outline"
                      size="sm"
                      className="h-9 px-2 border-border/50 hover:border-accent/40 hover:bg-accent/5"
                      title={tool.label}
                    >
                      <IconComponent className="h-3 w-3 text-accent" />
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Help Text */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border/30 text-xs text-muted-foreground">
              <p>Click any element to add it to your label. Use the Properties panel to customize appearance and data mapping.</p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
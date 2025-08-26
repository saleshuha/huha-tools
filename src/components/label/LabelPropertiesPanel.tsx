import React from 'react';
import { useLabelDoc } from '@/contexts/LabelDocContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';

export const LabelPropertiesPanel: React.FC = () => {
  const { selectedElement, dataset, updateElement, deleteElement } = useLabelDoc();

  if (!selectedElement) {
    return (
      <Card className="w-64 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select an element to edit its properties
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = (updates: Partial<typeof selectedElement>) => {
    updateElement(selectedElement.id, updates);
  };

  const handleDelete = () => {
    deleteElement(selectedElement.id);
  };

  return (
    <Card className="w-64 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Properties</CardTitle>
        <p className="text-sm text-muted-foreground capitalize">
          {selectedElement.type} Element
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position & Size */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Position & Size</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={selectedElement.x}
                onChange={(e) => handleUpdate({ x: parseFloat(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={selectedElement.y}
                onChange={(e) => handleUpdate({ y: parseFloat(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={selectedElement.width}
                onChange={(e) => handleUpdate({ width: parseFloat(e.target.value) || 1 })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={selectedElement.height}
                onChange={(e) => handleUpdate({ height: parseFloat(e.target.value) || 1 })}
                className="h-8"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Text Properties */}
        {selectedElement.type === 'text' && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Text Properties</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Text</Label>
                <Input
                  value={selectedElement.text || ''}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                  className="h-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Font Size</Label>
                  <Input
                    type="number"
                    value={selectedElement.fontSize || 12}
                    onChange={(e) => handleUpdate({ fontSize: parseFloat(e.target.value) || 12 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={selectedElement.color || '#000000'}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={selectedElement.fontFamily || 'Arial'}
                  onValueChange={(value) => handleUpdate({ fontFamily: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Text Properties */}
        {selectedElement.type === 'multitext' && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Multi-Text Properties</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Text Content</Label>
                <textarea
                  value={selectedElement.text || ''}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                  className="w-full h-20 px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
                  placeholder="Enter long text that will wrap across multiple lines..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Font Size</Label>
                  <Input
                    type="number"
                    value={selectedElement.fontSize || 10}
                    onChange={(e) => handleUpdate({ fontSize: parseFloat(e.target.value) || 10 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Line Height</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="3"
                    value={selectedElement.lineHeight || 1.2}
                    onChange={(e) => handleUpdate({ lineHeight: parseFloat(e.target.value) || 1.2 })}
                    className="h-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <Input
                  type="color"
                  value={selectedElement.color || '#000000'}
                  onChange={(e) => handleUpdate({ color: e.target.value })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={selectedElement.fontFamily || 'Arial'}
                  onValueChange={(value) => handleUpdate({ fontFamily: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Text Alignment</Label>
                <Select
                  value={selectedElement.textAlign || 'left'}
                  onValueChange={(value: 'left' | 'center' | 'right') => handleUpdate({ textAlign: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Shape Properties */}
        {(selectedElement.type === 'rectangle' || selectedElement.type === 'circle') && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Shape Properties</Label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Fill Color</Label>
                  <Input
                    type="color"
                    value={selectedElement.fill || '#ffffff'}
                    onChange={(e) => handleUpdate({ fill: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Border Color</Label>
                  <Input
                    type="color"
                    value={selectedElement.stroke || '#000000'}
                    onChange={(e) => handleUpdate({ stroke: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Border Width</Label>
                <Input
                  type="number"
                  value={selectedElement.strokeWidth || 1}
                  onChange={(e) => handleUpdate({ strokeWidth: parseFloat(e.target.value) || 1 })}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        )}

        {/* Barcode Properties */}
        {selectedElement.type === 'barcode' && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Barcode Properties</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Content</Label>
                <Input
                  value={selectedElement.text || ''}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Barcode Type</Label>
                <Select
                  value={selectedElement.barcodeType || 'CODE128'}
                  onValueChange={(value) => handleUpdate({ barcodeType: value as any })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="CODE128">CODE128</SelectItem>
                    <SelectItem value="EAN13">EAN13</SelectItem>
                    <SelectItem value="CODE39">CODE39</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* QR Properties */}
        {selectedElement.type === 'qr' && (
          <div>
            <Label className="text-sm font-medium mb-2 block">QR Code Properties</Label>
            <div>
              <Label className="text-xs">Content</Label>
              <Input
                value={selectedElement.text || ''}
                onChange={(e) => handleUpdate({ text: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Data Mapping */}
        {dataset && dataset.headers.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Data Mapping</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Map to Column</Label>
                <Select
                  value={selectedElement.dataColumn === 'none' ? '' : selectedElement.dataColumn || ''}
                  onValueChange={(value) => handleUpdate({ dataColumn: value === 'none' ? undefined : value || undefined })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="none">None</SelectItem>
                    {dataset.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedElement.dataColumn && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Prefix</Label>
                    <Input
                      value={selectedElement.dataTransform?.prefix || ''}
                      onChange={(e) => handleUpdate({
                        dataTransform: {
                          ...selectedElement.dataTransform,
                          prefix: e.target.value || undefined
                        }
                      })}
                      className="h-8"
                      placeholder="Optional prefix"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Suffix</Label>
                    <Input
                      value={selectedElement.dataTransform?.suffix || ''}
                      onChange={(e) => handleUpdate({
                        dataTransform: {
                          ...selectedElement.dataTransform,
                          suffix: e.target.value || undefined
                        }
                      })}
                      className="h-8"
                      placeholder="Optional suffix"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Element
        </Button>
      </CardContent>
    </Card>
  );
};
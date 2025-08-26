import React from 'react';
import { useLabelDoc } from '@/contexts/LabelDocContext';
import { LABEL_PRESETS } from '@/types/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Type, Square, Circle, QrCode, BarChart3, Save, Download, AlignLeft } from 'lucide-react';
import { toast } from 'sonner';

export const LabelToolbar: React.FC = () => {
  const { document, addElement, updateCanvasSize, saveDocument } = useLabelDoc();

  if (!document) return null;

  const handleAddText = () => {
    addElement({
      type: 'text',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      text: 'Sample Text',
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000',
    });
  };

  const handleAddMultiText = () => {
    addElement({
      type: 'multitext',
      x: 10,
      y: 35,
      width: 120,
      height: 60,
      text: 'This is a long text that will be displayed across multiple lines automatically when it exceeds the width of the text box.',
      fontSize: 10,
      fontFamily: 'Arial',
      color: '#000000',
      lineHeight: 1.2,
      maxLines: 0, // 0 means unlimited lines
      wordWrap: true,
      textAlign: 'left',
    });
  };

  const handleAddRectangle = () => {
    addElement({
      type: 'rectangle',
      x: 10,
      y: 40,
      width: 80,
      height: 40,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
    });
  };

  const handleAddCircle = () => {
    addElement({
      type: 'circle',
      x: 10,
      y: 90,
      width: 50,
      height: 50,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
    });
  };

  const handleAddBarcode = () => {
    addElement({
      type: 'barcode',
      x: 10,
      y: 150,
      width: 80,
      height: 30,
      text: '123456789',
      barcodeType: 'CODE128',
      showText: true,
    });
  };

  const handleAddQR = () => {
    addElement({
      type: 'qr',
      x: 10,
      y: 190,
      width: 40,
      height: 40,
      text: 'Sample QR',
    });
  };

  const handlePresetChange = (presetKey: string) => {
    const preset = LABEL_PRESETS[presetKey];
    if (preset) {
      updateCanvasSize(preset);
      toast.success(`Label size changed to ${preset.width}×${preset.height}mm`);
    }
  };

  const handleCustomSizeChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    updateCanvasSize({
      ...document.size,
      [dimension]: numValue,
    });
  };

  const handleSave = async () => {
    await saveDocument();
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  return (
    <Card className="w-64 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Element Tools */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Add Elements</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddText}
              className="flex flex-col items-center gap-1 h-12"
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Text</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMultiText}
              className="flex flex-col items-center gap-1 h-12"
            >
              <AlignLeft className="h-4 w-4" />
              <span className="text-xs">Multi-Text</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRectangle}
              className="flex flex-col items-center gap-1 h-12"
            >
              <Square className="h-4 w-4" />
              <span className="text-xs">Rectangle</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCircle}
              className="flex flex-col items-center gap-1 h-12"
            >
              <Circle className="h-4 w-4" />
              <span className="text-xs">Circle</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddBarcode}
              className="flex flex-col items-center gap-1 h-12"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Barcode</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddQR}
              className="flex flex-col items-center gap-1 h-12 col-span-2"
            >
              <QrCode className="h-4 w-4" />
              <span className="text-xs">QR Code</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Label Size */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Label Size</Label>
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="w-full mb-2">
              <SelectValue placeholder="Choose preset" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LABEL_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {key} ({preset.width}×{preset.height}mm)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Width (mm)</Label>
              <Input
                type="number"
                value={document.size.width}
                onChange={(e) => handleCustomSizeChange('width', e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Height (mm)</Label>
              <Input
                type="number"
                value={document.size.height}
                onChange={(e) => handleCustomSizeChange('height', e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleSave}
            className="w-full"
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Label
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="w-full"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
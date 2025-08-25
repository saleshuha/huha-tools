import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Type, 
  Square, 
  Circle, 
  BarChart, 
  QrCode, 
  Eye, 
  Database,
  Hash,
  AlignLeft,
  Palette
} from "lucide-react";
import { useLabelDataset } from "@/hooks/useLabelDataset";

interface AddElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: 'text' | 'rectangle' | 'circle' | 'barcode' | 'qr' | null;
  datasetId: string | null;
  onAddElement: (elementConfig: ElementConfig) => void;
}

interface ElementConfig {
  type: 'text' | 'rectangle' | 'circle' | 'barcode' | 'qr';
  dataMode: 'static' | 'column';
  staticValue?: string;
  dataColumn?: string;
  transform?: {
    prefix?: string;
    suffix?: string;
    uppercase?: boolean;
    truncate?: number;
  };
  style?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    fontWeight?: string;
  };
  barcodeOptions?: {
    symbology: 'CODE128' | 'EAN13';
    height: number;
    displayValue: boolean;
  };
  qrOptions?: {
    moduleSize: number;
    margin: number;
  };
}

export function AddElementDialog({
  open,
  onOpenChange,
  elementType,
  datasetId,
  onAddElement
}: AddElementDialogProps) {
  const { dataset } = useLabelDataset(datasetId);
  const [config, setConfig] = useState<ElementConfig>({
    type: elementType || 'text',
    dataMode: datasetId ? 'column' : 'static',
    staticValue: '',
    style: {
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal'
    },
    barcodeOptions: {
      symbology: 'CODE128',
      height: 50,
      displayValue: true
    },
    qrOptions: {
      moduleSize: 4,
      margin: 2
    }
  });

  const elementIcons = {
    text: Type,
    rectangle: Square,
    circle: Circle,
    barcode: BarChart,
    qr: QrCode
  };

  const getPreviewValue = () => {
    if (config.dataMode === 'static') {
      return config.staticValue || 'Sample Text';
    }
    
    if (config.dataColumn && dataset?.data?.[0]) {
      const columnIndex = dataset.headers.indexOf(config.dataColumn);
      if (columnIndex !== -1) {
        let value = dataset.data[0][columnIndex]?.toString() || '';
        
        // Apply transforms
        if (config.transform?.prefix) value = config.transform.prefix + value;
        if (config.transform?.suffix) value = value + config.transform.suffix;
        if (config.transform?.uppercase) value = value.toUpperCase();
        if (config.transform?.truncate && value.length > config.transform.truncate) {
          value = value.substring(0, config.transform.truncate) + '...';
        }
        
        return value;
      }
    }
    
    return 'No data';
  };

  const handleAdd = () => {
    if (config.dataMode === 'column' && !config.dataColumn) {
      return; // Require column selection
    }
    if (config.dataMode === 'static' && !config.staticValue?.trim()) {
      return; // Require static value
    }
    
    onAddElement(config);
    onOpenChange(false);
    
    // Reset config for next use
    setConfig({
      type: elementType || 'text',
      dataMode: datasetId ? 'column' : 'static',
      staticValue: '',
      style: {
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#000000',
        fontWeight: 'normal'
      },
      barcodeOptions: {
        symbology: 'CODE128',
        height: 50,
        displayValue: true
      },
      qrOptions: {
        moduleSize: 4,
        margin: 2
      }
    });
  };

  if (!elementType) return null;

  const Icon = elementIcons[elementType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            Add {elementType.charAt(0).toUpperCase() + elementType.slice(1)} Element
          </DialogTitle>
          <DialogDescription>
            Configure your element properties and data mapping
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-6">
          {/* Configuration Panel */}
          <div className="col-span-8">
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="data" className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data
                </TabsTrigger>
                <TabsTrigger value="style" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Style
                </TabsTrigger>
                <TabsTrigger 
                  value="advanced" 
                  className="flex items-center gap-2"
                  disabled={!['barcode', 'qr'].includes(elementType)}
                >
                  <Hash className="w-4 h-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Data Source</CardTitle>
                    <CardDescription>
                      Choose how this element gets its content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={config.dataMode === 'static' ? 'default' : 'outline'}
                        onClick={() => setConfig(prev => ({ ...prev, dataMode: 'static' }))}
                        className="h-20 flex flex-col gap-2"
                      >
                        <AlignLeft className="w-6 h-6" />
                        <span>Static Text</span>
                      </Button>
                      <Button
                        variant={config.dataMode === 'column' ? 'default' : 'outline'}
                        onClick={() => setConfig(prev => ({ ...prev, dataMode: 'column' }))}
                        disabled={!dataset}
                        className="h-20 flex flex-col gap-2"
                      >
                        <Database className="w-6 h-6" />
                        <span>From Data</span>
                      </Button>
                    </div>

                    {config.dataMode === 'static' && (
                      <div>
                        <Label htmlFor="static-value">Static Value</Label>
                        <Input
                          id="static-value"
                          value={config.staticValue || ''}
                          onChange={(e) => setConfig(prev => ({ 
                            ...prev, 
                            staticValue: e.target.value 
                          }))}
                          placeholder="Enter your text..."
                        />
                      </div>
                    )}

                    {config.dataMode === 'column' && dataset && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="data-column">Data Column</Label>
                          <Select
                            value={config.dataColumn || ''}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              dataColumn: value
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              {dataset.headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{header}</span>
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {dataset.data[0]?.[dataset.headers.indexOf(header)]?.toString().substring(0, 10) || 'N/A'}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Data Transforms */}
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <Label className="text-sm font-medium">Data Transforms</Label>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <Label htmlFor="prefix" className="text-xs">Prefix</Label>
                              <Input
                                id="prefix"
                                value={config.transform?.prefix || ''}
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  transform: { ...prev.transform, prefix: e.target.value }
                                }))}
                                placeholder="SKU-"
                              />
                            </div>
                            <div>
                              <Label htmlFor="suffix" className="text-xs">Suffix</Label>
                              <Input
                                id="suffix"
                                value={config.transform?.suffix || ''}
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  transform: { ...prev.transform, suffix: e.target.value }
                                }))}
                                placeholder="-001"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={config.transform?.uppercase || false}
                                onCheckedChange={(checked) => setConfig(prev => ({
                                  ...prev,
                                  transform: { ...prev.transform, uppercase: checked }
                                }))}
                              />
                              <Label className="text-xs">Uppercase</Label>
                            </div>
                            <div>
                              <Label htmlFor="truncate" className="text-xs">Max Length</Label>
                              <Input
                                id="truncate"
                                type="number"
                                value={config.transform?.truncate || ''}
                                onChange={(e) => setConfig(prev => ({
                                  ...prev,
                                  transform: { 
                                    ...prev.transform, 
                                    truncate: e.target.value ? parseInt(e.target.value) : undefined 
                                  }
                                }))}
                                placeholder="20"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="style" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Appearance</CardTitle>
                    <CardDescription>
                      Customize the visual properties
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {elementType === 'text' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="font-family">Font Family</Label>
                            <Select
                              value={config.style?.fontFamily || 'Arial'}
                              onValueChange={(value) => setConfig(prev => ({
                                ...prev,
                                style: { ...prev.style, fontFamily: value }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Arial">Arial</SelectItem>
                                <SelectItem value="Helvetica">Helvetica</SelectItem>
                                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                <SelectItem value="Courier">Courier</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="font-weight">Font Weight</Label>
                            <Select
                              value={config.style?.fontWeight || 'normal'}
                              onValueChange={(value) => setConfig(prev => ({
                                ...prev,
                                style: { ...prev.style, fontWeight: value }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="font-size">Font Size: {config.style?.fontSize || 14}px</Label>
                          <Slider
                            value={[config.style?.fontSize || 14]}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              style: { ...prev.style, fontSize: value[0] }
                            }))}
                            max={72}
                            min={8}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="color">Color</Label>
                          <Input
                            id="color"
                            type="color"
                            value={config.style?.color || '#000000'}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              style: { ...prev.style, color: e.target.value }
                            }))}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {elementType === 'barcode' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Barcode Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="symbology">Symbology</Label>
                        <Select
                          value={config.barcodeOptions?.symbology || 'CODE128'}
                          onValueChange={(value: 'CODE128' | 'EAN13') => setConfig(prev => ({
                            ...prev,
                            barcodeOptions: { ...prev.barcodeOptions!, symbology: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CODE128">CODE128</SelectItem>
                            <SelectItem value="EAN13">EAN-13</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="barcode-height">Height: {config.barcodeOptions?.height || 50}px</Label>
                        <Slider
                          value={[config.barcodeOptions?.height || 50]}
                          onValueChange={(value) => setConfig(prev => ({
                            ...prev,
                            barcodeOptions: { ...prev.barcodeOptions!, height: value[0] }
                          }))}
                          max={200}
                          min={20}
                          step={5}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={config.barcodeOptions?.displayValue ?? true}
                          onCheckedChange={(checked) => setConfig(prev => ({
                            ...prev,
                            barcodeOptions: { ...prev.barcodeOptions!, displayValue: checked }
                          }))}
                        />
                        <Label>Show value below barcode</Label>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {elementType === 'qr' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">QR Code Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="module-size">Module Size: {config.qrOptions?.moduleSize || 4}px</Label>
                        <Slider
                          value={[config.qrOptions?.moduleSize || 4]}
                          onValueChange={(value) => setConfig(prev => ({
                            ...prev,
                            qrOptions: { ...prev.qrOptions!, moduleSize: value[0] }
                          }))}
                          max={10}
                          min={2}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="margin">Margin: {config.qrOptions?.margin || 2}px</Label>
                        <Slider
                          value={[config.qrOptions?.margin || 2]}
                          onValueChange={(value) => setConfig(prev => ({
                            ...prev,
                            qrOptions: { ...prev.qrOptions!, margin: value[0] }
                          }))}
                          max={10}
                          min={0}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="col-span-4">
            <Card className="sticky top-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
                <CardDescription>
                  Live preview of your element
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 bg-muted/20 min-h-48 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4">
                      <Icon className="w-12 h-12 mx-auto text-muted-foreground" />
                    </div>
                    <div className="font-mono text-sm bg-card p-2 rounded border">
                      {getPreviewValue()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {config.dataMode === 'column' && config.dataColumn 
                        ? `From: ${config.dataColumn}` 
                        : 'Static content'
                      }
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={handleAdd}
                    disabled={
                      (config.dataMode === 'column' && !config.dataColumn) ||
                      (config.dataMode === 'static' && !config.staticValue?.trim())
                    }
                    className="flex-1"
                  >
                    Add Element
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricObject, Textbox, Rect, Circle, Image } from "fabric";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Type, 
  Square, 
  Circle as CircleIcon, 
  QrCode, 
  BarChart3,
  Trash2,
  Copy,
  Download,
  RotateCw,
  Palette
} from "lucide-react";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { useLabelDataset } from "@/hooks/useLabelDataset";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

interface LabelCanvasProps {
  templateId?: string | null;
  datasetId?: string | null;
  onCanvasSizeChange?: (size: { width: number; height: number }) => void;
  onCanvasDataChange?: (data: any) => void;
}

export function LabelCanvas({ templateId, datasetId, onCanvasSizeChange, onCanvasDataChange }: LabelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [templateData, setTemplateData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { dataset } = useLabelDataset(datasetId);
  const { user } = useUserProfile();

  // Label presets
  const labelPresets = [
    { name: "Address Label", width: 378, height: 189, mm: "100 × 50 mm" },
    { name: "Shipping Label", width: 567, height: 378, mm: "150 × 100 mm" },
    { name: "Product Label", width: 283, height: 142, mm: "75 × 37.5 mm" },
    { name: "Name Tag", width: 340, height: 227, mm: "90 × 60 mm" },
    { name: "Custom", width: 0, height: 0, mm: "Custom Size" }
  ];

  const [selectedPreset, setSelectedPreset] = useState("Custom");

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: "#ffffff",
    });

    // Event handlers
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
      setFabricCanvas(null);
    };
  }, []);

  // Load template data
  useEffect(() => {
    if (!templateId || !fabricCanvas) return;

    const loadTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('label_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (error) throw error;

        setTemplateData(data);
        setCanvasSize({ width: data.width, height: data.height });
        
        // Clear existing canvas
        fabricCanvas.clear();
        fabricCanvas.setDimensions({ width: data.width, height: data.height });
        
        // Load canvas data if it exists
        if (data.canvas_data && typeof data.canvas_data === 'object' && Object.keys(data.canvas_data).length > 0) {
          fabricCanvas.loadFromJSON(data.canvas_data as Record<string, any>, () => {
            fabricCanvas.renderAll();
            toast.success(`Template "${data.name}" loaded!`);
          });
        } else {
          fabricCanvas.renderAll();
          toast.success(`Template "${data.name}" ready for editing!`);
        }
        
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error("Failed to load template");
      }
    };

    loadTemplate();
  }, [templateId, fabricCanvas]);

  // Update canvas size
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.setDimensions(canvasSize);
      fabricCanvas.renderAll();
      onCanvasSizeChange?.(canvasSize);
      if (templateId) {
        setHasUnsavedChanges(true);
      }
    }
  }, [canvasSize, fabricCanvas, onCanvasSizeChange, templateId]);

  // Track canvas changes
  useEffect(() => {
    if (!fabricCanvas || !templateId) return;

    const handleCanvasChange = () => {
      setHasUnsavedChanges(true);
      onCanvasDataChange?.(fabricCanvas.toJSON());
    };

    fabricCanvas.on('object:added', handleCanvasChange);
    fabricCanvas.on('object:removed', handleCanvasChange);
    fabricCanvas.on('object:modified', handleCanvasChange);

    return () => {
      fabricCanvas.off('object:added', handleCanvasChange);
      fabricCanvas.off('object:removed', handleCanvasChange);
      fabricCanvas.off('object:modified', handleCanvasChange);
    };
  }, [fabricCanvas, templateId]);

  // Add text element
  const addText = useCallback(() => {
    if (!fabricCanvas) return;

    const text = new Textbox("Sample Text", {
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#000000',
      width: 150,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    toast.success("Text added!");
  }, [fabricCanvas]);

  // Add rectangle
  const addRectangle = useCallback(() => {
    if (!fabricCanvas) return;

    const rect = new Rect({
      left: 100,
      top: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      width: 100,
      height: 60,
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
    toast.success("Rectangle added!");
  }, [fabricCanvas]);

  // Add circle
  const addCircle = useCallback(() => {
    if (!fabricCanvas) return;

    const circle = new Circle({
      left: 150,
      top: 150,
      fill: '#ef4444',
      stroke: '#dc2626',
      strokeWidth: 2,
      radius: 30,
    });

    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
    toast.success("Circle added!");
  }, [fabricCanvas]);

  // Add barcode
  const addBarcode = useCallback(() => {
    if (!fabricCanvas) return;

    const canvas = document.createElement('canvas');
    JsBarcode(canvas, "123456789012", {
      format: "CODE128",
      width: 2,
      height: 50,
      displayValue: true,
    });

    const dataURL = canvas.toDataURL();
    
    Image.fromURL(dataURL).then((img) => {
      img.set({
        left: 50,
        top: 200,
        scaleX: 0.8,
        scaleY: 0.8,
      });
      (img as any).isBarcode = true; // Mark as barcode for data mapping
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      toast.success("Barcode added!");
    });
  }, [fabricCanvas]);

  // Add QR code
  const addQRCode = useCallback(() => {
    if (!fabricCanvas) return;

    QRCode.toDataURL("Sample QR Code", { width: 100 }).then((dataURL) => {
      Image.fromURL(dataURL).then((img) => {
        img.set({
          left: 200,
          top: 200,
        });
        (img as any).isQRCode = true; // Mark as QR code for data mapping
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        toast.success("QR Code added!");
      });
    });
  }, [fabricCanvas]);

  // Delete selected object
  const deleteSelected = useCallback(() => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    setSelectedObject(null);
    toast.success("Element deleted!");
  }, [fabricCanvas, selectedObject]);

  // Copy selected object
  const copySelected = useCallback(() => {
    if (!fabricCanvas || !selectedObject) return;

    selectedObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (selectedObject.left || 0) + 20,
        top: (selectedObject.top || 0) + 20,
      });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      toast.success("Element copied!");
    });
  }, [fabricCanvas, selectedObject]);

  // Save template
  const saveTemplate = useCallback(async () => {
    if (!fabricCanvas || !templateId || !templateData) return;

    try {
      const canvasData = fabricCanvas.toJSON();
      
      const { error } = await supabase
        .from('label_templates')
        .update({
          canvas_data: canvasData,
          width: canvasSize.width,
          height: canvasSize.height,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast.success("Template saved successfully!");
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template");
    }
  }, [fabricCanvas, templateId, templateData, canvasSize]);

  // Export canvas
  const exportImage = useCallback(() => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = templateData?.name ? `${templateData.name}.png` : 'label-design.png';
    link.href = dataURL;
    link.click();
    toast.success("Image exported!");
  }, [fabricCanvas, templateData]);

  // Update object property
  const updateObjectProperty = useCallback((property: string, value: any) => {
    if (!selectedObject) return;

    selectedObject.set(property, value);
    fabricCanvas?.renderAll();
  }, [selectedObject, fabricCanvas]);

  // Check if any objects have data mappings
  const hasDataMappings = useCallback(() => {
    if (!fabricCanvas) return false;
    return fabricCanvas.getObjects().some(obj => (obj as any).dataColumn);
  }, [fabricCanvas]);

  // Clear all data mappings
  const clearAllMappings = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach(obj => {
      (obj as any).dataColumn = undefined;
    });
    fabricCanvas.renderAll();
    toast.success("All data mappings cleared!");
  }, [fabricCanvas]);

  // Preview canvas with first row of data
  const previewWithData = useCallback(() => {
    if (!fabricCanvas || !dataset || dataset.data.length === 0) return;

    const firstRow = dataset.data[0];
    
    fabricCanvas.getObjects().forEach(obj => {
      const dataColumn = (obj as any).dataColumn;
      if (!dataColumn) return;

      const value = firstRow[dataColumn];
      if (!value) return;

      // Update text objects
      if (obj.type === 'textbox') {
        (obj as Textbox).set('text', String(value));
      }
      
      // Update barcode objects  
      if (obj.type === 'image' && (obj as any).isBarcode) {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, String(value), {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
        });
        const dataURL = canvas.toDataURL();
        
        Image.fromURL(dataURL).then((img) => {
          img.set({
            left: obj.left,
            top: obj.top,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
          });
          fabricCanvas.remove(obj);
          fabricCanvas.add(img);
          (img as any).dataColumn = dataColumn;
          (img as any).isBarcode = true;
          fabricCanvas.renderAll();
        });
      }

      // Update QR code objects
      if (obj.type === 'image' && (obj as any).isQRCode) {
        QRCode.toDataURL(String(value), { width: 100 }).then((dataURL) => {
          Image.fromURL(dataURL).then((img) => {
            img.set({
              left: obj.left,
              top: obj.top,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
            });
            fabricCanvas.remove(obj);
            fabricCanvas.add(img);
            (img as any).dataColumn = dataColumn;
            (img as any).isQRCode = true;
            fabricCanvas.renderAll();
          });
        });
      }
    });

    fabricCanvas.renderAll();
    toast.success("Preview updated with first row data!");
  }, [fabricCanvas, dataset]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Toolbar */}
      <div className="col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={addText} className="flex flex-col gap-1 h-auto py-3">
                <Type className="w-4 h-4" />
                <span className="text-xs">Text</span>
              </Button>
              <Button variant="outline" size="sm" onClick={addRectangle} className="flex flex-col gap-1 h-auto py-3">
                <Square className="w-4 h-4" />
                <span className="text-xs">Rectangle</span>
              </Button>
              <Button variant="outline" size="sm" onClick={addCircle} className="flex flex-col gap-1 h-auto py-3">
                <CircleIcon className="w-4 h-4" />
                <span className="text-xs">Circle</span>
              </Button>
              <Button variant="outline" size="sm" onClick={addBarcode} className="flex flex-col gap-1 h-auto py-3">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Barcode</span>
              </Button>
              <Button variant="outline" size="sm" onClick={addQRCode} className="flex flex-col gap-1 h-auto py-3">
                <QrCode className="w-4 h-4" />
                <span className="text-xs">QR Code</span>
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Label Presets</Label>
              <Select
                value={selectedPreset}
                onValueChange={(value) => {
                  setSelectedPreset(value);
                  const preset = labelPresets.find(p => p.name === value);
                  if (preset && preset.name !== "Custom") {
                    setCanvasSize({ width: preset.width, height: preset.height });
                    toast.success(`Applied ${preset.name}`);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {labelPresets.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name} className="text-xs">
                      <div className="flex flex-col">
                        <span>{preset.name}</span>
                        <span className="text-muted-foreground text-xs">{preset.mm}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  value={canvasSize.width}
                  onChange={(e) => {
                    setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) || 400 }));
                    setSelectedPreset("Custom");
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  value={canvasSize.height}
                  onChange={(e) => {
                    setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) || 300 }));
                    setSelectedPreset("Custom");
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <Separator />

            {templateId && (
              <div className="space-y-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={saveTemplate} 
                  disabled={!hasUnsavedChanges}
                  className="w-full"
                >
                  {hasUnsavedChanges ? "Save Template" : "Saved"}
                </Button>
                {hasUnsavedChanges && (
                  <p className="text-xs text-muted-foreground text-center">
                    You have unsaved changes
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={deleteSelected} disabled={!selectedObject}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={copySelected} disabled={!selectedObject}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportImage}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Canvas */}
      <div className="col-span-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Canvas
              {templateData && (
                <span className="ml-2 text-xs text-muted-foreground">
                  - {templateData.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                <canvas ref={canvasRef} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Panel */}
      <div className="col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedObject ? (
              <>
                {/* Common properties */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X Position</Label>
                    <Input
                      type="number"
                      value={selectedObject.left || 0}
                      onChange={(e) => updateObjectProperty('left', parseInt(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y Position</Label>
                    <Input
                      type="number"
                      value={selectedObject.top || 0}
                      onChange={(e) => updateObjectProperty('top', parseInt(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Text properties */}
                {selectedObject.type === 'textbox' && (
                  <>
                    <div>
                      <Label className="text-xs">Text</Label>
                      <Input
                        value={(selectedObject as Textbox).text || ''}
                        onChange={(e) => updateObjectProperty('text', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Font Size</Label>
                      <Input
                        type="number"
                        value={(selectedObject as Textbox).fontSize || 16}
                        onChange={(e) => updateObjectProperty('fontSize', parseInt(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input
                        type="color"
                        value={selectedObject.fill as string || '#000000'}
                        onChange={(e) => updateObjectProperty('fill', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </>
                )}

      {/* Data Mapping */}
                {dataset && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Data Mapping</Label>
                        <div className="text-xs text-muted-foreground">
                          {dataset.data.length} rows
                        </div>
                      </div>

                      {selectedObject ? (
                        <>
                          <div>
                            <Label className="text-xs">Map to Column</Label>
                            <Select 
                              value={(selectedObject as any)?.dataColumn || 'none'} 
                              onValueChange={(value) => updateObjectProperty('dataColumn', value === 'none' ? undefined : value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border border-border z-50">
                                <SelectItem value="none" className="text-xs">
                                  None
                                </SelectItem>
                                {dataset.headers.map((header) => (
                                  <SelectItem key={header} value={header} className="text-xs">
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Show current mapping and preview */}
                          {(selectedObject as any)?.dataColumn && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <div className="font-medium">Mapped to: {(selectedObject as any).dataColumn}</div>
                              {dataset.data.length > 0 && (
                                <div className="mt-1">
                                  <div className="text-muted-foreground">Sample data:</div>
                                  <div className="font-mono truncate">{dataset.data[0][(selectedObject as any).dataColumn] || 'N/A'}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">
                          Select an element to map it to data
                        </div>
                      )}

                      {/* All mappings overview */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium">All Mappings</div>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {fabricCanvas?.getObjects().map((obj, index) => {
                            const dataColumn = (obj as any).dataColumn;
                            if (!dataColumn) return null;
                            
                            return (
                              <div key={index} className="flex items-center justify-between text-xs p-1 bg-muted/50 rounded">
                                <span className="truncate">
                                  {obj.type === 'textbox' ? (obj as Textbox).text : obj.type}
                                </span>
                                <span className="text-muted-foreground text-xs">→ {dataColumn}</span>
                              </div>
                            );
                          })}
                        </div>
                        {!hasDataMappings() && (
                          <div className="text-xs text-muted-foreground italic">
                            No mappings yet
                          </div>
                        )}
                      </div>
                      
                      {/* Data operations */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => previewWithData()}
                          disabled={!hasDataMappings()}
                          className="text-xs"
                        >
                          Preview Data
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => clearAllMappings()}
                          disabled={!hasDataMappings()}
                          className="text-xs"
                        >
                          Clear All
                        </Button>
                      </div>

                      {/* Available columns reference */}
                      <div className="space-y-1">
                        <div className="text-xs font-medium">Available Columns</div>
                        <div className="flex flex-wrap gap-1">
                          {dataset.headers.map((header) => (
                            <span key={header} className="text-xs px-2 py-1 bg-muted rounded">
                              {header}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Select an element to edit properties</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
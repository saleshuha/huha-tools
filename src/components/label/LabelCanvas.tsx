import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricObject, Textbox, Rect, Circle, Image } from "fabric";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Type, 
  Square, 
  Circle as CircleIcon, 
  Image as ImageIcon, 
  QrCode, 
  BarChart3,
  Trash2,
  Copy,
  Save,
  Download,
  Palette,
  Move,
  RotateCw
} from "lucide-react";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

interface LabelCanvasProps {
  templateId?: string | null;
  datasetId?: string | null;
}

interface CanvasElement {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'image' | 'barcode' | 'qrcode';
  properties: any;
}

export function LabelCanvas({ templateId, datasetId }: LabelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [elements, setElements] = useState<CanvasElement[]>([]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: "#ffffff",
      selection: true,
    });

    // Add event listeners
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
    toast.success("Canvas initialized successfully!");

    return () => {
      canvas.dispose();
    };
  }, [canvasSize]);

  // Add text element
  const addText = useCallback(() => {
    if (!fabricCanvas) return;

    const text = new Textbox("Sample Text", {
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000',
      width: 200,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    toast.success("Text element added!");
  }, [fabricCanvas]);

  // Add rectangle
  const addRectangle = useCallback(() => {
    if (!fabricCanvas) return;

    const rect = new Rect({
      left: 50,
      top: 50,
      fill: '#3b82f6',
      width: 100,
      height: 60,
      stroke: '#1e40af',
      strokeWidth: 2,
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    toast.success("Rectangle added!");
  }, [fabricCanvas]);

  // Add circle
  const addCircle = useCallback(() => {
    if (!fabricCanvas) return;

    const circle = new Circle({
      left: 50,
      top: 50,
      fill: '#ef4444',
      radius: 30,
      stroke: '#dc2626',
      strokeWidth: 2,
    });

    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
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
        top: 50,
        scaleX: 0.8,
        scaleY: 0.8,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      toast.success("Barcode added!");
    });
  }, [fabricCanvas]);

  // Add QR code
  const addQRCode = useCallback(() => {
    if (!fabricCanvas) return;

    QRCode.toDataURL("Sample QR Code Data", { width: 100 }).then((dataURL) => {
      Image.fromURL(dataURL).then((img) => {
        img.set({
          left: 50,
          top: 50,
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
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
      toast.success("Element copied!");
    });
  }, [fabricCanvas, selectedObject]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (!fabricCanvas) return;

    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    setSelectedObject(null);
    toast.success("Canvas cleared!");
  }, [fabricCanvas]);

  // Export canvas as image
  const exportImage = useCallback(() => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = 'label-design.png';
    link.href = dataURL;
    link.click();
    toast.success("Image exported successfully!");
  }, [fabricCanvas]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-6">
        {/* Toolbar */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addText}
                  className="flex flex-col gap-1 h-auto py-3 hover-scale"
                >
                  <Type className="w-4 h-4" />
                  <span className="text-xs">Text</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRectangle}
                  className="flex flex-col gap-1 h-auto py-3 hover-scale"
                >
                  <Square className="w-4 h-4" />
                  <span className="text-xs">Rectangle</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCircle}
                  className="flex flex-col gap-1 h-auto py-3 hover-scale"
                >
                  <CircleIcon className="w-4 h-4" />
                  <span className="text-xs">Circle</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBarcode}
                  className="flex flex-col gap-1 h-auto py-3 hover-scale"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs">Barcode</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addQRCode}
                  className="flex flex-col gap-1 h-auto py-3 hover-scale"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="text-xs">QR Code</span>
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-medium">Canvas Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={canvasSize.width}
                      onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) || 400 }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={canvasSize.height}
                      onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) || 300 }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-medium">Actions</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySelected}
                    disabled={!selectedObject}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteSelected}
                    disabled={!selectedObject}
                    className="text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  className="w-full text-xs"
                >
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="col-span-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Design Canvas</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {canvasSize.width} × {canvasSize.height}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportImage}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center">
                <canvas ref={canvasRef} className="border bg-white shadow-sm" />
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
            <CardContent>
              {selectedObject ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium">Object Type</Label>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {selectedObject.type || 'Object'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">X Position</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.left || 0)}
                        onChange={(e) => {
                          selectedObject.set({ left: parseInt(e.target.value) || 0 });
                          fabricCanvas?.renderAll();
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Y Position</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.top || 0)}
                        onChange={(e) => {
                          selectedObject.set({ top: parseInt(e.target.value) || 0 });
                          fabricCanvas?.renderAll();
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {selectedObject.type === 'textbox' && (
                    <>
                      <div>
                        <Label className="text-xs">Text Content</Label>
                        <Input
                          value={(selectedObject as any).text || ''}
                          onChange={(e) => {
                            (selectedObject as any).set({ text: e.target.value });
                            fabricCanvas?.renderAll();
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Font Size</Label>
                        <Input
                          type="number"
                          value={(selectedObject as any).fontSize || 20}
                          onChange={(e) => {
                            (selectedObject as any).set({ fontSize: parseInt(e.target.value) || 20 });
                            fabricCanvas?.renderAll();
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </>
                  )}

                  {(selectedObject.type === 'rect' || selectedObject.type === 'circle') && (
                    <div>
                      <Label className="text-xs">Fill Color</Label>
                      <Input
                        type="color"
                        value={(selectedObject as any).fill || '#000000'}
                        onChange={(e) => {
                          selectedObject.set({ fill: e.target.value });
                          fabricCanvas?.renderAll();
                        }}
                        className="h-8"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-xs py-8">
                  Select an element to edit its properties
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
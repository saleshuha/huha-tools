import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricObject, Textbox, Rect, Circle, Image } from "fabric";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  onCanvasSizeChange?: (size: { width: number; height: number }) => void;
}

interface CanvasElement {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'image' | 'barcode' | 'qrcode';
  properties: any;
}

export function LabelCanvas({ templateId, datasetId, onCanvasSizeChange }: LabelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [elements, setElements] = useState<CanvasElement[]>([]);
  
  // Preset label sizes (width x height in pixels at 96 DPI)
  const labelPresets = [
    { name: "Address Label", width: 378, height: 189, mm: "100 × 50 mm" },
    { name: "Shipping Label", width: 567, height: 378, mm: "150 × 100 mm" },
    { name: "Product Label", width: 283, height: 142, mm: "75 × 37.5 mm" },
    { name: "Name Tag", width: 340, height: 227, mm: "90 × 60 mm" },
    { name: "CD Label", width: 453, height: 453, mm: "120 × 120 mm" },
    { name: "Custom", width: 0, height: 0, mm: "Custom Size" }
  ];

  const [selectedPreset, setSelectedPreset] = useState("Custom");

  // Font families available
  const fontFamilies = [
    "Arial", "Helvetica", "Times New Roman", "Courier New", 
    "Georgia", "Verdana", "Tahoma", "Trebuchet MS", "Impact"
  ];

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      stateful: true,
    });

    // Add event listeners
    canvas.on('selection:created', (e) => {
      console.log('Object selected:', e.selected?.[0]);
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      console.log('Selection updated:', e.selected?.[0]);
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      console.log('Selection cleared');
      setSelectedObject(null);
    });

    canvas.on('object:added', (e) => {
      console.log('Object added:', e.target);
      canvas.renderAll();
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
      stroke: '#cccccc',
      strokeWidth: 1,
      cornerStyle: 'circle',
      cornerColor: '#2563eb',
      cornerSize: 8,
      transparentCorners: false,
      borderColor: '#2563eb',
      borderScaleFactor: 2,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      selectable: true,
      moveable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
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
      cornerStyle: 'circle',
      cornerColor: '#2563eb',
      cornerSize: 8,
      transparentCorners: false,
      borderColor: '#2563eb',
      borderScaleFactor: 2,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      selectable: true,
      moveable: true,
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
      left: 50,
      top: 50,
      fill: '#ef4444',
      radius: 30,
      stroke: '#dc2626',
      strokeWidth: 2,
      cornerStyle: 'circle',
      cornerColor: '#2563eb',
      cornerSize: 8,
      transparentCorners: false,
      borderColor: '#2563eb',
      borderScaleFactor: 2,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      selectable: true,
      moveable: true,
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
        top: 50,
        scaleX: 0.8,
        scaleY: 0.8,
        cornerStyle: 'circle',
        cornerColor: '#2563eb',
        cornerSize: 8,
        transparentCorners: false,
        borderColor: '#2563eb',
        borderScaleFactor: 2,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        selectable: true,
        moveable: true,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
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
          cornerStyle: 'circle',
          cornerColor: '#2563eb',
          cornerSize: 8,
          transparentCorners: false,
          borderColor: '#2563eb',
          borderScaleFactor: 2,
          hasControls: true,
          hasBorders: true,
          lockMovementX: false,
          lockMovementY: false,
          selectable: true,
          moveable: true,
        });
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
                <Label className="text-xs font-medium">Label Presets</Label>
                <Select
                  value={selectedPreset}
                  onValueChange={(value) => {
                    setSelectedPreset(value);
                    const preset = labelPresets.find(p => p.name === value);
                    if (preset && preset.name !== "Custom") {
                      const newSize = { width: preset.width, height: preset.height };
                      setCanvasSize(newSize);
                      onCanvasSizeChange?.(newSize);
                      toast.success(`Applied ${preset.name} (${preset.mm})`);
                    } else if (preset && preset.name === "Custom") {
                      toast.info("Custom size selected. Use the width/height inputs below to set your dimensions.");
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

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-medium">Canvas Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                     <Input
                       type="number"
                       value={canvasSize.width}
                       onChange={(e) => {
                         const newSize = { ...canvasSize, width: parseInt(e.target.value) || 400 };
                         setCanvasSize(newSize);
                         setSelectedPreset("Custom");
                         onCanvasSizeChange?.(newSize);
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
                         const newSize = { ...canvasSize, height: parseInt(e.target.value) || 300 };
                         setCanvasSize(newSize);
                         setSelectedPreset("Custom");
                         onCanvasSizeChange?.(newSize);
                       }}
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
                <CardTitle className="text-sm flex items-center gap-2">
                  Design Canvas
                  <Badge variant="secondary" className="text-xs font-mono">
                    {canvasSize.width} × {canvasSize.height} px
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Label Size: {(canvasSize.width * 0.264583).toFixed(1)} × {(canvasSize.height * 0.264583).toFixed(1)} mm
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
              <div className="border rounded-lg p-6 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                {/* Canvas Container with proper positioning */}
                <div className="relative bg-white rounded shadow-lg" style={{ 
                  width: canvasSize.width + 32, 
                  height: canvasSize.height + 32 
                }}>
                  {/* Grid Background - positioned behind canvas */}
                  <div 
                    className="absolute inset-4 rounded"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(200,200,200,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(200,200,200,0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 0',
                      width: canvasSize.width,
                      height: canvasSize.height
                    }}
                  />
                  
                  {/* Top Ruler */}
                  <div className="absolute top-0 left-4 h-4 bg-gray-100 border-b border-gray-300 flex items-end text-xs text-gray-600" style={{ width: canvasSize.width }}>
                    {Array.from({ length: Math.ceil(canvasSize.width / 50) + 1 }, (_, i) => (
                      <div key={i} className="absolute flex flex-col items-center" style={{ left: `${i * 50}px` }}>
                        <div className="w-px h-2 bg-gray-400"></div>
                        <span className="text-xs">{i * 50}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Left Ruler */}
                  <div className="absolute left-0 top-4 w-4 bg-gray-100 border-r border-gray-300 flex flex-col text-xs text-gray-600" style={{ height: canvasSize.height }}>
                    {Array.from({ length: Math.ceil(canvasSize.height / 50) + 1 }, (_, i) => (
                      <div key={i} className="absolute flex items-center justify-center" style={{ top: `${i * 50}px`, width: '16px', height: '20px' }}>
                        <div className="h-px w-2 bg-gray-400 mr-1"></div>
                        <span className="text-xs transform -rotate-90 whitespace-nowrap">{i * 50}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Canvas - positioned with clear z-index */}
                  <canvas 
                    ref={canvasRef} 
                    className="absolute top-4 left-4 border border-gray-300 bg-white"
                    style={{
                      zIndex: 10,
                      width: canvasSize.width,
                      height: canvasSize.height
                    }}
                  />
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
                      
                      <div className="grid grid-cols-2 gap-2">
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
                        <div>
                          <Label className="text-xs">Text Color</Label>
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
                      </div>

                      <div>
                        <Label className="text-xs">Font Family</Label>
                        <Select
                          value={(selectedObject as any).fontFamily || 'Arial'}
                          onValueChange={(value) => {
                            (selectedObject as any).set({ fontFamily: value });
                            fabricCanvas?.renderAll();
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fontFamilies.map((font) => (
                              <SelectItem key={font} value={font} className="text-xs">
                                <span style={{ fontFamily: font }}>{font}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Font Weight</Label>
                          <Select
                            value={(selectedObject as any).fontWeight || 'normal'}
                            onValueChange={(value) => {
                              (selectedObject as any).set({ fontWeight: value });
                              fabricCanvas?.renderAll();
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                              <SelectItem value="bold" className="text-xs">Bold</SelectItem>
                              <SelectItem value="lighter" className="text-xs">Light</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Text Align</Label>
                          <Select
                            value={(selectedObject as any).textAlign || 'left'}
                            onValueChange={(value) => {
                              (selectedObject as any).set({ textAlign: value });
                              fabricCanvas?.renderAll();
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left" className="text-xs">Left</SelectItem>
                              <SelectItem value="center" className="text-xs">Center</SelectItem>
                              <SelectItem value="right" className="text-xs">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const isItalic = (selectedObject as any).fontStyle === 'italic';
                            (selectedObject as any).set({ fontStyle: isItalic ? 'normal' : 'italic' });
                            fabricCanvas?.renderAll();
                          }}
                          className={`text-xs italic ${(selectedObject as any).fontStyle === 'italic' ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                          I
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const isUnderline = (selectedObject as any).underline;
                            (selectedObject as any).set({ underline: !isUnderline });
                            fabricCanvas?.renderAll();
                          }}
                          className={`text-xs underline ${(selectedObject as any).underline ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                          U
                        </Button>
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

                   {/* Bulk Data Mapping */}
                   <Separator />
                   <div className="space-y-2">
                     <Label className="text-xs font-medium">Bulk Data Mapping</Label>
                     <div className="text-xs text-muted-foreground mb-2">
                       Map this element to bulk data fields
                     </div>
                     
                     {selectedObject.type === 'textbox' && (
                       <div>
                         <Label className="text-xs">Data Field</Label>
                         <Select
                           value={(selectedObject as any).dataField || ''}
                           onValueChange={(value) => {
                             (selectedObject as any).set({ dataField: value });
                             fabricCanvas?.renderAll();
                             toast.success(`Mapped to field: ${value}`);
                           }}
                         >
                           <SelectTrigger className="h-8 text-xs">
                             <SelectValue placeholder="Select data field" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="name" className="text-xs">Name</SelectItem>
                             <SelectItem value="company" className="text-xs">Company</SelectItem>
                             <SelectItem value="address" className="text-xs">Address</SelectItem>
                             <SelectItem value="phone" className="text-xs">Phone</SelectItem>
                             <SelectItem value="email" className="text-xs">Email</SelectItem>
                             <SelectItem value="id" className="text-xs">ID/Code</SelectItem>
                             <SelectItem value="price" className="text-xs">Price</SelectItem>
                             <SelectItem value="date" className="text-xs">Date</SelectItem>
                             <SelectItem value="custom1" className="text-xs">Custom Field 1</SelectItem>
                             <SelectItem value="custom2" className="text-xs">Custom Field 2</SelectItem>
                           </SelectContent>
                         </Select>
                         {(selectedObject as any).dataField && (
                           <Badge variant="outline" className="mt-1 text-xs">
                             Mapped: {(selectedObject as any).dataField}
                           </Badge>
                         )}
                       </div>
                     )}

                     {(selectedObject.type === 'image' && (selectedObject as any).src?.includes('data:image')) && (
                       <div>
                         <Label className="text-xs">QR/Barcode Data Field</Label>
                         <Select
                           value={(selectedObject as any).dataField || ''}
                           onValueChange={(value) => {
                             (selectedObject as any).set({ dataField: value });
                             fabricCanvas?.renderAll();
                             toast.success(`QR/Barcode mapped to field: ${value}`);
                           }}
                         >
                           <SelectTrigger className="h-8 text-xs">
                             <SelectValue placeholder="Select data field" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="id" className="text-xs">ID/Code</SelectItem>
                             <SelectItem value="url" className="text-xs">URL</SelectItem>
                             <SelectItem value="serial" className="text-xs">Serial Number</SelectItem>
                             <SelectItem value="barcode" className="text-xs">Barcode</SelectItem>
                             <SelectItem value="custom1" className="text-xs">Custom Field 1</SelectItem>
                             <SelectItem value="custom2" className="text-xs">Custom Field 2</SelectItem>
                           </SelectContent>
                         </Select>
                         {(selectedObject as any).dataField && (
                           <Badge variant="outline" className="mt-1 text-xs">
                             Mapped: {(selectedObject as any).dataField}
                           </Badge>
                         )}
                       </div>
                     )}
                     
                     <div className="text-xs text-muted-foreground">
                       💡 Mapped elements will be automatically populated when using bulk data in the Print tab
                     </div>
                   </div>
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
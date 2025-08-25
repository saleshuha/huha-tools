import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Type, 
  Image, 
  QrCode, 
  BarChart3, 
  Palette,
  Move,
  RotateCw,
  Copy,
  Trash2,
  Save,
  Eye,
  Download,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Plus,
  Grid,
  Ruler,
  ZoomIn,
  ZoomOut,
  MousePointer
} from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { ExcelData } from "@/types/excel";
import QRCode from "qrcode";

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'qr' | 'barcode';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    rotation?: number;
    alignment?: 'left' | 'center' | 'right';
  };
  dataBinding?: string;
}

interface LabelTemplate {
  id: string;
  name: string;
  size: { width: number; height: number };
  elements: CanvasElement[];
  backgroundColor: string;
}

export const LabelDesigner = () => {
  const [uploadedData, setUploadedData] = useState<ExcelData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState("50x30");
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<LabelTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const labelSizes = [
    { value: "50x30", label: "50mm × 30mm", width: 200, height: 120 },
    { value: "100x50", label: "100mm × 50mm", width: 320, height: 160 },
    { value: "75x40", label: "75mm × 40mm", width: 240, height: 128 },
    { value: "custom", label: "Custom Size", width: 280, height: 140 },
  ];

  const designTools = [
    { id: "text", icon: Type, label: "Text Field", color: "from-blue-500 to-blue-600" },
    { id: "image", icon: Image, label: "Image", color: "from-emerald-500 to-emerald-600" },
    { id: "qr", icon: QrCode, label: "QR Code", color: "from-purple-500 to-purple-600" },
    { id: "barcode", icon: BarChart3, label: "Barcode", color: "from-orange-500 to-orange-600" },
  ];

  const currentSize = labelSizes.find(size => size.value === labelSize) || labelSizes[0];

  const handleFileUpload = (data: ExcelData) => {
    setUploadedData(data);
    setSelectedColumns([]);
  };

  const generateQRCode = async (text: string): Promise<string> => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(text, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const addElement = useCallback(async (type: string) => {
    const newElement: CanvasElement = {
      id: `element-${Date.now()}`,
      type: type as any,
      x: 20,
      y: 20,
      width: type === 'text' ? 120 : 80,
      height: type === 'text' ? 30 : 80,
      content: type === 'text' ? 'Sample Text' : 
               type === 'qr' ? 'https://example.com' :
               type === 'barcode' ? '1234567890' : '',
      style: {
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#000000',
        backgroundColor: 'transparent',
        alignment: 'left'
      }
    };

    setCanvasElements(prev => [...prev, newElement]);
    setActiveElement(newElement.id);
  }, []);

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setCanvasElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id: string) => {
    setCanvasElements(prev => prev.filter(el => el.id !== id));
    if (activeElement === id) {
      setActiveElement(null);
    }
  };

  const duplicateElement = (id: string) => {
    const element = canvasElements.find(el => el.id === id);
    if (element) {
      const newElement = {
        ...element,
        id: `element-${Date.now()}`,
        x: element.x + 10,
        y: element.y + 10
      };
      setCanvasElements(prev => [...prev, newElement]);
      setActiveElement(newElement.id);
    }
  };

  const saveTemplate = () => {
    const template: LabelTemplate = {
      id: `template-${Date.now()}`,
      name: `Template ${savedTemplates.length + 1}`,
      size: { width: currentSize.width, height: currentSize.height },
      elements: canvasElements,
      backgroundColor: '#ffffff'
    };
    setSavedTemplates(prev => [...prev, template]);
    setCurrentTemplate(template);
  };

  const loadTemplate = (template: LabelTemplate) => {
    setCanvasElements(template.elements);
    setCurrentTemplate(template);
    setActiveElement(null);
  };

  const exportToPDF = async () => {
    // PDF export functionality would be implemented here
    console.log('Exporting to PDF...');
  };

  const previewLabels = async () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const activeElementData = canvasElements.find(el => el.id === activeElement);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Toolbar */}
      <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={showRuler ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRuler(!showRuler)}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </div>
              
              <Separator orientation="vertical" className="h-6" />
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">{zoomLevel}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={previewLabels}>
                <Eye className="h-4 w-4 mr-2" />
                {isPreviewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button variant="outline" size="sm" onClick={saveTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - Data & Tools */}
        <div className="lg:col-span-1 space-y-6">
          {/* Data Upload */}
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary" />
                Data Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFileUpload={handleFileUpload}
                title="Upload CSV/Excel"
                description="Drop your data here"
                accept=".csv,.xlsx,.xls"
              />
              
              {uploadedData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3"
                >
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {uploadedData.data.length} rows loaded
                  </Badge>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Available Columns:</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadedData.headers.map((header, index) => (
                        <motion.div 
                          key={index} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={`col-${index}`}
                            checked={selectedColumns.includes(header)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedColumns([...selectedColumns, header]);
                              } else {
                                setSelectedColumns(selectedColumns.filter(col => col !== header));
                              }
                            }}
                            className="rounded border-border"
                          />
                          <label htmlFor={`col-${index}`} className="text-sm cursor-pointer">
                            {header}
                          </label>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Design Tools */}
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-accent" />
                Design Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {designTools.map((tool) => (
                  <motion.div
                    key={tool.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-14 flex items-center justify-start gap-3 hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-900"
                      onClick={() => addElement(tool.id)}
                    >
                      <div className={`w-8 h-8 bg-gradient-to-r ${tool.color} rounded-lg flex items-center justify-center`}>
                        <tool.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{tool.label}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Label Size */}
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Label Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {labelSizes.map((size) => (
                  <Button
                    key={size.value}
                    variant={labelSize === size.value ? "default" : "outline"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => setLabelSize(size.value)}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="border-2 border-dashed border-current flex-shrink-0" 
                        style={{ 
                          width: Math.min(size.width / 8, 40), 
                          height: Math.min(size.height / 8, 25) 
                        }} 
                      />
                      <span>{size.label}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Saved Templates */}
          {savedTemplates.length > 0 && (
            <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Saved Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant={currentTemplate?.id === template.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => loadTemplate(template)}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      {template.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center Panel - Canvas */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Design Canvas
                  {currentTemplate && (
                    <Badge variant="secondary">{currentTemplate.name}</Badge>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {canvasElements.length} elements
                  </Badge>
                  <Badge variant="outline">
                    {labelSize.replace("x", " × ")}mm
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-8 min-h-96 flex items-center justify-center relative overflow-hidden">
                {/* Ruler */}
                {showRuler && (
                  <>
                    <div className="absolute top-0 left-8 right-8 h-6 bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600 flex items-end text-xs text-slate-500">
                      {Array.from({ length: Math.floor(currentSize.width / 20) }, (_, i) => (
                        <div key={i} className="w-5 border-r border-slate-300 dark:border-slate-600 h-3 flex items-end justify-center">
                          {i % 5 === 0 && <span className="text-[10px]">{i * 2}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-8 bottom-8 left-0 w-6 bg-white dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 flex flex-col items-end text-xs text-slate-500">
                      {Array.from({ length: Math.floor(currentSize.height / 20) }, (_, i) => (
                        <div key={i} className="h-5 border-b border-slate-300 dark:border-slate-600 w-3 flex items-center justify-center">
                          {i % 3 === 0 && <span className="text-[10px] -rotate-90">{i * 2}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Canvas */}
                <div 
                  ref={canvasRef}
                  className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg relative overflow-hidden"
                  style={{
                    width: `${currentSize.width * (zoomLevel / 100)}px`,
                    height: `${currentSize.height * (zoomLevel / 100)}px`,
                    backgroundImage: showGrid ? 
                      `radial-gradient(circle, #e2e8f0 1px, transparent 1px)` : 'none',
                    backgroundSize: showGrid ? '20px 20px' : 'auto',
                  }}
                >
                  {/* Canvas Elements */}
                  <AnimatePresence>
                    {canvasElements.map((element) => (
                      <motion.div
                        key={element.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`absolute cursor-pointer border-2 transition-all duration-200 ${
                          activeElement === element.id 
                            ? 'border-primary border-dashed shadow-lg' 
                            : 'border-transparent hover:border-slate-400'
                        }`}
                        style={{
                          left: `${element.x * (zoomLevel / 100)}px`,
                          top: `${element.y * (zoomLevel / 100)}px`,
                          width: `${element.width * (zoomLevel / 100)}px`,
                          height: `${element.height * (zoomLevel / 100)}px`,
                          transform: `rotate(${element.style.rotation || 0}deg)`,
                        }}
                        onClick={() => setActiveElement(element.id)}
                      >
                        {element.type === 'text' && (
                          <div
                            className="w-full h-full flex items-center p-1"
                            style={{
                              fontSize: `${(element.style.fontSize || 14) * (zoomLevel / 100)}px`,
                              fontFamily: element.style.fontFamily,
                              fontWeight: element.style.fontWeight,
                              fontStyle: element.style.fontStyle,
                              textDecoration: element.style.textDecoration,
                              color: element.style.color,
                              backgroundColor: element.style.backgroundColor,
                              textAlign: element.style.alignment,
                              borderRadius: `${element.style.borderRadius || 0}px`,
                            }}
                          >
                            {element.content}
                          </div>
                        )}
                        
                        {element.type === 'qr' && (
                          <div className="w-full h-full flex items-center justify-center bg-white">
                            <div className="text-xs text-center text-slate-600">
                              QR: {element.content.substring(0, 10)}...
                            </div>
                          </div>
                        )}
                        
                        {element.type === 'barcode' && (
                          <div className="w-full h-full flex items-center justify-center bg-white">
                            <div className="flex flex-col items-center">
                              <div className="flex space-x-px">
                                {Array.from({ length: 12 }, (_, i) => (
                                  <div 
                                    key={i} 
                                    className="bg-black" 
                                    style={{ 
                                      width: `${1 + (i % 3)}px`, 
                                      height: `${20 * (zoomLevel / 100)}px` 
                                    }} 
                                  />
                                ))}
                              </div>
                              <div className="text-xs mt-1">{element.content}</div>
                            </div>
                          </div>
                        )}
                        
                        {element.type === 'image' && (
                          <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center rounded">
                            <Image className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Canvas empty state */}
                  {canvasElements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      <div className="text-center">
                        <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Drop elements here to design your label</p>
                        <p className="text-xs mt-1">Use the tools on the left to get started</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Canvas Controls */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={!activeElement}>
                    <Move className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={!activeElement}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!activeElement}
                    onClick={() => activeElement && duplicateElement(activeElement)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!activeElement}
                    onClick={() => activeElement && deleteElement(activeElement)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Canvas: {currentSize.width} × {currentSize.height}px | Zoom: {zoomLevel}%
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Properties */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Element Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeElementData ? (
                <div className="text-center text-slate-400 py-8">
                  <MousePointer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select an element to edit properties</p>
                  <p className="text-xs mt-1">Click on any element in the canvas</p>
                </div>
              ) : (
                <Tabs defaultValue="style" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="style">Style</TabsTrigger>
                    <TabsTrigger value="data">Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="style" className="space-y-4 mt-4">
                    {activeElementData.type === 'text' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="content">Text Content</Label>
                          <Input 
                            id="content" 
                            value={activeElementData.content}
                            onChange={(e) => updateElement(activeElementData.id, { content: e.target.value })}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="font-size">Font Size</Label>
                            <Input 
                              id="font-size" 
                              type="number" 
                              value={activeElementData.style.fontSize || 14}
                              onChange={(e) => updateElement(activeElementData.id, { 
                                style: { ...activeElementData.style, fontSize: Number(e.target.value) }
                              })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="font-color">Color</Label>
                            <Input 
                              id="font-color" 
                              type="color" 
                              value={activeElementData.style.color || '#000000'}
                              onChange={(e) => updateElement(activeElementData.id, { 
                                style: { ...activeElementData.style, color: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Font Style</Label>
                          <div className="flex gap-1">
                            <Button
                              variant={activeElementData.style.fontWeight === 'bold' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(activeElementData.id, { 
                                style: { 
                                  ...activeElementData.style, 
                                  fontWeight: activeElementData.style.fontWeight === 'bold' ? 'normal' : 'bold'
                                }
                              })}
                            >
                              <Bold className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={activeElementData.style.fontStyle === 'italic' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(activeElementData.id, { 
                                style: { 
                                  ...activeElementData.style, 
                                  fontStyle: activeElementData.style.fontStyle === 'italic' ? 'normal' : 'italic'
                                }
                              })}
                            >
                              <Italic className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={activeElementData.style.textDecoration === 'underline' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(activeElementData.id, { 
                                style: { 
                                  ...activeElementData.style, 
                                  textDecoration: activeElementData.style.textDecoration === 'underline' ? 'none' : 'underline'
                                }
                              })}
                            >
                              <Underline className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Text Alignment</Label>
                          <div className="flex gap-1">
                            <Button
                              variant={activeElementData.style.alignment === 'left' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(activeElementData.id, { 
                                style: { ...activeElementData.style, alignment: 'left' }
                              })}
                            >
                              <AlignLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={activeElementData.style.alignment === 'center' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(activeElementData.id, { 
                                style: { ...activeElementData.style, alignment: 'center' }
                              })}
                            >
                              <AlignCenter className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={activeElementData.style.alignment === 'right' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(activeElementData.id, { 
                                style: { ...activeElementData.style, alignment: 'right' }
                              })}
                            >
                              <AlignRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {(activeElementData.type === 'qr' || activeElementData.type === 'barcode') && (
                      <div className="space-y-2">
                        <Label htmlFor="code-content">
                          {activeElementData.type === 'qr' ? 'QR Code Data' : 'Barcode Data'}
                        </Label>
                        <Input 
                          id="code-content" 
                          value={activeElementData.content}
                          onChange={(e) => updateElement(activeElementData.id, { content: e.target.value })}
                          placeholder={activeElementData.type === 'qr' ? 'https://example.com' : '1234567890'}
                        />
                      </div>
                    )}

                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="width">Width</Label>
                        <Input 
                          id="width" 
                          type="number" 
                          value={activeElementData.width}
                          onChange={(e) => updateElement(activeElementData.id, { width: Number(e.target.value) })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input 
                          id="height" 
                          type="number" 
                          value={activeElementData.height}
                          onChange={(e) => updateElement(activeElementData.id, { height: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="x-pos">X Position</Label>
                        <Input 
                          id="x-pos" 
                          type="number" 
                          value={activeElementData.x}
                          onChange={(e) => updateElement(activeElementData.id, { x: Number(e.target.value) })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="y-pos">Y Position</Label>
                        <Input 
                          id="y-pos" 
                          type="number" 
                          value={activeElementData.y}
                          onChange={(e) => updateElement(activeElementData.id, { y: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="data" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="data-source">Data Source</Label>
                      <Select
                        value={activeElementData.dataBinding || 'static'}
                        onValueChange={(value) => updateElement(activeElementData.id, { 
                          dataBinding: value === 'static' ? undefined : value 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="static">Static Text</SelectItem>
                          {selectedColumns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="format">Format Template</Label>
                      <Input 
                        id="format" 
                        placeholder="e.g. Product: ${value}"
                        value={activeElementData.content}
                        onChange={(e) => updateElement(activeElementData.id, { content: e.target.value })}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full bg-gradient-primary hover:shadow-lg transition-all duration-300"
                onClick={saveTemplate}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              
              <Button variant="outline" className="w-full" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              
              <Button variant="outline" className="w-full" onClick={previewLabels}>
                <Eye className="h-4 w-4 mr-2" />
                Preview Labels
              </Button>
              
              <Separator />
              
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setCanvasElements([]);
                  setActiveElement(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Canvas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
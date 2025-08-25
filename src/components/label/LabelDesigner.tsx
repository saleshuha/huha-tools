import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Download
} from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { ExcelData } from "@/types/excel";

export const LabelDesigner = () => {
  const [uploadedData, setUploadedData] = useState<ExcelData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState("50x30");
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (data: ExcelData) => {
    setUploadedData(data);
    setSelectedColumns([]);
  };

  const labelSizes = [
    { value: "50x30", label: "50mm × 30mm", class: "w-20 h-12" },
    { value: "100x50", label: "100mm × 50mm", class: "w-32 h-20" },
    { value: "75x40", label: "75mm × 40mm", class: "w-24 h-16" },
    { value: "custom", label: "Custom Size", class: "w-28 h-18" },
  ];

  const designTools = [
    { id: "text", icon: Type, label: "Text Field", color: "text-primary" },
    { id: "image", icon: Image, label: "Image", color: "text-accent" },
    { id: "qr", icon: QrCode, label: "QR Code", color: "text-emerald" },
    { id: "barcode", icon: BarChart3, label: "Barcode", color: "text-sky" },
  ];

  const addElement = (type: string) => {
    // Add element to canvas logic would go here
    console.log("Adding element:", type);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Data & Tools */}
        <div className="lg:col-span-1 space-y-6">
          {/* Data Upload */}
          <Card className="glass-container">
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
                description="Drop your product data here"
                accept=".csv,.xlsx,.xls"
              />
              
              {uploadedData && (
                <div className="space-y-3">
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    {uploadedData.data.length} rows loaded
                  </Badge>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Available Columns:</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadedData.headers.map((header, index) => (
                        <div key={index} className="flex items-center space-x-2">
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
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Design Tools */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-accent" />
                Design Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {designTools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant="outline"
                    className="h-16 flex flex-col gap-1 hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
                    onClick={() => addElement(tool.id)}
                  >
                    <tool.icon className={`h-5 w-5 ${tool.color}`} />
                    <span className="text-xs">{tool.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Label Size */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="text-lg">Label Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {labelSizes.map((size) => (
                  <Button
                    key={size.value}
                    variant={labelSize === size.value ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setLabelSize(size.value)}
                  >
                    <div className={`${size.class} border-2 border-dashed border-current mr-3 flex-shrink-0`} />
                    {size.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel - Canvas */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Design Canvas
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Save Template
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/20 rounded-lg p-8 min-h-96 flex items-center justify-center">
                <div 
                  ref={canvasRef}
                  className="bg-card border-2 border-dashed border-border rounded-lg relative"
                  style={{
                    width: labelSize === "50x30" ? "200px" : 
                           labelSize === "100x50" ? "320px" : 
                           labelSize === "75x40" ? "240px" : "280px",
                    height: labelSize === "50x30" ? "120px" : 
                            labelSize === "100x50" ? "160px" : 
                            labelSize === "75x40" ? "128px" : "144px"
                  }}
                >
                  {/* Canvas content will be rendered here */}
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Drop elements here to design your label</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Canvas Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Move className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Zoom: 100% | {labelSize === "custom" ? "Custom" : labelSize.replace("x", " × ")}mm
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Properties */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="text-lg">Element Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeElement ? (
                <div className="text-center text-muted-foreground py-8">
                  <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select an element to edit properties</p>
                </div>
              ) : (
                <Tabs defaultValue="style" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="style">Style</TabsTrigger>
                    <TabsTrigger value="data">Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="style" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="font-size">Font Size</Label>
                      <Input id="font-size" type="number" defaultValue="12" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="font-color">Font Color</Label>
                      <Input id="font-color" type="color" defaultValue="#000000" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="alignment">Alignment</Label>
                      <select className="w-full p-2 border rounded">
                        <option>Left</option>
                        <option>Center</option>
                        <option>Right</option>
                      </select>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="data" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="data-source">Data Source</Label>
                      <select className="w-full p-2 border rounded">
                        <option>Static Text</option>
                        {selectedColumns.map((col, index) => (
                          <option key={index} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="format">Format</Label>
                      <Input id="format" placeholder="e.g. ${value}" />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Template Actions */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="text-lg">Template Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-gradient-primary hover:shadow-medium">
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Template
              </Button>
              
              <Separator />
              
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Canvas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
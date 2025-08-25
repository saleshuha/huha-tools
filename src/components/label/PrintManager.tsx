import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, 
  Download, 
  Settings, 
  Eye,
  FileText,
  Grid,
  Zap,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useLabelDataset } from "@/hooks/useLabelDataset";
import { supabase } from "@/integrations/supabase/client";
import { generateLabelZPL, getLabelSizePresets } from "@/utils/zpl-generator";

interface PrintManagerProps {
  templateId?: string | null;
  datasetId?: string | null;
  canvasData?: any;
}

export function PrintManager({ templateId, datasetId, canvasData }: PrintManagerProps) {
  const [printSettings, setPrintSettings] = useState({
    format: 'pdf',
    paperSize: 'A4',
    orientation: 'portrait',
    quality: 'high',
    copies: 1,
    labelsPerPage: 1,
    includeBackground: true,
    dpi: 203 as 203 | 300
  });

  const [previewMode, setPreviewMode] = useState<'single' | 'bulk'>('single');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  
  const { dataset } = useLabelDataset(datasetId);

  // Load template data
  useEffect(() => {
    if (!templateId) return;
    
    const loadTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('label_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (error) throw error;
        setTemplateData(data);
      } catch (error) {
        console.error('Error loading template:', error);
      }
    };
    
    loadTemplate();
  }, [templateId]);

  const generatePDF = async () => {
    if (!templateId) {
      toast.error("Please select a template first");
      return;
    }

    setIsGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: printSettings.orientation as 'portrait' | 'landscape',
        unit: 'mm',
        format: printSettings.paperSize.toLowerCase()
      });

      // For demonstration, we'll create a simple PDF with placeholder content
      pdf.setFontSize(16);
      pdf.text('Label Design', 20, 20);
      pdf.setFontSize(12);
      pdf.text('Generated from Template', 20, 35);
      pdf.text(`Copies: ${printSettings.copies}`, 20, 50);
      pdf.text(`Quality: ${printSettings.quality}`, 20, 65);

      if (datasetId && previewMode === 'bulk') {
        pdf.text('Bulk printing with dataset', 20, 80);
        // Here you would iterate through dataset records
      }

      pdf.save(`label-${Date.now()}.pdf`);
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateZPL = () => {
    if (!templateData?.canvas_data) {
      toast.error("No template data available");
      return;
    }

    try {
      const canvasObjects = templateData.canvas_data.objects || [];
      
      // Convert canvas objects to ZPL elements
      const elements = canvasObjects.map((obj: any) => ({
        type: obj.type === 'i-text' ? 'text' : obj.type,
        x: obj.left || 0,
        y: obj.top || 0,
        width: obj.width,
        height: obj.height,
        content: obj.text || obj.content || 'Sample',
        fontSize: obj.fontSize,
        barcodeType: obj.barcodeType || 'CODE128',
        showBarcodeText: obj.showBarcodeText !== false
      }));

      const settings = {
        dpi: printSettings.dpi,
        labelWidth: templateData.width || 400,
        labelHeight: templateData.height || 300
      };

      let zplCode = '';
      
      if (previewMode === 'bulk' && dataset?.data?.length) {
        // Generate ZPL for each row in dataset
        dataset.data.forEach((row: any[], index: number) => {
          const populatedElements = elements.map((element: any) => {
            let content = element.content;
            
            // Find mapped data if element has dataColumn
            const canvasObj = canvasObjects.find((obj: any) => 
              obj.left === element.x && obj.top === element.y
            );
            
            if (canvasObj?.dataColumn && dataset.headers) {
              const columnIndex = dataset.headers.indexOf(canvasObj.dataColumn);
              if (columnIndex >= 0 && row[columnIndex] !== undefined) {
                content = String(row[columnIndex]);
                
                // Apply transforms
                if (canvasObj.dataTransform) {
                  const transform = canvasObj.dataTransform;
                  if (transform.prefix) content = transform.prefix + content;
                  if (transform.suffix) content = content + transform.suffix;
                  if (transform.uppercase) content = content.toUpperCase();
                  if (transform.truncate) content = content.substring(0, transform.truncate);
                }
              }
            }
            
            return { ...element, content };
          });
          
          zplCode += generateLabelZPL(populatedElements, settings) + '\n';
        });
      } else {
        // Single label
        zplCode = generateLabelZPL(elements, settings);
      }

      // Download ZPL file
      const blob = new Blob([zplCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `label-${Date.now()}.zpl`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`ZPL file generated successfully! ${previewMode === 'bulk' ? `(${dataset?.data?.length || 0} labels)` : ''}`);
    } catch (error) {
      console.error('Error generating ZPL:', error);
      toast.error("Failed to generate ZPL file");
    }
  };

  const printPreview = () => {
    if (!templateId) {
      toast.error("Please select a template first");
      return;
    }

    // Open print preview in a new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Label Print Preview</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .label { border: 1px solid #ccc; padding: 20px; margin: 10px 0; }
              .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="header">Sample Label</div>
              <p>Template ID: ${templateId}</p>
              <p>Generated: ${new Date().toLocaleString()}</p>
              ${datasetId ? `<p>Dataset ID: ${datasetId}</p>` : ''}
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Print Manager</h2>
          <p className="text-muted-foreground">
            Configure print settings and generate labels for various printers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {templateId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Template Selected
            </Badge>
          )}
          {datasetId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Grid className="w-3 h-3" />
              Dataset Selected
            </Badge>
          )}
        </div>
      </div>

      {/* Status Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={templateId ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <CardContent className="p-4 flex items-center gap-3">
            {templateId ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <div>
              <p className="font-medium text-sm">
                {templateId ? "Template Ready" : "No Template Selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {templateId ? "Ready for printing" : "Select a template to continue"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={datasetId ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
          <CardContent className="p-4 flex items-center gap-3">
            {datasetId ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Grid className="w-5 h-5 text-blue-600" />
            )}
            <div>
              <p className="font-medium text-sm">
                {datasetId ? "Dataset Connected" : "Single Print Mode"}
              </p>
              <p className="text-xs text-muted-foreground">
                {datasetId ? "Bulk printing available" : "Select dataset for bulk printing"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Print Settings */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Print Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="format">Output Format</Label>
                <Select 
                  value={printSettings.format} 
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="zpl">ZPL (Zebra)</SelectItem>
                    <SelectItem value="direct">Direct Print</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paperSize">Paper Size</Label>
                <Select 
                  value={printSettings.paperSize} 
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, paperSize: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                    <SelectItem value="4x6">4" × 6" Label</SelectItem>
                    <SelectItem value="2x1">2" × 1" Label</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="orientation">Orientation</Label>
                <Select 
                  value={printSettings.orientation} 
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, orientation: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quality">Print Quality</Label>
                <Select 
                  value={printSettings.quality} 
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, quality: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (Fast)</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dpi">Printer DPI</Label>
                <Select 
                  value={printSettings.dpi.toString()} 
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, dpi: parseInt(value) as 203 | 300 }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="203">203 DPI (Standard)</SelectItem>
                    <SelectItem value="300">300 DPI (High Res)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="1000"
                  value={printSettings.copies}
                  onChange={(e) => setPrintSettings(prev => ({ 
                    ...prev, 
                    copies: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>

              {datasetId && (
                <div>
                  <Label htmlFor="labelsPerPage">Labels per Page</Label>
                  <Select 
                    value={printSettings.labelsPerPage.toString()} 
                    onValueChange={(value) => setPrintSettings(prev => ({ 
                      ...prev, 
                      labelsPerPage: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 per page</SelectItem>
                      <SelectItem value="2">2 per page</SelectItem>
                      <SelectItem value="4">4 per page</SelectItem>
                      <SelectItem value="6">6 per page</SelectItem>
                      <SelectItem value="8">8 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Print Actions */}
        <div className="col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Print Actions
              </CardTitle>
              <CardDescription>
                Choose your print method based on your printer type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'single' | 'bulk')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">Single Print</TabsTrigger>
                  <TabsTrigger value="bulk" disabled={!datasetId}>
                    Bulk Print
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Print a single label using the selected template
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={generatePDF}
                      disabled={!templateId || isGenerating}
                      className="h-20 flex flex-col gap-2 hover-scale"
                    >
                      <Download className="w-6 h-6" />
                      <span>Export PDF</span>
                    </Button>
                    <Button
                      onClick={generateZPL}
                      disabled={!templateId}
                      variant="outline"
                      className="h-20 flex flex-col gap-2 hover-scale"
                    >
                      <Zap className="w-6 h-6" />
                      <span>Generate ZPL</span>
                    </Button>
                    <Button
                      onClick={printPreview}
                      disabled={!templateId}
                      variant="outline"
                      className="h-20 flex flex-col gap-2 hover-scale"
                    >
                      <Eye className="w-6 h-6" />
                      <span>Preview</span>
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      disabled={!templateId}
                      variant="outline"
                      className="h-20 flex flex-col gap-2 hover-scale"
                    >
                      <Printer className="w-6 h-6" />
                      <span>Direct Print</span>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="bulk" className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Print multiple labels using data from the selected dataset
                  </div>
                  {datasetId ? (
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={generatePDF}
                        disabled={!templateId || isGenerating}
                        className="h-20 flex flex-col gap-2"
                      >
                        <Download className="w-6 h-6" />
                        <span>Bulk PDF</span>
                      </Button>
                      <Button
                        onClick={generateZPL}
                        disabled={!templateId}
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                      >
                        <Zap className="w-6 h-6" />
                        <span>Bulk ZPL</span>
                      </Button>
                      <Button
                        onClick={printPreview}
                        disabled={!templateId}
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                      >
                        <Eye className="w-6 h-6" />
                        <span>Preview All</span>
                      </Button>
                      <Button
                        disabled={!templateId}
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                      >
                        <Printer className="w-6 h-6" />
                        <span>Batch Print</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Grid className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a dataset to enable bulk printing</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {isGenerating && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-blue-800">Generating PDF...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Printer Setup Guide */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Zebra Printer Setup</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-muted-foreground">
                To use ZPL files with your Zebra printer:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Download the generated .zpl file</li>
                <li>Copy to your printer via USB, network, or direct transfer</li>
                <li>Or use Zebra utilities to send ZPL commands directly</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
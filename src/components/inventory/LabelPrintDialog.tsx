import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Printer, FileText, Settings, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  canvas_data: any;
  width: number;
  height: number;
  created_at: string;
}

interface LabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: Array<{
    id: string;
    asin?: string;
    sku?: string;
    title: string;
    quantity: number;
    type: 'asin' | 'sku' | 'mixed';
    order_id?: string;
    order_quantity?: number;
  }>;
  inventoryType: 'asin' | 'sku' | 'mixed';
}

interface PrintSettings {
  format: 'pdf' | 'zpl';
  copies: number;
  labelsPerPage: number;
  paperSize: 'address' | 'shipping' | 'product' | 'barcode' | 'small' | 'medium' | 'large';
  dpi: 203 | 300;
}

export function LabelPrintDialog({ open, onOpenChange, selectedItems, inventoryType }: LabelPrintDialogProps) {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'pdf',
    copies: 1,
    labelsPerPage: 1,
    paperSize: 'address',
    dpi: 203
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('label_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      toast({
        title: "Error loading templates",
        description: error instanceof Error ? error.message : "Failed to load templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDataset = () => {
    const headers = ['asin', 'sku', 'title', 'quantity', 'order_id', 'order_quantity'];
    const data = selectedItems.map(item => [
      item.asin || '',
      item.sku || '',
      item.title,
      item.quantity.toString(),
      item.order_id || '',
      item.order_quantity?.toString() || ''
    ]);
    
    return { headers, data };
  };

  const generatePDF = async () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const dataset = createDataset();
    
    // Import LABEL_PRESETS to get the actual label dimensions
    const { LABEL_PRESETS } = await import('@/types/label');
    const labelSize = LABEL_PRESETS[printSettings.paperSize];
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [labelSize.width, labelSize.height] // Use actual label dimensions
    });

    let yOffset = 20;
    const labelHeight = template.height + 10;

    dataset.data.forEach((row, index) => {
      if (index > 0 && yOffset + labelHeight > pdf.internal.pageSize.height - 20) {
        pdf.addPage();
        yOffset = 20;
      }

      // Simple label rendering - in a real implementation, you'd parse the canvas_data
      pdf.setFontSize(12);
      pdf.text(`${row[0] || row[1]} - ${row[2]}`, 20, yOffset);
      pdf.text(`Qty: ${row[3]} | Order: ${row[4]}`, 20, yOffset + 5);
      
      if (row[0]) pdf.text(`ASIN: ${row[0]}`, 20, yOffset + 10);
      if (row[1]) pdf.text(`SKU: ${row[1]}`, 20, yOffset + 15);

      yOffset += labelHeight;
    });

    return pdf;
  };

  const handlePreview = async () => {
    if (!selectedTemplate) {
      toast({
        title: "No template selected",
        description: "Please select a label template first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const pdf = await generatePDF();
      if (pdf) {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error generating preview",
        description: error instanceof Error ? error.message : "Failed to generate preview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!selectedTemplate) {
      toast({
        title: "No template selected",
        description: "Please select a label template first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const pdf = await generatePDF();
      if (pdf) {
        pdf.save(`order-labels-${Date.now()}.pdf`);
        toast({
          title: "Labels generated",
          description: `Generated ${selectedItems.length} labels successfully`,
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Error generating labels",
        description: error instanceof Error ? error.message : "Failed to generate labels",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Print Custom Labels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Select Template
              </CardTitle>
              <CardDescription>
                Choose a label template to print {selectedItems.length} selected items
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No label templates found</p>
                  <p className="text-sm">Create templates in the Label Designer first</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50">
                        <RadioGroupItem value={template.id} id={template.id} />
                        <label htmlFor={template.id} className="flex-1 cursor-pointer">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Size: {template.width}×{template.height}mm
                          </div>
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Print Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Print Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="copies">Copies</Label>
                  <Input
                    id="copies"
                    type="number"
                    min="1"
                    value={printSettings.copies}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="labelsPerPage">Labels per Page</Label>
                  <Select
                    value={printSettings.labelsPerPage.toString()}
                    onValueChange={(value) => setPrintSettings(prev => ({ ...prev, labelsPerPage: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Label Size</Label>
                  <Select
                    value={printSettings.paperSize}
                    onValueChange={(value: 'address' | 'shipping' | 'product' | 'barcode' | 'small' | 'medium' | 'large') => setPrintSettings(prev => ({ ...prev, paperSize: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="address">Address Label (89×36mm)</SelectItem>
                      <SelectItem value="shipping">Shipping Label (102×152mm)</SelectItem>
                      <SelectItem value="product">Product Label (50×30mm)</SelectItem>
                      <SelectItem value="barcode">Barcode Label (70×25mm)</SelectItem>
                      <SelectItem value="small">Small Label (38×25mm)</SelectItem>
                      <SelectItem value="medium">Medium Label (70×42mm)</SelectItem>
                      <SelectItem value="large">Large Label (102×76mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quality (DPI)</Label>
                  <Select
                    value={printSettings.dpi.toString()}
                    onValueChange={(value) => setPrintSettings(prev => ({ ...prev, dpi: parseInt(value) as 203 | 300 }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="203">203 DPI (Standard)</SelectItem>
                      <SelectItem value="300">300 DPI (High Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Items Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selected Items ({selectedItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{item.asin || item.sku}</span>
                    <span className="text-muted-foreground truncate max-w-48">{item.title}</span>
                    <Badge variant="secondary">Qty: {item.quantity}</Badge>
                  </div>
                ))}
                {selectedItems.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground">
                    ... and {selectedItems.length - 5} more items
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePreview}
              disabled={!selectedTemplate || loading}
            >
              <FileText className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handlePrint}
              disabled={!selectedTemplate || loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Print PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
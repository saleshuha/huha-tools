import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, FileText, Settings, Package, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PrintService } from '@/services/print-service';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { LabelDoc, LabelDataset, PrintSettings, LABEL_PRESETS } from '@/types/label';

interface POLabelPrintPanelProps {
  poNumber: string;
  orders: any[];
}

interface LabelTemplate {
  id: string;
  name: string;
  description?: string;
  canvas_data: any;
  width: number;
  height: number;
}

export const POLabelPrintPanel: React.FC<POLabelPrintPanelProps> = ({
  poNumber,
  orders
}) => {
  const { toast } = useToast();
  
  // Templates and printing state
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  
  // Print settings
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'zpl',
    paperSize: 'custom',
    orientation: 'portrait',
    dpi: 203,
    copies: 1,
    labelsPerPage: 1,
    margin: 5,
    darkness: 10
  });
  
  // Label size settings
  const [selectedPreset, setSelectedPreset] = useState<string>('shipping');
  const [customSize, setCustomSize] = useState({ width: 102, height: 152 });
  
  // Copy options
  const [perQuantity, setPerQuantity] = useState(false);
  
  // QZ Tray state
  const [qzConnected, setQzConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    connectToQZ();
  }, []);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('po-label-print-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setPrintSettings(prev => ({ ...prev, ...parsed }));
        if (parsed.selectedPrinter) setSelectedPrinter(parsed.selectedPrinter);
        if (parsed.selectedPreset) setSelectedPreset(parsed.selectedPreset);
        if (parsed.customSize) setCustomSize(parsed.customSize);
        if (parsed.perQuantity !== undefined) setPerQuantity(parsed.perQuantity);
      } catch (error) {
        console.error('Failed to load saved print settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    const settingsToSave = {
      ...printSettings,
      selectedPrinter,
      selectedPreset,
      customSize,
      perQuantity
    };
    localStorage.setItem('po-label-print-settings', JSON.stringify(settingsToSave));
  };

  // Load label templates from Supabase
  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const { data, error } = await supabase
        .from('label_templates')
        .select('id, name, description, canvas_data, width, height')
        .order('name');
      
      if (error) throw error;
      
      setTemplates(data || []);
      
      // Auto-select first template if available
      if (data && data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Failed to Load Templates",
        description: "Could not load label templates from database",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Connect to QZ Tray
  const connectToQZ = async () => {
    try {
      setIsConnecting(true);
      await qzConnectionManager.connect();
      setQzConnected(true);
      
      // Load printers
      const printers = await qzConnectionManager.getPrinters();
      setAvailablePrinters(printers);
      
      // Auto-select default printer
      if (printers.length > 0 && !selectedPrinter) {
        const defaultPrinter = await qzConnectionManager.getDefaultPrinter();
        setSelectedPrinter(defaultPrinter || printers[0]);
      }
      
      toast({
        title: "QZ Tray Connected",
        description: `Found ${printers.length} printer(s)`,
      });
    } catch (error) {
      console.error('QZ connection failed:', error);
      setQzConnected(false);
      toast({
        title: "QZ Tray Connection Failed",
        description: "Direct printing not available. You can still download ZPL/PDF files.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Create dataset from PO orders
  const createDataset = (): LabelDataset => {
    const headers = ['po_number', 'asin', 'sku', 'title', 'quantity', 'model_number', 'status'];
    const data: any[][] = [];
    
    orders.forEach(order => {
      const copies = perQuantity ? (order.quantity || 1) : 1;
      
      for (let i = 0; i < copies; i++) {
        data.push([
          poNumber,
          order.asin || '',
          order.sku_code || '',
          order.title || '',
          order.quantity || 0,
          order.model_number || '',
          order.status || 'pending'
        ]);
      }
    });
    
    return {
      id: `po-${poNumber}`,
      name: `PO ${poNumber} Labels`,
      description: `Label data for Purchase Order ${poNumber}`,
      headers,
      data,
      rowCount: data.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Create LabelDoc from template or default
  const createLabelDoc = (template?: LabelTemplate): LabelDoc => {
    if (template) {
      // Use selected template
      return {
        id: template.id,
        name: template.name,
        size: {
          width: template.width,
          height: template.height,
          unit: 'mm'
        },
        elements: template.canvas_data?.elements || [],
        createdAt: template.canvas_data?.createdAt || new Date().toISOString(),
        updatedAt: template.canvas_data?.updatedAt || new Date().toISOString()
      };
    }
    
    // Create default template
    const size = selectedPreset !== 'custom' 
      ? LABEL_PRESETS[selectedPreset] 
      : { width: customSize.width, height: customSize.height, unit: 'mm' as const };
    
    return {
      id: 'default-po-label',
      name: 'Default PO Label',
      size,
      elements: [
        {
          id: 'po-number',
          type: 'text',
          x: 5,
          y: 5,
          width: 50,
          height: 8,
          text: 'PO: {{po_number}}',
          fontSize: 12,
          fontWeight: 'bold',
          dataColumn: 'po_number',
          dataTransform: { prefix: 'PO: ' }
        },
        {
          id: 'asin',
          type: 'text',
          x: 5,
          y: 15,
          width: 60,
          height: 6,
          text: 'ASIN: {{asin}}',
          fontSize: 10,
          dataColumn: 'asin',
          dataTransform: { prefix: 'ASIN: ' }
        },
        {
          id: 'title',
          type: 'multitext',
          x: 5,
          y: 25,
          width: size.width - 10,
          height: 20,
          text: '{{title}}',
          fontSize: 8,
          dataColumn: 'title',
          maxLines: 3,
          wordWrap: true
        },
        {
          id: 'sku-barcode',
          type: 'barcode',
          x: 5,
          y: size.height - 25,
          width: 50,
          height: 15,
          barcodeType: 'CODE128',
          text: '{{sku}}',
          dataColumn: 'sku',
          showText: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Get current label size based on selection
  const getCurrentSize = () => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (selectedTemplate) {
      return { width: selectedTemplate.width, height: selectedTemplate.height };
    }
    
    return selectedPreset !== 'custom' 
      ? LABEL_PRESETS[selectedPreset] 
      : customSize;
  };

  // Calculate total labels
  const getTotalLabels = () => {
    const baseCount = orders.length;
    const withQuantity = perQuantity 
      ? orders.reduce((sum, order) => sum + (order.quantity || 1), 0)
      : baseCount;
    return withQuantity * printSettings.copies;
  };

  // Generate and download ZPL
  const handleDownloadZPL = async () => {
    try {
      setIsProcessing(true);
      saveSettings();
      
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const labelDoc = createLabelDoc(selectedTemplate);
      const dataset = createDataset();
      
      const zpl = PrintService.generateZPL(labelDoc, dataset, printSettings);
      
      // Download file
      const blob = new Blob([zpl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO_${poNumber}_Labels.zpl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "ZPL Downloaded",
        description: `Generated ${getTotalLabels()} label(s)`,
      });
    } catch (error) {
      console.error('ZPL generation failed:', error);
      toast({
        title: "ZPL Generation Failed",
        description: "Could not generate ZPL file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate and download PDF
  const handleDownloadPDF = async () => {
    try {
      setIsProcessing(true);
      saveSettings();
      
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const labelDoc = createLabelDoc(selectedTemplate);
      const dataset = createDataset();
      
      const pdfBlob = await PrintService.generatePDF(labelDoc, dataset, printSettings);
      
      // Download file
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO_${poNumber}_Labels.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: `Generated ${getTotalLabels()} label(s)`,
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Could not generate PDF file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct print via QZ Tray
  const handleDirectPrint = async () => {
    if (!qzConnected || !selectedPrinter) {
      toast({
        title: "Printer Not Available",
        description: "Please connect to QZ Tray and select a printer",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      saveSettings();
      
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const labelDoc = createLabelDoc(selectedTemplate);
      const dataset = createDataset();
      
      const zpl = PrintService.generateZPL(labelDoc, dataset, printSettings);
      
      await qzConnectionManager.print(zpl, selectedPrinter);
      
      toast({
        title: "Print Job Sent",
        description: `Sent ${getTotalLabels()} label(s) to ${selectedPrinter}`,
      });
    } catch (error) {
      console.error('Direct print failed:', error);
      toast({
        title: "Print Failed",
        description: "Could not send print job to printer",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Print Labels
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No orders available for label printing</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Print Labels
          <Badge variant="secondary" className="ml-2">
            {orders.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Label Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
            disabled={isLoadingTemplates}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingTemplates ? "Loading templates..." : "Select template or use default"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default PO Label</SelectItem>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                  {template.description && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({template.description})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templates.length === 0 && !isLoadingTemplates && (
            <p className="text-xs text-muted-foreground">
              No custom templates found. Using default layout.
            </p>
          )}
        </div>

        <Separator />

        {/* Print Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Label Size */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Label Size</Label>
            <Select
              value={selectedPreset}
              onValueChange={setSelectedPreset}
              disabled={selectedTemplateId !== ''}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LABEL_PRESETS).map(([key, size]) => (
                  <SelectItem key={key} value={key}>
                    {key} ({size.width}×{size.height}mm)
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Size</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedPreset === 'custom' && selectedTemplateId === '' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Width (mm)</Label>
                  <Input
                    type="number"
                    value={customSize.width}
                    onChange={(e) => setCustomSize(prev => ({ ...prev, width: Number(e.target.value) }))}
                    min="10"
                    max="300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Height (mm)</Label>
                  <Input
                    type="number"
                    value={customSize.height}
                    onChange={(e) => setCustomSize(prev => ({ ...prev, height: Number(e.target.value) }))}
                    min="10"
                    max="300"
                  />
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Current: {getCurrentSize().width}×{getCurrentSize().height}mm
            </div>
          </div>

          {/* Print Quality */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Print Quality</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">DPI</Label>
                <Select
                  value={printSettings.dpi.toString()}
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, dpi: Number(value) as 203 | 300 }))}
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
              
              <div>
                <Label className="text-xs text-muted-foreground">
                  Darkness: {printSettings.darkness}
                </Label>
                <Input
                  type="range"
                  min="0"
                  max="30"
                  value={printSettings.darkness}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, darkness: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Light (0)</span>
                  <span>Dark (30)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copy Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Copy Options</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm">Print per quantity</div>
              <div className="text-xs text-muted-foreground">
                Print multiple labels based on item quantity
              </div>
            </div>
            <Switch
              checked={perQuantity}
              onCheckedChange={setPerQuantity}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Copies per label</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={printSettings.copies}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, copies: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total labels</Label>
              <div className="h-9 px-3 py-2 border rounded-md bg-muted text-sm">
                {getTotalLabels()}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Printer Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Direct Printing (QZ Tray)</Label>
            <div className="flex items-center gap-2">
              <Badge variant={qzConnected ? "default" : "secondary"}>
                {qzConnected ? "Connected" : "Disconnected"}
              </Badge>
              {!qzConnected && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={connectToQZ}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </Button>
              )}
            </div>
          </div>
          
          {qzConnected && availablePrinters.length > 0 && (
            <Select
              value={selectedPrinter}
              onValueChange={setSelectedPrinter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select printer" />
              </SelectTrigger>
              <SelectContent>
                {availablePrinters.map(printer => (
                  <SelectItem key={printer} value={printer}>
                    {printer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {!qzConnected && (
            <p className="text-xs text-muted-foreground">
              QZ Tray connection required for direct printing. You can still download ZPL/PDF files.
            </p>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            onClick={handleDirectPrint}
            disabled={!qzConnected || !selectedPrinter || isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isProcessing ? "Printing..." : "Direct Print"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownloadZPL}
            disabled={isProcessing}
          >
            <Download className="h-4 w-4 mr-2" />
            Download ZPL
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isProcessing}
          >
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Settings Summary */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <div className="font-medium mb-1">Print Summary:</div>
          <div>
            Template: {selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.name : 'Default'} • 
            Size: {getCurrentSize().width}×{getCurrentSize().height}mm • 
            DPI: {printSettings.dpi} • 
            Darkness: {printSettings.darkness} • 
            Total Labels: {getTotalLabels()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
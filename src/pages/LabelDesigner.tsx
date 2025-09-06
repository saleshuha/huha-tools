import React, { useState, createContext, useContext } from 'react';
import { SimpleLabelDocProvider, useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { LabelToolbar } from '@/components/label/LabelToolbar';
import { LabelWorkspace } from '@/components/label/LabelWorkspace';
import { LabelPropertiesPanel } from '@/components/label/LabelPropertiesPanel';
import { InventoryDataMapper } from '@/components/label/InventoryDataMapper';
import { OrderLabelTemplates } from '@/components/label/OrderLabelTemplates';
import { DateWiseOrderPrint } from '@/components/label/DateWiseOrderPrint';
import { NoonOrderPrint } from '@/components/label/NoonOrderPrint';
import { PrintEligibleItems } from '@/components/label/PrintEligibleItems';
import { DataPreviewPanel } from '@/components/label/DataPreviewPanel';
import { PrintService } from '@/services/print-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LABEL_PRESETS, PrintSettings } from '@/types/label';
import { Plus, Database, Eye, Download, Printer, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const LabelDesignerContent: React.FC = () => {
  const { document: labelDoc, dataset, createDocument, loadDocument, loadUserDocuments } = useLabelDoc();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('address');
  const [customWidth, setCustomWidth] = useState(100);
  const [customHeight, setCustomHeight] = useState(50);
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'pdf',
    paperSize: 'a4',
    orientation: 'portrait',
    dpi: 203,
    copies: 1,
    labelsPerPage: 4,
    margin: 10,
    darkness: 10, // Default Zebra print darkness
  });

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Please enter a label name');
      return;
    }
    
    let labelSize;
    if (isCustomSize) {
      if (customWidth <= 0 || customHeight <= 0) {
        toast.error('Please enter valid dimensions (greater than 0)');
        return;
      }
      labelSize = { width: customWidth, height: customHeight, unit: 'mm' as const };
    } else {
      labelSize = LABEL_PRESETS[selectedPreset];
    }
    
    await createDocument(newLabelName, labelSize);
    setShowCreateDialog(false);
    setNewLabelName('');
    setIsCustomSize(false);
    setCustomWidth(100);
    setCustomHeight(50);
  };

  const handlePreview = async () => {
    if (!labelDoc) return;
    const html = PrintService.generateHTMLPreview(labelDoc, dataset);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleExportPDF = async () => {
    if (!labelDoc) return;
    try {
      const blob = await PrintService.generatePDF(labelDoc, dataset, printSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${labelDoc.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleLoadDocuments = async () => {
    const docs = await loadUserDocuments();
    setUserDocuments(docs);
    setShowLoadDialog(true);
  };

  const handleLoadDocument = async (id: string) => {
    await loadDocument(id);
    setShowLoadDialog(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b-2 border-border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Label Designer & Printer
            </h1>
            {labelDoc && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-medium">
                  {labelDoc.name}
                </Badge>
                <Badge variant="secondary" className="bg-muted/80 border border-border">
                  {labelDoc.size.width}×{labelDoc.size.height}mm
                </Badge>
                {dataset && (
                  <Badge variant="secondary" className="bg-accent/20 border border-accent/30 text-accent-foreground">
                    <Database className="h-3 w-3 mr-1" />
                    {dataset.name} ({dataset.rowCount} rows)
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleLoadDocuments} className="border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Load Label
                </Button>
              </DialogTrigger>
              <DialogContent className="border-2 border-border bg-background/95 backdrop-blur-sm">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-foreground">Load Existing Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {userDocuments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No saved labels found.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {userDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex justify-between items-center p-4 border-2 border-border rounded-lg hover:bg-accent/50 hover:border-accent cursor-pointer transition-all duration-200"
                          onClick={() => handleLoadDocument(doc.id)}
                        >
                          <div>
                            <h4 className="font-medium text-foreground">{doc.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {doc.width}×{doc.height}mm • {new Date(doc.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 border-2 border-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  New Label
                </Button>
              </DialogTrigger>
              <DialogContent className="border-2 border-border bg-background/95 backdrop-blur-sm">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-foreground">Create New Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">Label Name</Label>
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Enter label name"
                      className="border-2 border-input focus:border-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">Size Preset</Label>
                    <Select 
                      value={isCustomSize ? 'custom' : selectedPreset} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setIsCustomSize(true);
                        } else {
                          setIsCustomSize(false);
                          setSelectedPreset(value);
                        }
                      }}
                    >
                      <SelectTrigger className="border-2 border-input focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-2 border-border shadow-lg z-50">
                        {Object.entries(LABEL_PRESETS).map(([key, preset]) => (
                          <SelectItem key={key} value={key} className="hover:bg-accent">
                            {key} ({preset.width}×{preset.height}mm)
                          </SelectItem>
                        ))}
                        <SelectItem value="custom" className="hover:bg-accent">
                          Custom Size
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {isCustomSize && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2 block">Width (mm)</Label>
                        <Input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(Number(e.target.value))}
                          placeholder="Width"
                          min="1"
                          max="500"
                          className="border-2 border-input focus:border-primary"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2 block">Height (mm)</Label>
                        <Input
                          type="number"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(Number(e.target.value))}
                          placeholder="Height"
                          min="1"
                          max="500"
                          className="border-2 border-input focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-2 border-border hover:bg-muted">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateLabel} className="bg-primary hover:bg-primary/90 border-2 border-primary">
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {labelDoc && (
              <Button variant="outline" size="sm" onClick={handlePreview} className="border-2 border-accent/30 hover:border-accent hover:bg-accent/10 text-accent-foreground">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6 p-6 bg-gradient-to-br from-background to-muted/20">
        <Tabs defaultValue="amazon-orders" className="flex-1">
          <TabsList className="grid w-fit grid-cols-4 mb-6 bg-muted/50 border-2 border-border p-1 rounded-lg">
            <TabsTrigger 
              value="amazon-orders" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200 hover:bg-accent/50"
            >
              Amazon Order Printing
            </TabsTrigger>
            <TabsTrigger 
              value="noon-orders" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200 hover:bg-accent/50"
            >
              Noon Order Printing
            </TabsTrigger>
            <TabsTrigger 
              value="eligible" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200 hover:bg-accent/50"
            >
              Print Eligible Items
            </TabsTrigger>
            <TabsTrigger 
              value="designer" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200 hover:bg-accent/50"
            >
              Label Designer
            </TabsTrigger>
          </TabsList>
          <TabsContent value="amazon-orders" className="border-2 border-border rounded-lg bg-card/50 p-6 shadow-sm">
            <DateWiseOrderPrint />
          </TabsContent>
          <TabsContent value="noon-orders" className="border-2 border-border rounded-lg bg-card/50 p-6 shadow-sm">
            <NoonOrderPrint />
          </TabsContent>
          <TabsContent value="eligible" className="border-2 border-border rounded-lg bg-card/50 p-6 shadow-sm">
            <PrintEligibleItems />
          </TabsContent>
          <TabsContent value="designer" className="border-2 border-border rounded-lg bg-card/50 p-6 shadow-sm">
            <div className="flex gap-6 min-h-0 flex-1">
              <div className="flex-1 border-2 border-border rounded-lg bg-background/50 p-4">
                <LabelWorkspace />
              </div>
              
              <div className="w-96 space-y-4">
                <div className="border-2 border-border rounded-lg bg-card/50 p-4">
                  <LabelToolbar />
                </div>
                <div className="border-2 border-border rounded-lg bg-card/50 p-4">
                  <OrderLabelTemplates />
                </div>
                <div className="border-2 border-border rounded-lg bg-card/50 p-4">
                  <LabelPropertiesPanel />
                </div>
                <div className="border-2 border-border rounded-lg bg-card/50 p-4">
                  <InventoryDataMapper />
                </div>
                <div className="border-2 border-border rounded-lg bg-card/50 p-4">
                  <DataPreviewPanel />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const LabelDesigner: React.FC = () => {
  return (
    <SimpleLabelDocProvider>
      <LabelDesignerContent />
    </SimpleLabelDocProvider>
  );
};

export default LabelDesigner;

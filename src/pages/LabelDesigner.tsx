import React, { useState, createContext, useContext } from 'react';
import { SimpleLabelDocProvider, useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { LabelToolbar } from '@/components/label/LabelToolbar';
import { AdvancedLabelWorkspace } from '@/components/label/AdvancedLabelWorkspace';
import { LeftToolbox } from '@/components/label/LeftToolbox';
import { LabelPropertiesPanel } from '@/components/label/LabelPropertiesPanel';
import { InventoryDataMapper } from '@/components/label/InventoryDataMapper';
import { OrderLabelTemplates } from '@/components/label/OrderLabelTemplates';
import { InventoryLabelTemplates } from '@/components/label/InventoryLabelTemplates';
import { POLabelTemplates } from '@/components/label/POLabelTemplates';
import { DomainDataMapper } from '@/components/label/DomainDataMapper';
import { DateWiseOrderPrint } from '@/components/label/DateWiseOrderPrint';
import { NoonOrderPrint } from '@/components/label/NoonOrderPrint';
import { PrintEligibleItems } from '@/components/label/PrintEligibleItems';
import { DataPreviewPanel } from '@/components/label/DataPreviewPanel';
import { StepperIndicator } from '@/components/label/StepperIndicator';
import { PrintService } from '@/services/print-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { LABEL_PRESETS, PrintSettings, LabelDomain } from '@/types/label';
import { Plus, Database, Eye, Download, Printer, FolderOpen, Archive, Package, ShoppingCart, Truck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
const LabelDesignerContent: React.FC = () => {
  const {
    document: labelDoc,
    dataset,
    createDocument,
    loadDocument,
    loadUserDocuments,
    deleteDocument
  } = useLabelDoc();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('address');
  const [customWidth, setCustomWidth] = useState(100);
  const [customHeight, setCustomHeight] = useState(50);
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<LabelDomain>('inventory');
  const [activeTab, setActiveTab] = useState('designer');
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'pdf',
    paperSize: 'a4',
    orientation: 'portrait',
    dpi: 203,
    copies: 1,
    labelsPerPage: 4,
    margin: 10,
    darkness: 10 // Default Zebra print darkness
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
      labelSize = {
        width: customWidth,
        height: customHeight,
        unit: 'mm' as const
      };
    } else {
      labelSize = LABEL_PRESETS[selectedPreset];
    }
    await createDocument(newLabelName, labelSize, selectedDomain);
    setShowCreateDialog(false);
    setNewLabelName('');
    setIsCustomSize(false);
    setCustomWidth(100);
    setCustomHeight(50);
    setSelectedDomain('inventory');
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

  const handleDeleteDocument = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent triggering the load action
    if (window.confirm('Are you sure you want to delete this label? This action cannot be undone.')) {
      await deleteDocument(id);
      // Refresh the documents list
      const docs = await loadUserDocuments();
      setUserDocuments(docs);
    }
  };
  const headerActions = [
    {
      label: 'Load Label',
      icon: <FolderOpen className="h-4 w-4 mr-2" />,
      onClick: handleLoadDocuments,
      variant: 'outline' as const,
      className: "border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-primary font-medium shadow-sm"
    },
    {
      label: 'New Label',
      icon: <Plus className="h-4 w-4 mr-2" />,
      onClick: () => setShowCreateDialog(true),
      variant: 'default' as const,
      className: "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 border-2 border-primary shadow-md font-medium"
    },
    ...(labelDoc ? [{
      label: 'Preview',
      icon: <Eye className="h-4 w-4 mr-2" />,
      onClick: handlePreview,
      variant: 'outline' as const,
      className: "border-2 border-accent/40 hover:border-accent hover:bg-accent/10 text-accent-foreground font-medium shadow-sm"
    }] : [])
  ];

  const getDomainLabel = (domain?: string) => {
    switch (domain) {
      case 'inventory': return 'Inventory';
      case 'amazon': return 'Amazon Orders';
      case 'noon': return 'Noon Orders';
      case 'po': return 'PO Items';
      default: return 'Inventory';
    }
  };

  const headerBadges = labelDoc ? [
    {
      label: labelDoc.name,
      variant: 'outline' as const,
      className: "border-primary/30 bg-primary/10 text-primary font-semibold px-3 py-1"
    },
    {
      label: getDomainLabel(labelDoc.domain),
      variant: 'outline' as const,
      className: "border-accent/40 bg-accent/15 text-accent-foreground font-medium px-2 py-1"
    },
    {
      label: `${labelDoc.size.width}×${labelDoc.size.height}mm`,
      variant: 'secondary' as const,
      className: "bg-muted/60 border-2 border-border/50 font-medium"
    },
    ...(dataset ? [{
      label: `${dataset.name} (${dataset.rowCount} rows)`,
      icon: <Database className="h-3 w-3 mr-1" />,
      variant: 'secondary' as const,
      className: "bg-accent/20 border-2 border-accent/30 text-accent-foreground font-medium"
    }] : [])
  ] : [];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
      <HuhaHeader01
        icon={<Printer className="h-5 w-5 text-primary-foreground" />}
        title="Label Designer & Printer"
        subtitle="Create, design and print professional labels"
        actions={headerActions}
        badges={headerBadges}
      />
      
      {/* Dialogs */}
        <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="border-2 border-border bg-background/95 backdrop-blur-sm max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">Load Existing Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {userDocuments.length === 0 ? <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No saved labels found.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Create a new label to get started</p>
              </div> : <div className="space-y-3 max-h-60 overflow-y-auto">
                {userDocuments.map(doc => <div key={doc.id} className="flex justify-between items-center p-4 border-2 border-border rounded-xl hover:bg-accent/30 hover:border-accent/50 transition-all duration-200 hover:shadow-sm">
                    <div className="flex-1 cursor-pointer" onClick={() => handleLoadDocument(doc.id)}>
                      <h4 className="font-medium text-foreground">{doc.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {doc.width}×{doc.height}mm • {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteDocument(e, doc.id)}
                      className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>)}
              </div>}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="border-2 border-border bg-background/95 backdrop-blur-sm max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">Create New Label</DialogTitle>
            <p className="text-sm text-muted-foreground">Design a new label template for your printing needs</p>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Label Name</Label>
              <Input value={newLabelName} onChange={e => setNewLabelName(e.target.value)} placeholder="Enter a descriptive name for your label" className="border-2 border-input focus:border-primary/60 focus:ring-2 focus:ring-primary/20 h-11" />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Label Purpose</Label>
              <Select value={selectedDomain} onValueChange={(value: LabelDomain) => setSelectedDomain(value)}>
                <SelectTrigger className="border-2 border-input focus:border-primary/60 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-border shadow-lg z-50">
                  <SelectItem value="inventory" className="hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      <span>Inventory</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="amazon" className="hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Amazon Orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="noon" className="hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Noon Orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="po" className="hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span>PO Items</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Size Preset</Label>
              <Select value={isCustomSize ? 'custom' : selectedPreset} onValueChange={value => {
              if (value === 'custom') {
                setIsCustomSize(true);
              } else {
                setIsCustomSize(false);
                setSelectedPreset(value);
              }
            }}>
                <SelectTrigger className="border-2 border-input focus:border-primary/60 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-border shadow-lg z-50">
                  {Object.entries(LABEL_PRESETS).map(([key, preset]) => <SelectItem key={key} value={key} className="hover:bg-accent/50">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{key}</span>
                        <span className="text-muted-foreground text-sm">({preset.width}×{preset.height}mm)</span>
                      </div>
                    </SelectItem>)}
                  <SelectItem value="custom" className="hover:bg-accent/50 border-t border-border mt-2 pt-2">
                    <span className="font-medium text-primary">Custom Size</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isCustomSize && <div className="grid grid-cols-2 gap-4 p-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Width (mm)</Label>
                  <Input type="number" value={customWidth} onChange={e => setCustomWidth(Number(e.target.value))} placeholder="Width" min="1" max="500" className="border-2 border-input focus:border-primary/60 h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Height (mm)</Label>
                  <Input type="number" value={customHeight} onChange={e => setCustomHeight(Number(e.target.value))} placeholder="Height" min="1" max="500" className="border-2 border-input focus:border-primary/60 h-10" />
                </div>
              </div>}
            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-2 border-border hover:bg-muted/50">
                Cancel
              </Button>
              <Button onClick={handleCreateLabel} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 border-2 border-primary shadow-sm">
                Create Label
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="flex flex-col gap-8 p-8 flex-1 min-h-0">
        {/* Enhanced Stepper */}
        

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0">
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-muted/50">
              <TabsTrigger value="amazon-orders" className="h-10 px-4 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
                Amazon Orders
              </TabsTrigger>
              <TabsTrigger value="noon-orders" className="h-10 px-4 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
                Noon Orders
              </TabsTrigger>
              <TabsTrigger value="eligible" className="h-10 px-4 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
                Eligible Items
              </TabsTrigger>
              <TabsTrigger value="designer" className="h-10 px-4 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
                Designer
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content with Enhanced Styling */}
          <TabsContent value="amazon-orders" className="border-2 border-border/50 rounded-xl bg-gradient-to-br from-card/60 to-card/40 p-8 shadow-lg min-h-0 flex-1">
            <div className="h-full">
              <DateWiseOrderPrint />
            </div>
          </TabsContent>
          
          <TabsContent value="noon-orders" className="border-2 border-border/50 rounded-xl bg-gradient-to-br from-card/60 to-card/40 p-8 shadow-lg min-h-0 flex-1">
            <div className="h-full">
              <NoonOrderPrint />
            </div>
          </TabsContent>
          
          <TabsContent value="eligible" className="border-2 border-border/50 rounded-xl bg-gradient-to-br from-card/60 to-card/40 p-8 shadow-lg min-h-0 flex-1">
            <div className="h-full">
              <PrintEligibleItems />
            </div>
          </TabsContent>
          
          <TabsContent value="designer" className="border-2 border-border/50 rounded-xl bg-gradient-to-br from-card/60 to-card/40 shadow-lg min-h-0 flex-1 p-0">
            <PanelGroup direction="horizontal" className="h-full">
              {/* Left Toolbox */}
              <Panel defaultSize={18} minSize={15} maxSize={25}>
                <div className="h-full p-4">
                  <LeftToolbox />
                </div>
              </Panel>
              
              <PanelResizeHandle className="w-2 bg-border/30 hover:bg-border/50 transition-colors" />
              
              {/* Center Canvas */}
              <Panel defaultSize={50} minSize={40}>
                <div className="h-full border-2 border-border/30 rounded-lg bg-gradient-to-br from-background/90 to-background/70 m-4 shadow-inner">
                  <div className="h-full p-4">
                    <AdvancedLabelWorkspace />
                  </div>
                </div>
              </Panel>
              
              <PanelResizeHandle className="w-2 bg-border/30 hover:bg-border/50 transition-colors" />
              
              {/* Right Properties Panel */}
              <Panel defaultSize={32} minSize={25} maxSize={40}>
                <div className="h-full p-4">
                  <Card className="h-full border-2 border-border/60 bg-gradient-to-br from-card/80 to-card/60 shadow-lg">
                    <Tabs defaultValue="properties" className="h-full flex flex-col">
                      <div className="px-4 pt-4 border-b border-border/30">
                        <TabsList className="grid w-full grid-cols-4 h-9 p-0.5 bg-muted/30">
                          <TabsTrigger value="properties" className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Properties
                          </TabsTrigger>
                          <TabsTrigger value="templates" className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Templates
                          </TabsTrigger>
                          <TabsTrigger value="data" className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Data
                          </TabsTrigger>
                          <TabsTrigger value="preview" className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Preview
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      
                      <div className="flex-1 min-h-0">
                        <TabsContent value="properties" className="h-full p-0 m-0">
                          <ScrollArea className="h-full">
                            <div className="p-4">
                              <LabelPropertiesPanel />
                            </div>
                          </ScrollArea>
                        </TabsContent>
                        
                        <TabsContent value="templates" className="h-full p-0 m-0">
                          <ScrollArea className="h-full">
                            <div className="p-4">
                              {labelDoc?.domain === 'inventory' && <InventoryLabelTemplates />}
                              {labelDoc?.domain === 'amazon' && <OrderLabelTemplates />}
                              {labelDoc?.domain === 'noon' && <OrderLabelTemplates />}
                              {labelDoc?.domain === 'po' && <POLabelTemplates />}
                              {!labelDoc?.domain && <InventoryLabelTemplates />}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                        
                        <TabsContent value="data" className="h-full p-0 m-0">
                          <ScrollArea className="h-full">
                            <div className="p-4 space-y-4">
                              <InventoryDataMapper />
                            </div>
                          </ScrollArea>
                        </TabsContent>
                        
                        <TabsContent value="preview" className="h-full p-0 m-0">
                          <ScrollArea className="h-full">
                            <div className="p-4">
                              <DataPreviewPanel />
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </Card>
                </div>
              </Panel>
            </PanelGroup>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
const LabelDesigner: React.FC = () => {
  return <SimpleLabelDocProvider>
      <LabelDesignerContent />
    </SimpleLabelDocProvider>;
};
export default LabelDesigner;
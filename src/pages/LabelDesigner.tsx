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
import { LABEL_PRESETS, PrintSettings } from '@/types/label';
import { Plus, Database, Eye, Download, Printer, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
const LabelDesignerContent: React.FC = () => {
  const {
    document: labelDoc,
    dataset,
    createDocument,
    loadDocument,
    loadUserDocuments
  } = useLabelDoc();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('address');
  const [customWidth, setCustomWidth] = useState(100);
  const [customHeight, setCustomHeight] = useState(50);
  const [isCustomSize, setIsCustomSize] = useState(false);
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

  const headerBadges = labelDoc ? [
    {
      label: labelDoc.name,
      variant: 'outline' as const,
      className: "border-primary/30 bg-primary/10 text-primary font-semibold px-3 py-1"
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
                {userDocuments.map(doc => <div key={doc.id} className="flex justify-between items-center p-4 border-2 border-border rounded-xl hover:bg-accent/30 hover:border-accent/50 cursor-pointer transition-all duration-200 hover:shadow-sm" onClick={() => handleLoadDocument(doc.id)}>
                    <div>
                      <h4 className="font-medium text-foreground">{doc.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {doc.width}×{doc.height}mm • {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </div>
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
              <TabsTrigger value="amazon-orders" className="h-10 px-6 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
                Amazon Orders
              </TabsTrigger>
              <TabsTrigger value="noon-orders" className="h-10 px-6 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
                Noon Orders
              </TabsTrigger>
              <TabsTrigger value="eligible" className="h-10 px-6 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
                Eligible Items
              </TabsTrigger>
              <TabsTrigger value="designer" className="h-10 px-6 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">
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
          
          <TabsContent value="designer" className="border-2 border-border/50 rounded-xl bg-gradient-to-br from-card/60 to-card/40 p-8 shadow-lg min-h-0 flex-1">
            <div className="flex gap-8 min-h-0 flex-1 h-full">
              {/* Main Canvas Area */}
              <div className="flex-1 border-2 border-border/60 rounded-xl bg-gradient-to-br from-background/80 to-background/60 shadow-inner">
                <div className="h-full p-6">
                  <LabelWorkspace />
                </div>
              </div>
              
              {/* Enhanced Control Panel */}
              <div className="w-96 space-y-5 overflow-y-auto max-h-full">
                {/* Step 1: Design Tools */}
                <div className="border-2 border-border/60 rounded-xl bg-gradient-to-br from-card/70 to-card/50 shadow-md">
                  <div className="p-4 border-b-2 border-border/30 bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm flex items-center justify-center shadow-sm">
                        1
                      </div>
                      <h3 className="font-semibold text-foreground">Design Tools</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <LabelToolbar />
                  </div>
                </div>

                {/* Step 2: Quick Templates */}
                <div className="border-2 border-border/60 rounded-xl bg-gradient-to-br from-card/70 to-card/50 shadow-md">
                  <div className="p-4 border-b-2 border-border/30 bg-gradient-to-r from-accent/10 to-accent/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-bold text-sm flex items-center justify-center shadow-sm">
                        2
                      </div>
                      <h3 className="font-semibold text-foreground">Quick Templates</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <OrderLabelTemplates />
                  </div>
                </div>

                {/* Step 3: Element Properties */}
                <div className="border-2 border-border/60 rounded-xl bg-gradient-to-br from-card/70 to-card/50 shadow-md">
                  <div className="p-4 border-b-2 border-border/30 bg-gradient-to-r from-secondary/10 to-secondary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground font-bold text-sm flex items-center justify-center shadow-sm">
                        3
                      </div>
                      <h3 className="font-semibold text-foreground">Element Properties</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <LabelPropertiesPanel />
                  </div>
                </div>

                {/* Step 4: Data Mapping */}
                <div className="border-2 border-border/60 rounded-xl bg-gradient-to-br from-card/70 to-card/50 shadow-md">
                  <div className="p-4 border-b-2 border-border/30 bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm flex items-center justify-center shadow-sm">
                        4
                      </div>
                      <h3 className="font-semibold text-foreground">Data Source</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <InventoryDataMapper />
                  </div>
                </div>

                {/* Step 5: Data Preview */}
                <div className="border-2 border-border/60 rounded-xl bg-gradient-to-br from-card/70 to-card/50 shadow-md">
                  <div className="p-4 border-b-2 border-border/30 bg-gradient-to-r from-accent/10 to-accent/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-bold text-sm flex items-center justify-center shadow-sm">
                        5
                      </div>
                      <h3 className="font-semibold text-foreground">Data Preview</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <DataPreviewPanel />
                  </div>
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
  return <SimpleLabelDocProvider>
      <LabelDesignerContent />
    </SimpleLabelDocProvider>;
};
export default LabelDesigner;
import React, { useState } from 'react';
import { LabelDocProvider, useLabelDoc } from '@/contexts/LabelDocContext';
import { LabelToolbar } from '@/components/label/LabelToolbar';
import { LabelWorkspace } from '@/components/label/LabelWorkspace';
import { LabelPropertiesPanel } from '@/components/label/LabelPropertiesPanel';
import { PrintService } from '@/services/print-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LABEL_PRESETS, PrintSettings } from '@/types/label';
import { Plus, Database, Eye, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';

const LabelDesignerContent: React.FC = () => {
  const { document, dataset, createDocument } = useLabelDoc();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('address');
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    format: 'pdf',
    paperSize: 'a4',
    orientation: 'portrait',
    dpi: 203,
    copies: 1,
    labelsPerPage: 4,
    margin: 10,
  });

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Please enter a label name');
      return;
    }
    const preset = LABEL_PRESETS[selectedPreset];
    await createDocument(newLabelName, preset);
    setShowCreateDialog(false);
    setNewLabelName('');
  };

  const handlePreview = async () => {
    if (!document) return;
    const html = PrintService.generateHTMLPreview(document, dataset);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleExportPDF = async () => {
    if (!document) return;
    try {
      const blob = await PrintService.generatePDF(document, dataset, printSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${document.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Label Designer</h1>
            {document && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{document.name}</Badge>
                <Badge variant="secondary">
                  {document.size.width}×{document.size.height}mm
                </Badge>
                {dataset && (
                  <Badge variant="secondary">
                    <Database className="h-3 w-3 mr-1" />
                    {dataset.name}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Label Name</Label>
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Enter label name"
                    />
                  </div>
                  <div>
                    <Label>Size Preset</Label>
                    <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LABEL_PRESETS).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>
                            {key} ({preset.width}×{preset.height}mm)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateLabel}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {document && (
              <>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        <LabelToolbar />
        <LabelWorkspace />
        <LabelPropertiesPanel />
      </div>
    </div>
  );
};

const LabelDesigner: React.FC = () => {
  return (
    <LabelDocProvider>
      <LabelDesignerContent />
    </LabelDocProvider>
  );
};

export default LabelDesigner;

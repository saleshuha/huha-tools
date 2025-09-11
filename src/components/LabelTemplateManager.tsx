import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { FileText, Tags, Printer, Settings, Save, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AsinInventoryItem } from '@/hooks/useAsinInventory';

interface LabelTemplate {
  id: string;
  name: string;
  description?: string;
  canvas_data: any;
  width: number;
  height: number;
  created_at: string;
}

interface LabelTemplateManagerProps {
  selectedItems: Set<string>;
  allItems: AsinInventoryItem[];
  onPrint?: (templateId: string, items: AsinInventoryItem[]) => void;
}

export function LabelTemplateManager({ selectedItems, allItems, onPrint }: LabelTemplateManagerProps) {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [savedTemplate, setSavedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadSavedTemplate();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('label_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const loadSavedTemplate = () => {
    const saved = localStorage.getItem('savedLabelTemplate');
    if (saved) {
      setSavedTemplate(saved);
      setSelectedTemplate(saved);
    }
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template to save");
      return;
    }
    localStorage.setItem('savedLabelTemplate', selectedTemplate);
    setSavedTemplate(selectedTemplate);
    toast.success("Template saved for future use!");
  };

  const handlePrintSelected = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }
    
    const itemsToPrint = allItems.filter(item => selectedItems.has(item.id));
    if (itemsToPrint.length === 0) {
      toast.error("No items selected for printing");
      return;
    }

    onPrint?.(selectedTemplate, itemsToPrint);
    toast.success(`Printing ${itemsToPrint.length} items with selected template`);
  };

  const handlePrintAll = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }
    
    // For now, just show a message - in real implementation this would print all inventory
    toast.info("Print all functionality would be implemented here");
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const savedTemplateData = templates.find(t => t.id === savedTemplate);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
          <Tags className="w-4 h-4 mr-2" />
          Label Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Label Template Manager
          </DialogTitle>
          <DialogDescription>
            Select, save, and print inventory labels using templates. 
            {selectedItems.size > 0 && ` ${selectedItems.size} items selected for printing.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Saved Template Display */}
          {savedTemplate && savedTemplateData && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Saved Template:</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {savedTemplateData.name}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTemplate(savedTemplate)}
                    className="text-green-700 border-green-300"
                  >
                    Use Saved
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a label template..." />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                ) : templates.length === 0 ? (
                  <SelectItem value="none" disabled>No templates available</SelectItem>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{template.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {template.width} × {template.height}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedTemplateData && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{selectedTemplateData.name}</h4>
                      {selectedTemplateData.description && (
                        <p className="text-sm text-blue-700">{selectedTemplateData.description}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedTemplateData.width} × {selectedTemplateData.height}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {new Date(selectedTemplateData.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                onClick={handleSaveTemplate}
                disabled={!selectedTemplate || selectedTemplate === savedTemplate}
                className="flex-1"
                variant="outline"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
              <Button
                onClick={() => toast.info("Template preview would open here")}
                disabled={!selectedTemplate}
                variant="outline"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={handlePrintSelected}
                disabled={!selectedTemplate || selectedItems.size === 0}
                className="w-full"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Selected Items ({selectedItems.size})
              </Button>
              <Button
                onClick={handlePrintAll}
                disabled={!selectedTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Print All Inventory
              </Button>
            </div>
          </div>

          {/* Template Management Link */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Need to create or edit templates?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                // Navigate to label designer - this would need routing implementation
                toast.info("Would navigate to Label Designer");
              }}
              className="w-full justify-start"
            >
              <Settings className="w-4 h-4 mr-2" />
              Go to Label Designer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  Copy, 
  Download,
  Calendar,
  User
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

interface LabelTemplate {
  id: string;
  name: string;
  description?: string;
  canvas_data: any;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

interface LabelTemplatesProps {
  onTemplateSelect: (templateId: string | null) => void;
  activeTemplate: string | null;
}

export function LabelTemplates({ onTemplateSelect, activeTemplate }: LabelTemplatesProps) {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    width: 400,
    height: 300
  });
  const { user } = useUserProfile();

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

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

  const createTemplate = async () => {
    if (!user || !newTemplate.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('label_templates')
        .insert([
          {
            user_id: user.id,
            name: newTemplate.name.trim(),
            description: newTemplate.description.trim() || null,
            width: newTemplate.width,
            height: newTemplate.height,
            canvas_data: {}
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      setShowCreateDialog(false);
      setNewTemplate({ name: '', description: '', width: 400, height: 300 });
      toast.success("Template created successfully!");
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error("Failed to create template");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('label_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (activeTemplate === templateId) {
        onTemplateSelect(null);
      }
      toast.success("Template deleted successfully!");
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template");
    }
  };

  const duplicateTemplate = async (template: LabelTemplate) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('label_templates')
        .insert([
          {
            user_id: user.id,
            name: `${template.name} (Copy)`,
            description: template.description,
            width: template.width,
            height: template.height,
            canvas_data: template.canvas_data
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      toast.success("Template duplicated successfully!");
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error("Failed to duplicate template");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Label Templates</h2>
          <p className="text-muted-foreground">
            Manage your label templates and create new designs
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new label template with custom dimensions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name..."
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter template description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={newTemplate.width}
                    onChange={(e) => setNewTemplate(prev => ({ 
                      ...prev, 
                      width: parseInt(e.target.value) || 400 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height" 
                    type="number"
                    value={newTemplate.height}
                    onChange={(e) => setNewTemplate(prev => ({ 
                      ...prev, 
                      height: parseInt(e.target.value) || 300 
                    }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createTemplate}>
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first label template to get started with designing professional labels
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className={`cursor-pointer transition-all hover:shadow-md animate-fade-in hover-scale ${
                activeTemplate === template.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onTemplateSelect(template.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  {activeTemplate === template.id && (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(template.created_at).toLocaleDateString()}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {template.width} × {template.height}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs">Preview</p>
                  </div>
                </div>
                <div className="flex justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateTemplate(template)}
                    className="flex-1"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
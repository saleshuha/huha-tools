import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileTemplate } from '@/types/template';
import { useTemplates } from '@/hooks/useTemplates';
import { FileText, Calendar, Columns, Edit3, Plus, Trash2, Settings, Store } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TemplateSelectorProps {
  onTemplateSelect: (template: FileTemplate) => void;
  selectedTemplate: FileTemplate | null;
}

const TemplateEditor = ({ template, onSave }: { template: FileTemplate; onSave: (updated: FileTemplate) => void }) => {
  const [headers, setHeaders] = useState<string[]>([...template.headers]);
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [newHeader, setNewHeader] = useState('');

  const addHeader = () => {
    if (newHeader.trim()) {
      setHeaders([...headers, newHeader.trim()]);
      setNewHeader('');
    }
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setHeaders(newHeaders);
    
    // Remove default value for removed header
    const updatedDefaults = { ...defaultValues };
    delete updatedDefaults[headers[index]];
    setDefaultValues(updatedDefaults);
  };

  const updateDefaultValue = (header: string, value: string) => {
    setDefaultValues(prev => ({
      ...prev,
      [header]: value
    }));
  };

  const handleSave = () => {
    const updatedTemplate: FileTemplate = {
      ...template,
      headers,
      defaultValues
    };
    onSave(updatedTemplate);
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      {/* Add New Header */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Add New Header</h4>
        <div className="flex gap-2">
          <Input
            placeholder="Enter header name"
            value={newHeader}
            onChange={(e) => setNewHeader(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addHeader()}
          />
          <Button onClick={addHeader} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Headers and Default Values */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Headers & Default Values</h4>
        <div className="space-y-3">
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2 items-center p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">{header}</div>
                <Input
                  placeholder="Default value (optional)"
                  value={defaultValues[header] || ''}
                  onChange={(e) => updateDefaultValue(header, e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeHeader(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};

export const TemplateSelector = ({ onTemplateSelect, selectedTemplate }: TemplateSelectorProps) => {
  const { templates, loading, saveTemplate, deleteTemplate, getUniqueStores, refreshTemplates } = useTemplates();
  const [editingTemplate, setEditingTemplate] = useState<FileTemplate | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [newStoreName, setNewStoreName] = useState('');

  useEffect(() => {
    refreshTemplates(selectedStore === 'all' ? undefined : selectedStore);
  }, [selectedStore, refreshTemplates]);

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate(templateId, selectedStore === 'all' ? undefined : selectedStore);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stores = getUniqueStores();
  const filteredTemplates = selectedStore === 'all' 
    ? templates 
    : templates.filter(template => template.store_name === selectedStore);

  if (filteredTemplates.length === 0) {
    return (
      <div className="space-y-4">
        {/* Store Selection */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="font-medium">Store:</span>
          </div>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map(store => (
                <SelectItem key={store} value={store}>{store}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              placeholder="New store name"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="w-40"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (newStoreName.trim()) {
                  setSelectedStore(newStoreName.trim());
                  setNewStoreName('');
                }
              }}
            >
              Add Store
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
            <p className="text-muted-foreground">
              {selectedStore === 'all' 
                ? 'Upload some files to create templates, or contact support for pre-built templates.'
                : `No templates found for "${selectedStore}" store.`
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTemplateUpdate = async (updatedTemplate: FileTemplate) => {
    await saveTemplate(updatedTemplate.name, updatedTemplate.headers, updatedTemplate.file_type, updatedTemplate.store_name);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-4">
      {/* Store Selection */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4" />
          <span className="font-medium">Store:</span>
        </div>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map(store => (
              <SelectItem key={store} value={store}>{store}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            placeholder="New store name"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            className="w-40"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (newStoreName.trim()) {
                setSelectedStore(newStoreName.trim());
                setNewStoreName('');
              }
            }}
          >
            Add Store
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onTemplateSelect(template)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm line-clamp-1">{template.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {selectedTemplate?.id === template.id && (
                    <Badge variant="default" className="text-xs">Selected</Badge>
                  )}
                  <div className="flex gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplate(template);
                          }}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Template: {template.name}</DialogTitle>
                        </DialogHeader>
                        {editingTemplate && (
                          <TemplateEditor
                            template={editingTemplate}
                            onSave={handleTemplateUpdate}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Columns className="h-3 w-3" />
                  <span>{template.headers.length} columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>
                {template.store_name && (
                  <div className="flex items-center gap-2">
                    <Store className="h-3 w-3" />
                    <span>{template.store_name}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-2">
                <Button 
                  variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTemplateSelect(template);
                  }}
                >
                  {selectedTemplate?.id === template.id ? 'Selected' : 'Select Template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
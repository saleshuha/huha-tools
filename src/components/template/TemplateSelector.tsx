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
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>(template.defaultValues || {});
  const [newHeader, setNewHeader] = useState('');
  const [storeName, setStoreName] = useState(template.store_name || '');

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
      defaultValues,
      store_name: storeName.trim() || undefined
    };
    onSave(updatedTemplate);
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      {/* Store Name */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Store Name</h4>
        <Input
          placeholder="Enter store name (optional)"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
      </div>

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

const CreateNewTemplate = ({ onSave, selectedStore }: { onSave: (template: FileTemplate) => void; selectedStore?: string }) => {
  const [templateName, setTemplateName] = useState('');
  const [headers, setHeaders] = useState<string[]>(['']);
  const [storeName, setStoreName] = useState(selectedStore || '');
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});

  const addHeader = () => {
    setHeaders([...headers, '']);
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    const oldHeader = newHeaders[index];
    newHeaders[index] = value;
    setHeaders(newHeaders);
    
    // Update default values if header name changed
    if (oldHeader && oldHeader !== value && defaultValues[oldHeader]) {
      const newDefaults = { ...defaultValues };
      if (value.trim()) {
        newDefaults[value] = newDefaults[oldHeader];
      }
      delete newDefaults[oldHeader];
      setDefaultValues(newDefaults);
    }
  };

  const removeHeader = (index: number) => {
    if (headers.length > 1) {
      const headerToRemove = headers[index];
      setHeaders(headers.filter((_, i) => i !== index));
      
      // Remove default value for removed header
      if (headerToRemove && defaultValues[headerToRemove]) {
        const newDefaults = { ...defaultValues };
        delete newDefaults[headerToRemove];
        setDefaultValues(newDefaults);
      }
    }
  };

  const updateDefaultValue = (header: string, value: string) => {
    setDefaultValues(prev => ({
      ...prev,
      [header]: value
    }));
  };

  const handleSave = () => {
    if (!templateName.trim()) return;
    
    const filteredHeaders = headers.filter(h => h.trim() !== '');
    if (filteredHeaders.length === 0) return;

    const newTemplate: FileTemplate = {
      id: '',
      name: templateName.trim(),
      headers: filteredHeaders,
      file_type: templateName.trim(),
      created_at: new Date().toISOString(),
      store_name: storeName.trim() || undefined,
      defaultValues: defaultValues
    };
    
    onSave(newTemplate);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Template Name</label>
          <Input
            placeholder="Enter template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Store Name</label>
          <Input
            placeholder="Enter store name (optional)"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Headers & Default Values</label>
          <div className="space-y-3">
            {headers.map((header, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="flex gap-2">
                  <Input
                    placeholder={`Header ${index + 1}`}
                    value={header}
                    onChange={(e) => updateHeader(index, e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeHeader(index)}
                    disabled={headers.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {header.trim() && (
                  <Input
                    placeholder="Default value for all rows (optional)"
                    value={defaultValues[header] || ''}
                    onChange={(e) => updateDefaultValue(header, e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addHeader} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Header
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button 
          onClick={handleSave}
          disabled={!templateName.trim() || headers.filter(h => h.trim()).length === 0}
        >
          Create Template
        </Button>
      </div>
    </div>
  );
};

export const TemplateSelector = ({ onTemplateSelect, selectedTemplate }: TemplateSelectorProps) => {
  const { templates, loading, saveTemplate, deleteTemplate, getUniqueStores, addStore, refreshTemplates } = useTemplates();
  const [editingTemplate, setEditingTemplate] = useState<FileTemplate | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [newStoreName, setNewStoreName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [availableStores, setAvailableStores] = useState<string[]>([]);

  useEffect(() => {
    refreshTemplates(selectedStore === 'all' ? undefined : selectedStore);
  }, [selectedStore, refreshTemplates]);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const stores = await getUniqueStores();
        if (Array.isArray(stores)) {
          setAvailableStores(stores);
        } else {
          console.error('getUniqueStores did not return an array:', stores);
          setAvailableStores([]);
        }
      } catch (error) {
        console.error('Error loading stores:', error);
        setAvailableStores([]);
      }
    };
    loadStores();
  }, [getUniqueStores]);

  const handleDeleteTemplate = async (templateId: string) => {
    console.log('handleDeleteTemplate: Called with ID:', templateId, 'and store filter:', selectedStore);
    await deleteTemplate(templateId, selectedStore === 'all' ? undefined : selectedStore);
  };

  const handleTemplateUpdate = async (updatedTemplate: FileTemplate) => {
    try {
      await saveTemplate(updatedTemplate.name, updatedTemplate.headers, updatedTemplate.file_type, updatedTemplate.store_name, updatedTemplate.defaultValues);
      setEditingTemplate(null);
    } catch (error) {
      // Error already handled in saveTemplate
      console.error('Failed to update template:', error);
    }
  };

  const handleCreateTemplate = async (newTemplate: FileTemplate) => {
    try {
      await saveTemplate(newTemplate.name, newTemplate.headers, newTemplate.file_type, newTemplate.store_name, newTemplate.defaultValues);
      setShowCreateDialog(false);
      // Refresh stores list
      try {
        const stores = await getUniqueStores();
        if (Array.isArray(stores)) {
          setAvailableStores(stores);
        }
      } catch (error) {
        console.error('Error refreshing stores:', error);
      }
    } catch (error) {
      // Error already handled in saveTemplate
      console.error('Failed to create template:', error);
    }
  };

  const handleAddStore = async () => {
    if (newStoreName.trim()) {
      const success = await addStore(newStoreName.trim());
      if (success) {
        setSelectedStore(newStoreName.trim());
        setNewStoreName('');
        // Refresh stores list
        try {
          const stores = await getUniqueStores();
          if (Array.isArray(stores)) {
            setAvailableStores(stores);
          }
        } catch (error) {
          console.error('Error refreshing stores:', error);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stores = Array.isArray(availableStores) ? availableStores : [];
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
              onClick={handleAddStore}
            >
              Add Store
            </Button>
          </div>
        </div>

        {/* Create New Template Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">No Templates Found</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
              </DialogHeader>
              <CreateNewTemplate
                onSave={handleCreateTemplate}
                selectedStore={selectedStore === 'all' ? undefined : selectedStore}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {selectedStore === 'all' 
                ? 'Create a new template to get started.'
                : `No templates found for "${selectedStore}" store. Create one to get started.`
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            onClick={handleAddStore}
          >
            Add Store
          </Button>
        </div>
      </div>

      {/* Create New Template Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Select a Template</h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <CreateNewTemplate
              onSave={handleCreateTemplate}
              selectedStore={selectedStore === 'all' ? undefined : selectedStore}
            />
          </DialogContent>
        </Dialog>
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
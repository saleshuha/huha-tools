import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileTemplate } from '@/types/template';
import { useTemplates } from '@/hooks/useTemplates';
import { FileText, Calendar, Columns } from 'lucide-react';

interface TemplateSelectorProps {
  onTemplateSelect: (template: FileTemplate) => void;
  selectedTemplate: FileTemplate | null;
}

export const TemplateSelector = ({ onTemplateSelect, selectedTemplate }: TemplateSelectorProps) => {
  const { templates, loading } = useTemplates();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
          <p className="text-muted-foreground">
            Upload some files to create templates, or contact support for pre-built templates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
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
              {selectedTemplate?.id === template.id && (
                <Badge variant="default" className="text-xs">Selected</Badge>
              )}
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
            </div>

            <div className="mt-3">
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
  );
};
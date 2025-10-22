import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApiCodeBlock } from './ApiCodeBlock';
import { ExternalLink } from 'lucide-react';

interface ApiDocSectionProps {
  title: string;
  url: string;
  description?: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  resultFields?: {
    name: string;
    type: string;
    description: string;
  }[];
  exampleCode?: string;
  exampleResponse?: string;
  category?: 'product' | 'order' | 'account' | 'marketing';
}

const categoryColors = {
  product: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  order: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  account: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  marketing: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
};

export const ApiDocSection: React.FC<ApiDocSectionProps> = ({
  title,
  url,
  description,
  parameters,
  resultFields,
  exampleCode,
  exampleResponse,
  category = 'product'
}) => {
  return (
    <Card className="border-l-4" style={{
      borderLeftColor: category === 'product' ? 'hsl(var(--chart-1))' :
                       category === 'order' ? 'hsl(var(--chart-2))' :
                       category === 'account' ? 'hsl(var(--chart-3))' :
                       'hsl(var(--chart-4))'
    }}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{title}</CardTitle>
              <Badge className={categoryColors[category]} variant="outline">
                {category}
              </Badge>
            </div>
            <CardDescription className="font-mono text-xs bg-muted px-2 py-1 rounded inline-flex items-center gap-2">
              <ExternalLink className="h-3 w-3" />
              {url}
            </CardDescription>
          </div>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Parameters Section */}
        {parameters && parameters.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Parameters
            </h4>
            <div className="space-y-2 pl-3">
              {parameters.map((param, idx) => (
                <div key={idx} className="text-sm border-l-2 border-muted pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                      {param.name}
                    </code>
                    <Badge variant={param.required ? 'default' : 'secondary'} className="text-xs h-5">
                      {param.required ? 'required' : 'optional'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{param.type}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{param.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result Fields Section */}
        {resultFields && resultFields.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Response Fields
            </h4>
            <div className="space-y-2 pl-3">
              {resultFields.map((field, idx) => (
                <div key={idx} className="text-sm border-l-2 border-muted pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                      {field.name}
                    </code>
                    <span className="text-xs text-muted-foreground">{field.type}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{field.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Example Code Section */}
        {exampleCode && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Example Request
            </h4>
            <ApiCodeBlock code={exampleCode} language="typescript" />
          </div>
        )}

        {/* Example Response Section */}
        {exampleResponse && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Example Response
            </h4>
            <ApiCodeBlock code={exampleResponse} language="json" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

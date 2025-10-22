import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiCodeBlockProps {
  code: string;
  language?: 'json' | 'typescript' | 'java' | 'text';
  title?: string;
}

export const ApiCodeBlock: React.FC<ApiCodeBlockProps> = ({ 
  code, 
  language = 'json',
  title 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {title && (
        <div className="text-xs font-medium text-muted-foreground mb-2 px-4">
          {title}
        </div>
      )}
      <div className="relative rounded-lg bg-muted/50 border border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <pre className="overflow-x-auto p-4 text-sm">
          <code className={cn(
            "font-mono",
            language === 'json' && "text-blue-600 dark:text-blue-400",
            language === 'typescript' && "text-purple-600 dark:text-purple-400",
            language === 'java' && "text-orange-600 dark:text-orange-400"
          )}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, MousePointer, Save, Trash2, Eye, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CapturedSelector {
  id: string;
  css: string;
  xpath: string;
  tagName: string;
  text: string;
  timestamp: number;
  mapped?: string;
}

const AUTOMATION_FIELDS = [
  { key: 'usernameField', label: 'Username Field' },
  { key: 'passwordField', label: 'Password Field' },
  { key: 'loginButton', label: 'Login Button' },
  { key: 'importsMenu', label: 'Imports Menu' },
  { key: 'uploadMenu', label: 'Upload Menu' },
  { key: 'fileInput', label: 'File Input' },
  { key: 'uploadButton', label: 'Upload Button' },
  { key: 'successMessage', label: 'Success Message' },
  { key: 'errorMessage', label: 'Error Message' },
  { key: 'processingMessage', label: 'Processing Message' },
];

export const SelectorPicker = () => {
  const [capturedSelectors, setCapturedSelectors] = useState<CapturedSelector[]>([]);
  const [isBookmarkletActive, setIsBookmarkletActive] = useState(false);
  const { toast } = useToast();

  // Generate the bookmarklet code
  const generateBookmarklet = () => {
    const baseUrl = window.location.origin;
    const bookmarkletCode = `
javascript:(function(){
  let overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:999999;cursor:crosshair;';
  document.body.appendChild(overlay);
  
  let tooltip = document.createElement('div');
  tooltip.style.cssText = 'position:fixed;background:#000;color:#fff;padding:5px 10px;border-radius:4px;font-size:12px;z-index:1000000;pointer-events:none;display:none;';
  document.body.appendChild(tooltip);
  
  function getSelector(el) {
    let css = '';
    let xpath = '';
    
    // Generate CSS selector
    if (el.id) {
      css = '#' + el.id;
    } else if (el.className) {
      css = el.tagName.toLowerCase() + '.' + el.className.split(' ').join('.');
    } else {
      let path = [];
      while (el.parentNode) {
        let selector = el.tagName.toLowerCase();
        if (el.id) {
          selector += '#' + el.id;
          path.unshift(selector);
          break;
        } else if (el.className) {
          selector += '.' + el.className.split(' ').join('.');
        }
        let sibling = el;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.tagName === el.tagName) nth++;
        }
        if (nth > 1) selector += ':nth-of-type(' + nth + ')';
        path.unshift(selector);
        el = el.parentNode;
      }
      css = path.join(' > ');
    }
    
    // Generate XPath
    let xpathParts = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let count = 0;
      let sibling = current.parentNode ? current.parentNode.firstChild : null;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          count++;
          if (sibling === current) break;
        }
        sibling = sibling.nextSibling;
      }
      xpathParts.unshift(current.tagName.toLowerCase() + '[' + count + ']');
      current = current.parentNode;
    }
    xpath = '//' + xpathParts.join('/');
    
    return { css, xpath };
  }
  
  overlay.addEventListener('mousemove', function(e) {
    let target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== overlay && target !== tooltip) {
      target.style.outline = '2px solid #007bff';
      tooltip.style.display = 'block';
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY - 30 + 'px';
      tooltip.textContent = target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') + (target.className ? '.' + target.className.split(' ').join('.') : '');
    }
  });
  
  let lastHighlighted = null;
  overlay.addEventListener('mouseover', function(e) {
    if (lastHighlighted) lastHighlighted.style.outline = '';
    let target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== overlay && target !== tooltip) {
      lastHighlighted = target;
    }
  });
  
  overlay.addEventListener('click', function(e) {
    e.preventDefault();
    let target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== overlay && target !== tooltip) {
      let selectors = getSelector(target);
      let captureData = {
        css: selectors.css,
        xpath: selectors.xpath,
        tagName: target.tagName.toLowerCase(),
        text: target.textContent || target.value || '',
        timestamp: Date.now()
      };
      
      let params = new URLSearchParams(captureData);
      window.open('${baseUrl}/desktop-automation?capture=1&' + params.toString(), '_blank');
    }
    
    document.body.removeChild(overlay);
    document.body.removeChild(tooltip);
    if (lastHighlighted) lastHighlighted.style.outline = '';
  });
})();
    `.trim();
    
    return `data:text/html,<a href="${encodeURIComponent(bookmarkletCode)}">Element Picker</a>`;
  };

  // Handle URL parameters for captured selectors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('capture') === '1') {
      const capturedData: CapturedSelector = {
        id: Date.now().toString(),
        css: urlParams.get('css') || '',
        xpath: urlParams.get('xpath') || '',
        tagName: urlParams.get('tagName') || '',
        text: urlParams.get('text') || '',
        timestamp: parseInt(urlParams.get('timestamp') || '0'),
      };
      
      setCapturedSelectors(prev => [capturedData, ...prev]);
      
      // Clean URL
      window.history.replaceState({}, '', '/desktop-automation');
      
      toast({
        title: "Element Captured",
        description: "New selector has been captured and is ready for mapping.",
      });
    }
  }, [toast]);

  const copyBookmarklet = async () => {
    const bookmarkletCode = generateBookmarklet().replace('data:text/html,<a href="', '').replace('">Element Picker</a>', '');
    const decodedCode = decodeURIComponent(bookmarkletCode);
    
    try {
      await navigator.clipboard.writeText(decodedCode);
      toast({
        title: "Bookmarklet Copied",
        description: "Create a bookmark with this code to start selecting elements.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the bookmarklet code.",
        variant: "destructive",
      });
    }
  };

  const mapSelector = (selectorId: string, fieldKey: string) => {
    setCapturedSelectors(prev => 
      prev.map(sel => 
        sel.id === selectorId 
          ? { ...sel, mapped: fieldKey }
          : { ...sel, mapped: sel.mapped === fieldKey ? undefined : sel.mapped }
      )
    );
  };

  const deleteSelector = (selectorId: string) => {
    setCapturedSelectors(prev => prev.filter(sel => sel.id !== selectorId));
  };

  const saveToAutomationSettings = () => {
    const mappedSelectors = capturedSelectors
      .filter(sel => sel.mapped)
      .reduce((acc, sel) => {
        acc[sel.mapped!] = sel.css;
        return acc;
      }, {} as Record<string, string>);

    // Load existing config and update selectors
    const existingConfig = JSON.parse(localStorage.getItem('automation-config') || '{}');
    const updatedConfig = {
      ...existingConfig,
      selectors: {
        ...existingConfig.selectors,
        ...mappedSelectors,
      },
    };

    localStorage.setItem('automation-config', JSON.stringify(updatedConfig));
    
    toast({
      title: "Settings Updated",
      description: `${Object.keys(mappedSelectors).length} selectors saved to automation settings.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Element Picker Bookmarklet
          </CardTitle>
          <CardDescription>
            Use this bookmarklet to select elements on any webpage in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              <strong>How to use:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Copy the bookmarklet code below</li>
                <li>Create a new bookmark in your browser</li>
                <li>Paste the code as the bookmark URL</li>
                <li>Navigate to noon.partners and click the bookmark</li>
                <li>Click any element to capture its selector</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button onClick={copyBookmarklet} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Bookmarklet
            </Button>
          </div>
        </CardContent>
      </Card>

      {capturedSelectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Captured Selectors ({capturedSelectors.length})
            </CardTitle>
            <CardDescription>
              Map captured selectors to automation fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {capturedSelectors.map((selector) => (
              <div key={selector.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{selector.tagName}</Badge>
                      {selector.mapped && (
                        <Badge variant="default">
                          {AUTOMATION_FIELDS.find(f => f.key === selector.mapped)?.label}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(selector.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {selector.text && (
                      <p className="text-sm mb-2 p-2 bg-muted rounded">
                        Text: "{selector.text.substring(0, 100)}{selector.text.length > 100 ? '...' : ''}"
                      </p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-xs font-medium">CSS Selector:</Label>
                        <Input 
                          value={selector.css} 
                          readOnly 
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">XPath:</Label>
                        <Input 
                          value={selector.xpath} 
                          readOnly 
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSelector(selector.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Map to field:</Label>
                  <Select
                    value={selector.mapped || ""}
                    onValueChange={(value) => mapSelector(selector.id, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMATION_FIELDS.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={saveToAutomationSettings}
                disabled={!capturedSelectors.some(sel => sel.mapped)}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save to Automation Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
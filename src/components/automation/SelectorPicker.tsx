import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, MousePointer, Save, Trash2, Eye, Code, Globe, Play, Square, RefreshCw } from 'lucide-react';
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
  const [currentUrl, setCurrentUrl] = useState('https://login.noon.partners/');
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Live Element Picker Component
  const LiveElementPicker = () => {
    const [browserUrl, setBrowserUrl] = useState(currentUrl);
    const [canNavigate, setCanNavigate] = useState(true);

    const navigateToUrl = () => {
      if (iframeRef.current && browserUrl) {
        setIsLoading(true);
        setCurrentUrl(browserUrl);
        
        // Add picker script injection after iframe loads
        const iframe = iframeRef.current;
        
        // Set up error handling
        const handleLoad = () => {
          setIsLoading(false);
          if (isPickerActive) {
            injectPickerScript();
          }
        };
        
        const handleError = () => {
          setIsLoading(false);
          toast({
            title: "Failed to Load Website",
            description: "The website blocked iframe loading due to security restrictions. Use the bookmarklet method or try a different URL.",
            variant: "destructive",
          });
        };
        
        // Add timeout for slow loading
        const timeout = setTimeout(() => {
          if (isLoading) {
            setIsLoading(false);
            toast({
              title: "Loading Timeout",
              description: "The website is taking too long to load. This might be due to security restrictions.",
              variant: "destructive",
            });
          }
        }, 10000); // 10 second timeout
        
        iframe.onload = () => {
          clearTimeout(timeout);
          handleLoad();
        };
        
        iframe.onerror = () => {
          clearTimeout(timeout);
          handleError();
        };
        
        // Try to detect X-Frame-Options blocking
        iframe.src = browserUrl;
      }
    };

    const refreshPage = () => {
      if (iframeRef.current) {
        setIsLoading(true);
        iframeRef.current.src = iframeRef.current.src;
      }
    };

    const togglePicker = () => {
      setIsPickerActive(!isPickerActive);
      if (!isPickerActive) {
        injectPickerScript();
        toast({
          title: "Element Picker Activated",
          description: "Click on any element in the browser to capture it.",
        });
      } else {
        removePickerScript();
        toast({
          title: "Element Picker Deactivated",
          description: "Element selection mode disabled.",
        });
      }
    };

    const injectPickerScript = () => {
      if (!iframeRef.current) return;
      
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (!iframeDoc) {
          toast({
            title: "Cross-Origin Restriction",
            description: "Cannot access iframe content due to security restrictions. Use the bookmarklet method instead.",
            variant: "destructive",
          });
          return;
        }

        // Remove existing picker if any
        const existingOverlay = iframeDoc.querySelector('#element-picker-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Create picker overlay
        const overlay = iframeDoc.createElement('div');
        overlay.id = 'element-picker-overlay';
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(59, 130, 246, 0.1);
          z-index: 999999;
          cursor: crosshair;
          pointer-events: all;
        `;

        // Create tooltip
        const tooltip = iframeDoc.createElement('div');
        tooltip.id = 'element-picker-tooltip';
        tooltip.style.cssText = `
          position: fixed;
          background: #1f2937;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-family: monospace;
          z-index: 1000000;
          pointer-events: none;
          display: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        `;

        let lastHighlighted: HTMLElement | null = null;

        const getElementSelector = (element: HTMLElement) => {
          // Generate CSS selector
          let css = '';
          if (element.id) {
            css = '#' + element.id;
          } else if (element.className) {
            const classes = element.className.split(' ').filter(c => c.trim());
            css = element.tagName.toLowerCase() + (classes.length ? '.' + classes.join('.') : '');
          } else {
            // Generate path-based selector
            const path = [];
            let current = element;
            while (current && current !== iframeDoc.body) {
              let selector = current.tagName.toLowerCase();
              if (current.id) {
                selector += '#' + current.id;
                path.unshift(selector);
                break;
              } else if (current.className) {
                const classes = current.className.split(' ').filter(c => c.trim());
                if (classes.length) selector += '.' + classes.join('.');
              }
              
              // Add nth-child if necessary
              const siblings = Array.from(current.parentElement?.children || []);
              const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
              if (sameTagSiblings.length > 1) {
                const index = sameTagSiblings.indexOf(current) + 1;
                selector += `:nth-of-type(${index})`;
              }
              
              path.unshift(selector);
              current = current.parentElement as HTMLElement;
            }
            css = path.join(' > ');
          }

          // Generate XPath
          const getXPath = (el: HTMLElement): string => {
            if (el.id) return `//*[@id="${el.id}"]`;
            
            const parts = [];
            let current = el;
            while (current && current.nodeType === Node.ELEMENT_NODE && current !== iframeDoc.documentElement) {
              let part = current.tagName.toLowerCase();
              const siblings = Array.from(current.parentElement?.children || []);
              const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
              if (sameTagSiblings.length > 1) {
                const index = sameTagSiblings.indexOf(current) + 1;
                part += `[${index}]`;
              }
              parts.unshift(part);
              current = current.parentElement as HTMLElement;
            }
            return '//' + parts.join('/');
          };

          return {
            css,
            xpath: getXPath(element),
            tagName: element.tagName.toLowerCase(),
            text: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('value') || '',
            id: element.id || '',
            className: element.className || ''
          };
        };

        overlay.addEventListener('mousemove', (e) => {
          const target = iframeDoc.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          if (target && target !== overlay && target !== tooltip) {
            // Remove previous highlight
            if (lastHighlighted) {
              lastHighlighted.style.outline = '';
              lastHighlighted.style.backgroundColor = '';
            }

            // Highlight current element
            target.style.outline = '2px solid #3b82f6';
            target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            lastHighlighted = target;

            // Show tooltip
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY - 30) + 'px';
            
            const selectorInfo = getElementSelector(target);
            tooltip.textContent = `${selectorInfo.tagName}${selectorInfo.id ? '#' + selectorInfo.id : ''}${selectorInfo.className ? '.' + selectorInfo.className.split(' ').join('.') : ''}`;
          }
        });

        overlay.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const target = iframeDoc.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          if (target && target !== overlay && target !== tooltip) {
            const selectorData = getElementSelector(target);
            
            const capturedSelector: CapturedSelector = {
              id: Date.now().toString(),
              css: selectorData.css,
              xpath: selectorData.xpath,
              tagName: selectorData.tagName,
              text: selectorData.text,
              timestamp: Date.now(),
            };

            setCapturedSelectors(prev => [capturedSelector, ...prev]);
            
            toast({
              title: "Element Captured!",
              description: `Captured ${selectorData.tagName} element: ${selectorData.css}`,
            });

            // Visual feedback
            target.style.outline = '3px solid #10b981';
            target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
            setTimeout(() => {
              target.style.outline = '';
              target.style.backgroundColor = '';
            }, 1500);
          }
        });

        overlay.addEventListener('mouseleave', () => {
          if (lastHighlighted) {
            lastHighlighted.style.outline = '';
            lastHighlighted.style.backgroundColor = '';
          }
          tooltip.style.display = 'none';
        });

        iframeDoc.body.appendChild(overlay);
        iframeDoc.body.appendChild(tooltip);

      } catch (error) {
        console.error('Error injecting picker script:', error);
        toast({
          title: "Injection Failed",
          description: "Cannot inject element picker due to cross-origin restrictions. Try the bookmarklet method.",
          variant: "destructive",
        });
      }
    };

    const removePickerScript = () => {
      if (!iframeRef.current) return;
      
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          const overlay = iframeDoc.querySelector('#element-picker-overlay');
          const tooltip = iframeDoc.querySelector('#element-picker-tooltip');
          if (overlay) overlay.remove();
          if (tooltip) tooltip.remove();
          
          // Remove highlights from all elements
          const allElements = iframeDoc.querySelectorAll('*') as NodeListOf<HTMLElement>;
          allElements.forEach(el => {
            el.style.outline = '';
            el.style.backgroundColor = '';
          });
        }
      } catch (error) {
        console.log('Could not access iframe content for cleanup');
      }
    };

    return (
      <div className="space-y-4">
        {/* Browser Controls */}
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Input
              type="url"
              value={browserUrl}
              onChange={(e) => setBrowserUrl(e.target.value)}
              placeholder="Enter URL to navigate..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && navigateToUrl()}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={navigateToUrl}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              onClick={refreshPage}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={togglePicker}
              size="sm"
              variant={isPickerActive ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isPickerActive ? <Square className="h-4 w-4" /> : <MousePointer className="h-4 w-4" />}
              {isPickerActive ? 'Stop Picker' : 'Start Picker'}
            </Button>
          </div>
        </div>

        {/* Live Browser */}
        <div className="relative border-2 border-border rounded-lg overflow-hidden bg-background">
          <div className="h-[600px] w-full relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full border-0"
              title="Live Element Picker Browser"
              sandbox="allow-same-origin allow-scripts allow-forms allow-navigation"
            />
          </div>
        </div>

        {isPickerActive && (
          <Alert>
            <MousePointer className="h-4 w-4" />
            <AlertDescription>
              <strong>Element Picker Active:</strong> Hover over elements to highlight them, then click to capture their selectors.
              The picker will automatically generate CSS selectors and XPath for the clicked elements.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

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
    <Tabs defaultValue="live" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="live" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Live Browser Picker
        </TabsTrigger>
        <TabsTrigger value="bookmarklet" className="flex items-center gap-2">
          <Copy className="h-4 w-4" />
          Bookmarklet Method
        </TabsTrigger>
      </TabsList>

      <TabsContent value="live" className="space-y-6">
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Many websites (including noon.partners) block iframe embedding due to security policies. 
            If the browser fails to load, use the <strong>Bookmarklet Method</strong> tab instead for reliable element selection.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Live Element Picker Browser
            </CardTitle>
            <CardDescription>
              Browse websites in real-time and click elements to capture their selectors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveElementPicker />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bookmarklet" className="space-y-6">
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
      </TabsContent>

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
    </Tabs>
  );
};
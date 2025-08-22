import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Chrome, Trash2, Save, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutomationCapture } from '@/hooks/useAutomationCapture';
import { useAutomationConfig } from '@/hooks/useAutomationConfig';
import { supabase } from '@/integrations/supabase/client';

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
  const [accessToken, setAccessToken] = useState('');
  const { toast } = useToast();
  const { captureEvents, isLoading, mapElementToField, clearCaptureEvents } = useAutomationCapture();
  const { configs, saveConfig } = useAutomationConfig();

  const generateAccessToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        toast({
          title: "Access Token Generated",
          description: "Copy this token to the browser extension to connect"
        });
      } else {
        toast({
          title: "Error",
          description: "Please log in to generate an access token",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating access token:', error);
      toast({
        title: "Error",
        description: "Failed to generate access token",
        variant: "destructive"
      });
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(accessToken);
    toast({
      title: "Token Copied",
      description: "Access token copied to clipboard"
    });
  };

  const downloadExtension = () => {
    // Create a zip file with all extension files
    const extensionFiles = `
Please download the extension files from the project folder: /extension/
Then install it in your browser following the README instructions.
    `;
    
    const blob = new Blob([extensionFiles], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extension-instructions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Extension Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            Browser Extension Setup
          </CardTitle>
          <CardDescription>
            Install the companion browser extension to capture accurate element selectors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Chrome className="h-4 w-4" />
            <AlertDescription>
              <strong>Step 1:</strong> Download and install the Desktop Automation Companion extension from the project files.
              <br />
              <strong>Step 2:</strong> Generate an access token below and paste it into the extension popup.
              <br />
              <strong>Step 3:</strong> Navigate to noon.partners and start capturing elements.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={downloadExtension} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Extension Files
            </Button>
            <Button onClick={generateAccessToken} variant="outline" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Generate Access Token
            </Button>
          </div>

          {accessToken && (
            <div className="space-y-2">
              <Label>Access Token (paste this into the extension):</Label>
              <div className="flex gap-2">
                <Input 
                  value={accessToken} 
                  readOnly 
                  className="font-mono text-sm"
                  type="password"
                />
                <Button onClick={copyToken} variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Captured Elements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Captured Elements ({captureEvents.length})</CardTitle>
              <CardDescription>
                Real-time element captures from the browser extension
              </CardDescription>
            </div>
            <Button onClick={clearCaptureEvents} variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {captureEvents.length === 0 ? (
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                No elements captured yet. Install the browser extension, connect with your access token, and start capturing elements from noon.partners.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {captureEvents.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{event.tag}</Badge>
                          {event.mapped_field && (
                            <Badge className="bg-green-100 text-green-800">
                              Mapped to {event.mapped_field}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {event.inner_text && (
                          <p className="text-sm mb-2 p-2 bg-muted rounded">
                            Text: "{event.inner_text.substring(0, 100)}{event.inner_text.length > 100 ? '...' : ''}"
                          </p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <Label className="text-xs font-medium">CSS Selector:</Label>
                            <Input 
                              value={event.css || ''} 
                              readOnly 
                              className="mt-1 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">XPath:</Label>
                            <Input 
                              value={event.xpath || ''} 
                              readOnly 
                              className="mt-1 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Map to field:</Label>
                      <Select
                        value={event.mapped_field || ""}
                        onValueChange={(value) => mapElementToField(event.id, value)}
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
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
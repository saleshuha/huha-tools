import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy,
  Settings,
  HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';

export const QZTraySetup: React.FC = () => {
  const [qzInstalled, setQzInstalled] = useState(false);
  const [qzRunning, setQzRunning] = useState(false);
  const [websiteTrusted, setWebsiteTrusted] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkQZStatus();
  }, []);

  const checkQZStatus = async () => {
    setChecking(true);
    
    try {
      // Check if QZ Tray is available
      const qz = (window as any).qz;
      if (qz) {
        setQzInstalled(true);
        
        // Check if QZ Tray is running
        try {
          if (qz.websocket.isActive()) {
            setQzRunning(true);
          } else {
            await qz.websocket.connect();
            setQzRunning(true);
            setWebsiteTrusted(true); // If connection succeeds, website is trusted
          }
        } catch (error) {
          console.log('QZ Tray connection failed:', error);
          setQzRunning(false);
        }
      }
    } catch (error) {
      console.log('QZ Tray not available:', error);
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.protocol === 'http:';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          QZ Tray Setup & Trust Configuration
        </CardTitle>
        <p className="text-muted-foreground">
          Configure QZ Tray for secure label printing with our application
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status Check</TabsTrigger>
            <TabsTrigger value="install">Installation</TabsTrigger>
            <TabsTrigger value="trust">Trust Setup</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">System Status</h3>
              <Button 
                onClick={checkQZStatus} 
                disabled={checking}
                variant="outline"
                size="sm"
              >
                {checking ? 'Checking...' : 'Refresh Status'}
              </Button>
            </div>
            
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${qzInstalled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">QZ Tray Installed</span>
                </div>
                <Badge variant={qzInstalled ? 'default' : 'destructive'}>
                  {qzInstalled ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${qzRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">QZ Tray Running</span>
                </div>
                <Badge variant={qzRunning ? 'default' : 'destructive'}>
                  {qzRunning ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${websiteTrusted ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium">Website Trusted</span>
                </div>
                <Badge variant={websiteTrusted ? 'default' : 'secondary'}>
                  {websiteTrusted ? 'Yes' : 'Pending'}
                </Badge>
              </div>
            </div>

            {isDevelopment && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Development Mode Detected:</strong> You're running on localhost. 
                  QZ Tray will show security warnings for untrusted certificates in development.
                  This is normal and expected behavior.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="install" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">QZ Tray Installation</h3>
              
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Download QZ Tray
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Download and install QZ Tray from the official website
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer">
                        Download
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Installation Steps:</h4>
                  <ol className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>1. Download QZ Tray for your operating system</li>
                    <li>2. Run the installer with administrator privileges</li>
                    <li>3. Start QZ Tray after installation</li>
                    <li>4. Look for the QZ Tray icon in your system tray</li>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="trust" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Website Trust Configuration</h3>
              
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Follow these steps to make our website trusted by QZ Tray and avoid repeated permission requests.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Method 1: Allow in QZ Tray Popup</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. When QZ Tray shows a security dialog, click <strong>"Allow"</strong></p>
                    <p>2. Check the box <strong>"Remember this decision"</strong> before clicking Allow</p>
                    <p>3. Our website will be permanently trusted</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Method 2: Add to QZ Tray Whitelist</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Right-click the QZ Tray icon in your system tray</p>
                    <p>2. Select <strong>"Advanced"</strong> → <strong>"Site Manager"</strong></p>
                    <p>3. Click <strong>"Add Site"</strong> and enter our website URL:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="p-2 bg-muted rounded text-xs flex-1">
                        {window.location.origin}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(window.location.origin)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p>4. Set the trust level to <strong>"Allow"</strong></p>
                    <p>5. Click <strong>"Add"</strong> to save</p>
                  </div>
                </div>
                
                {isDevelopment && (
                  <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <h4 className="font-medium mb-3 text-yellow-800">Development Environment</h4>
                    <div className="space-y-2 text-sm text-yellow-700">
                      <p>You're in development mode. For production deployment:</p>
                      <p>• Ensure your website uses HTTPS</p>
                      <p>• Use a valid SSL certificate</p>
                      <p>• Consider code signing your QZ Tray integration</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="troubleshoot" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Common Issues & Solutions</h3>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    QZ Tray Not Found
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Ensure QZ Tray is installed and running</p>
                    <p>• Check system tray for QZ Tray icon</p>
                    <p>• Try restarting QZ Tray application</p>
                    <p>• Verify QZ Tray is not blocked by antivirus</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    Repeated Permission Requests
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Always check "Remember this decision" when allowing</p>
                    <p>• Add website to QZ Tray whitelist manually</p>
                    <p>• Clear QZ Tray cache and re-add website</p>
                    <p>• Ensure website URL is consistent (http vs https)</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    Certificate Warnings
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Normal behavior for localhost/development sites</p>
                    <p>• Use HTTPS with valid certificate for production</p>
                    <p>• Consider QZ Tray enterprise licensing for better security</p>
                    <p>• Contact support for custom certificate signing</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    Print Jobs Failing
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Verify printer is connected and online</p>
                    <p>• Check printer drivers are installed</p>
                    <p>• Test printing from other applications</p>
                    <p>• Ensure printer supports ZPL format (for Zebra printers)</p>
                  </div>
                </div>
              </div>
              
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Still having issues?</strong> Right-click QZ Tray icon → 
                  Advanced → Log Output to view detailed error messages.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
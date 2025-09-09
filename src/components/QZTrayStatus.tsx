import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Printer, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { useToast } from '@/hooks/use-toast';

export function QZTrayStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up connection listener
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        loadPrinters();
      } else {
        setPrinters([]);
        setError(null);
      }
    };

    qzConnectionManager.addConnectionListener(handleConnectionChange);

    // Initial connection attempt
    attemptConnection();
    
    return () => {
      qzConnectionManager.removeConnectionListener(handleConnectionChange);
    };
  }, []);

  const loadPrinters = async (showToast = false) => {
    if (!isConnected) {
      setPrinters([]);
      setError('Not connected to QZ Tray');
      return;
    }

    setIsLoadingPrinters(true);
    setError(null);
    
    try {
      const printerList = await qzConnectionManager.getPrinters();
      setPrinters(printerList);
      
      if (showToast) {
        toast({
          title: "Printers Refreshed",
          description: `Found ${printerList.length} printer(s)`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load printers:', error);
      setError(errorMessage);
      setPrinters([]);
      
      if (showToast) {
        toast({
          title: "Failed to Load Printers",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  const attemptConnection = async () => {
    setIsConnecting(true);
    try {
      const connected = await qzConnectionManager.connect();
      if (connected) {
        toast({
          title: "QZ Tray Connected",
          description: "Direct printing is now available"
        });
      }
    } catch (error) {
      // Silent connection attempt - don't show error toast for initial connection
      console.log('QZ Tray not available:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const connected = await qzConnectionManager.connect(true);
      if (connected) {
        toast({
          title: "QZ Tray Connected",
          description: "Direct printing is now available across all pages"
        });
      } else {
        toast({
          title: "QZ Tray Connection Failed",
          description: "Please ensure QZ Tray is running and try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const testPrint = async (printerName: string) => {
    try {
      const testZpl = `^XA
^CF0,30
^FO50,50^FDTest Print - ${new Date().toLocaleTimeString()}^FS
^FO50,100^FDPrinter: ${printerName}^FS
^XZ`;
      
      await qzConnectionManager.print(testZpl, printerName);
      toast({
        title: "Test Print Sent",
        description: `Test label sent to ${printerName}`,
      });
    } catch (error) {
      toast({
        title: "Test Print Failed", 
        description: "Could not send test print to printer",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-medium">QZ Tray Status</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="font-medium">QZ Tray Status</span>
            </>
          )}
        </div>
        
        <div className="flex gap-2">          
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            size="sm"
            className="gap-2"
            variant={isConnected ? "outline" : "default"}
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isConnecting ? 'Connecting...' : isConnected ? 'Reconnect' : 'Connect'}
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected & Ready
          </Badge>
        ) : (
          <Badge variant="outline" className="border-destructive/20 text-destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        )}
      </div>

      {/* Enhanced Status Display */}
      {isConnected && (
        <div className="space-y-4">
          {/* QZ Tray Status Section */}
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium text-success">QZ Tray Active</span>
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                  Connected
                </Badge>
              </div>
              <Button
                onClick={() => loadPrinters(true)}
                disabled={isLoadingPrinters}
                size="sm"
                variant="outline"
                className="gap-2 border-success/30 text-success hover:bg-success/10"
              >
                {isLoadingPrinters ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Status
              </Button>
            </div>
            
            {/* Printer Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Printers ({printers.length} found)</span>
                {isLoadingPrinters && (
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error.includes('TRUST_ERROR') ? (
                      <div className="space-y-2">
                        <p>QZ Tray blocked unsigned access.</p>
                        <p className="text-sm">
                          Click "Allow" in the QZ Tray popup and check "Remember this decision", then press Refresh Status.
                        </p>
                      </div>
                    ) : (
                      error
                    )}
                  </AlertDescription>
                </Alert>
              ) : printers.length > 0 ? (
                <div className="space-y-1">
                  {printers.map((printer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md border"
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{printer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                          Ready
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-2 text-xs"
                          onClick={() => testPrint(printer)}
                        >
                          Test Print
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No printers found. Make sure your printers are installed and accessible, then click Refresh Status.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Help */}
      {!isConnected && !isConnecting && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Make sure QZ Tray is running and click Connect to establish a connection.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
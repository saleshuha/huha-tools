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

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-medium">Connected</span>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                Active
              </Badge>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="font-medium">Disconnected</span>
              <Badge variant="outline" className="border-destructive/20 text-destructive">
                Offline
              </Badge>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          {isConnected && (
            <Button
              onClick={() => loadPrinters(true)}
              disabled={isLoadingPrinters}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isLoadingPrinters ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          )}
          
          <Button
            onClick={handleConnect}
            disabled={isConnecting || isConnected}
            size="sm"
            className="gap-2"
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
          </Button>
        </div>
      </div>

      {/* Printers List */}
      {isConnected && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span className="font-medium">Available Printers ({printers.length})</span>
            {isLoadingPrinters && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          ) : printers.length > 0 ? (
            <div className="space-y-1">
              {printers.map((printer, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-md"
                >
                  <Printer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{printer}</span>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No printers found. Make sure your printers are installed and accessible, then click Refresh.
              </AlertDescription>
            </Alert>
          )}
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
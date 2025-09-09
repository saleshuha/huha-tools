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
  const [printers, setPrinters] = useState<string[]>([]);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up connection listener
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        loadPrinters();
      } else {
        setPrinters([]);
      }
    };

    qzConnectionManager.addConnectionListener(handleConnectionChange);

    // Initial connection attempt
    attemptConnection();

    return () => {
      qzConnectionManager.removeConnectionListener(handleConnectionChange);
    };
  }, []);

  const loadPrinters = async () => {
    try {
      const printerList = await qzConnectionManager.getPrinters();
      setPrinters(printerList);
    } catch (error) {
      console.error('Failed to load printers:', error);
      setPrinters([]);
    }
  };

  const attemptConnection = async () => {
    setIsConnecting(true);
    try {
      const connected = await qzConnectionManager.connect();
      if (connected) {
        toast({
          title: "QZ Tray Connected",
          description: "Direct printing is now available",
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

  const handleTestConnection = async () => {
    setIsConnecting(true);
    const result = await qzConnectionManager.testConnection();
    setLastTestResult(result.message);
    
    if (result.success) {
      toast({
        title: "Connection Test Successful",
        description: result.message,
      });
    } else {
      toast({
        title: "Connection Test Failed",
        description: result.message,
        variant: "destructive"
      });
    }
    setIsConnecting(false);
  };

  const handleForceReconnect = async () => {
    setIsConnecting(true);
    try {
      const connected = await qzConnectionManager.connect(true); // Force reconnect
      if (connected) {
        toast({
          title: "Reconnected Successfully",
          description: "QZ Tray connection restored",
        });
      }
    } catch (error) {
      toast({
        title: "Reconnection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          QZ Tray Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <div className="font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-sm text-muted-foreground">
                {isConnected 
                  ? `Found ${printers.length} printer(s)` 
                  : 'QZ Tray not connected'}
              </div>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? 'Ready' : 'Not Ready'}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={attemptConnection} 
            disabled={isConnecting}
            variant={isConnected ? "outline" : "default"}
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isConnected ? 'Refresh' : 'Connect'}
          </Button>
          
          <Button 
            onClick={handleTestConnection} 
            disabled={isConnecting}
            variant="outline"
          >
            Test Connection
          </Button>

          {isConnected && (
            <Button 
              onClick={handleForceReconnect} 
              disabled={isConnecting}
              variant="outline"
            >
              Force Reconnect
            </Button>
          )}
        </div>

        {/* Printers List */}
        {isConnected && printers.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-sm">Available Printers:</div>
            <div className="space-y-1">
              {printers.map((printer, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Printer className="h-4 w-4" />
                  <span className="text-sm">{printer}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>To enable QZ Tray printing:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Download and install QZ Tray from <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">qz.io</a></li>
                  <li>Launch the QZ Tray application</li>
                  <li>Allow this website when prompted for security</li>
                  <li>Click "Connect" to establish connection</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Last Test Result */}
        {lastTestResult && (
          <div className="p-3 bg-muted rounded text-sm">
            <strong>Last Test:</strong> {lastTestResult}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
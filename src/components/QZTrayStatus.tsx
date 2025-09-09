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
          description: "Direct printing is now available across all pages",
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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}
        <span className="text-xs font-medium">
          {isConnected ? `QZ (${printers.length})` : 'QZ Disconnected'}
        </span>
      </div>
      
      {!isConnected && (
        <Button 
          size="sm"
          variant="outline" 
          onClick={handleConnect} 
          disabled={isConnecting}
          className="h-7 px-2 text-xs"
        >
          {isConnecting ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}
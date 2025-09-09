import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Printer, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { useToast } from '@/hooks/use-toast';

export function QZTrayStatusIndicator() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerCount, setPrinterCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      console.log('🔗 QZ Tray connection changed:', connected);
      setIsConnected(connected);
      if (connected) {
        loadPrinters();
      } else {
        setPrinterCount(0);
        setError(null);
      }
    };

    qzConnectionManager.addConnectionListener(handleConnectionChange);
    
    // Initial check and force load printers
    const checkInitialConnection = async () => {
      const connectionStatus = qzConnectionManager.getConnectionStatus();
      console.log('📊 Initial QZ Tray connection status:', connectionStatus);
      
      if (connectionStatus) {
        setIsConnected(true);
        await loadPrintersInitial();
      } else {
        // Try to connect silently
        try {
          const connected = await qzConnectionManager.connect();
          if (connected) {
            setIsConnected(true);
            await loadPrintersInitial();
          }
        } catch (error) {
          console.log('Silent connection attempt failed:', error);
        }
      }
    };
    
    checkInitialConnection();
    
    return () => {
      qzConnectionManager.removeConnectionListener(handleConnectionChange);
    };
  }, []);

  const loadPrintersInitial = async () => {
    try {
      console.log('🖨️ Loading printers (initial)...');
      const printerList = await qzConnectionManager.getPrinters();
      console.log('🖨️ Printers loaded:', printerList.length);
      setPrinterCount(printerList.length);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to load printers (initial):', error);
      setError(errorMessage);
      setPrinterCount(0);
    }
  };

  const loadPrinters = async () => {
    try {
      console.log('🖨️ Loading printers...');
      const printerList = await qzConnectionManager.getPrinters();
      console.log('🖨️ Printers loaded:', printerList.length);
      setPrinterCount(printerList.length);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to load printers:', error);
      setError(errorMessage);
      setPrinterCount(0);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const connected = await qzConnectionManager.connect(true);
      if (connected) {
        toast({
          title: "QZ Tray Connected",
          description: "Direct printing is now available"
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Please ensure QZ Tray is running",
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

  const getStatusTooltip = () => {
    if (isConnecting) return "Connecting to QZ Tray...";
    if (!isConnected) return "QZ Tray disconnected - Click to connect";
    if (error) return `QZ Tray connected but error: ${error}`;
    return `QZ Tray connected - ${printerCount} printer(s) available`;
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting}
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isConnected ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getStatusTooltip()}</p>
        </TooltipContent>
      </Tooltip>

      {isConnected && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className="h-5 px-1.5 text-xs bg-success/10 text-success border-success/20 gap-1"
            >
              <Printer className="h-3 w-3" />
              {printerCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{printerCount} printer(s) available</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
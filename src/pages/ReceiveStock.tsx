import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package, PlayCircle, StopCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { useStockReceiving, type ReceivingItem, type ProcessingResult } from '@/hooks/useStockReceiving';
import { ItemScanner } from '@/components/stock-receiving/ItemScanner';
import { AllocationPanel } from '@/components/stock-receiving/AllocationPanel';
import { SessionHistory } from '@/components/stock-receiving/SessionHistory';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function ReceiveStock() {
  usePageTracking({
    category: 'Inventory',
    subcategory: 'Stock Receiving',
    pageTitle: 'Receive Stock'
  });

  const {
    sessions,
    currentSession,
    isProcessing,
    loading,
    createSession,
    processItems,
    endSession,
    loadSessions,
    testConnection
  } = useStockReceiving();

  const [pendingItems, setPendingItems] = useState<ReceivingItem[]>([]);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    error: string | null;
    details?: string;
    checking: boolean;
  }>({ connected: false, error: null, checking: true });

  useEffect(() => {
    loadSessions();
    
    // Check edge function connection
    const checkConnection = async () => {
      setConnectionStatus(prev => ({ ...prev, checking: true }));
      const result = await testConnection();
      setConnectionStatus({
        connected: result.connected,
        error: result.error,
        details: result.details,
        checking: false
      });
    };
    
    checkConnection();
  }, []);

  const handleStartSession = async () => {
    const session = await createSession();
    if (session) {
      setPendingItems([]);
      setProcessingResults([]);
    }
  };

  const handleEndSession = async () => {
    if (currentSession) {
      await endSession(currentSession.id);
      setPendingItems([]);
      setProcessingResults([]);
    }
  };

  const handleAddItem = (item: ReceivingItem) => {
    setPendingItems([...pendingItems, item]);
  };

  const handleProcessQueue = async () => {
    if (pendingItems.length === 0) return;

    try {
      const results = await processItems(
        pendingItems,
        true,
        currentSession?.id
      );
      
      setProcessingResults(results);
      
      // Clear queue after successful processing
      if (results.every(r => r.success)) {
        setTimeout(() => {
          setPendingItems([]);
          setProcessingResults([]);
        }, 3000);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  };

  const handleClearQueue = () => {
    setPendingItems([]);
    setProcessingResults([]);
  };

  const retryConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, checking: true }));
    const result = await testConnection();
    setConnectionStatus({
      connected: result.connected,
      error: result.error,
      details: result.details,
      checking: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 space-y-6 animate-fade-in">
        <HuhaHeader01
          icon={<Package className="w-5 h-5 text-primary-foreground" />}
          title="Smart Stock Receiving"
          subtitle="Universal inventory receiving with intelligent PO matching and fulfillment"
        />

        {/* Connection Status Alert */}
        {connectionStatus.checking ? (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Checking Connection</AlertTitle>
            <AlertDescription>
              Verifying edge function availability...
            </AlertDescription>
          </Alert>
        ) : !connectionStatus.connected ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Edge Function Not Available</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="font-semibold">{connectionStatus.error}</p>
              {connectionStatus.details && (
                <p className="text-sm mt-1">{connectionStatus.details}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={retryConnection}
                >
                  Retry Connection
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  asChild
                >
                  <a 
                    href="https://supabase.com/dashboard/project/vfqqlifvhooefxvvyebm/functions" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    View Functions Dashboard
                  </a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">
              Edge Function Connected
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Smart stock receiving system is ready
            </AlertDescription>
          </Alert>
        )}

        {/* Active Session Card */}
        {currentSession ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="animate-pulse">Active Session</Badge>
                    <span className="text-sm text-muted-foreground">
                      Started: {new Date(currentSession.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Items:</span>{' '}
                      <span className="font-medium">{currentSession.total_items_received}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To POs:</span>{' '}
                      <span className="font-medium">{currentSession.items_allocated_to_pos}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To Inv:</span>{' '}
                      <span className="font-medium">{currentSession.items_added_to_inventory}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={handleEndSession}>
                  <StopCircle className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  No active receiving session
                </div>
                <Button onClick={handleStartSession}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start New Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Scanner and Queue */}
          <div className="lg:col-span-2 space-y-6">
            <ItemScanner 
              onScanComplete={handleAddItem}
              disabled={!currentSession || isProcessing}
            />
            
            <AllocationPanel
              items={pendingItems}
              results={processingResults}
              onProcess={handleProcessQueue}
              onClear={handleClearQueue}
              isProcessing={isProcessing}
            />
          </div>

          {/* Right Column: History */}
          <div>
            <SessionHistory 
              sessions={sessions}
              onEndSession={endSession}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

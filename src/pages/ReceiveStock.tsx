import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, PlayCircle, StopCircle } from 'lucide-react';
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

  useEffect(() => {
    loadSessions();
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


  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 space-y-6 animate-fade-in">
        <HuhaHeader01
          icon={<Package className="w-5 h-5 text-primary-foreground" />}
          title="Smart Stock Receiving"
          subtitle="Universal inventory receiving with intelligent PO matching and fulfillment"
        />


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

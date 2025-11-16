import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Eye, CheckCircle, Package, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { ReceivingSession } from '@/hooks/useStockReceiving';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { LabelPrintButton } from './LabelPrintButton';

interface SessionHistoryProps {
  sessions: ReceivingSession[];
  onEndSession?: (sessionId: string) => void;
}

export function SessionHistory({ sessions, onEndSession }: SessionHistoryProps) {
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = useState<ReceivingSession | null>(null);
  const [sessionItems, setSessionItems] = useState<any[]>([]);
  const [sessionPOs, setSessionPOs] = useState<any[]>([]);
  const [sessionInventory, setSessionInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Prepare printable items from inventory
  const printableItems = sessionInventory.map(inv => {
    // Find the original session item that created this inventory record
    const sessionItem = sessionItems.find(item => item.serial_number === inv.serial_number);
    
    // Extract PO numbers and priority if available
    const poNumbers = sessionItem?.matched_pos?.map((po: any) => po.po_number).filter(Boolean).join(', ') || '';
    const priority = sessionItem?.matched_pos && sessionItem.matched_pos.length > 0
      ? Math.min(...sessionItem.matched_pos.map((po: any) => po.priority || 3))
      : undefined;
    
    return {
      inventory_id: inv.id,
      asin: inv.asin,
      sku: inv.sku,
      title: inv.title,
      quantity: inv.quantity,
      serial_number: inv.serial_number,
      po_numbers: poNumbers,
      priority
    };
  });

  const loadSessionDetails = async (session: ReceivingSession) => {
    setLoading(true);
    setSelectedSession(session);
    
    try {
      // Load session items
      const { data: items, error: itemsError } = await supabase
        .from('stock_receiving_items')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      setSessionItems(items || []);

      // Load POs that were fulfilled during this session
      // Since we don't have a direct session_id on fulfillment_history,
      // we'll load based on items processed in this session
      const sessionItemsData = items || [];
      const poNumbers = sessionItemsData
        .flatMap((item: any) => item.matched_pos || [])
        .map((po: any) => po.po_number)
        .filter(Boolean);

      if (poNumbers.length > 0) {
        const { data: poData, error: poError } = await supabase
          .from('po_orders')
          .select('id, po_number, status, supplier_name, quantity')
          .in('po_number', poNumbers);

        if (!poError && poData) {
          setSessionPOs(poData);
        }
      } else {
        setSessionPOs([]);
      }

      // Load inventory items created in this session
      // Match by serial numbers from session items
      const serialNumbers = sessionItemsData
        .map((item: any) => item.serial_number)
        .filter(Boolean);

      if (serialNumbers.length > 0) {
        const { data: invData, error: invError } = await supabase
          .from('asin_inventory')
          .select('*')
          .in('serial_number', serialNumbers);

        if (!invError && invData) {
          setSessionInventory(invData);
        }
      } else {
        setSessionInventory([]);
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Receiving Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No receiving sessions yet
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {format(new Date(session.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {getStatusBadge(session.status)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadSessionDetails(session)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Received:</span>{' '}
                      <span className="font-medium">{session.total_items_received}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To POs:</span>{' '}
                      <span className="font-medium">{session.items_allocated_to_pos}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To Inv:</span>{' '}
                      <span className="font-medium">{session.items_added_to_inventory}</span>
                    </div>
                  </div>

                  {session.status === 'in_progress' && onEndSession && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEndSession(session.id)}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        End Session
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Session Details - {selectedSession && format(new Date(selectedSession.created_at), 'MMM dd, yyyy HH:mm')}
            </DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedSession?.total_items_received}</div>
                    <div className="text-sm text-muted-foreground">Items Received</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedSession?.items_allocated_to_pos}</div>
                    <div className="text-sm text-muted-foreground">Allocated to POs</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedSession?.items_added_to_inventory}</div>
                    <div className="text-sm text-muted-foreground">Added to Inventory</div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Action Buttons */}
              {(sessionPOs.length > 0 || sessionInventory.length > 0) && (
                <div className="flex gap-2 pb-4 border-b">
                  {printableItems.length > 0 && (
                    <LabelPrintButton 
                      receivedItems={printableItems}
                      variant="default"
                      size="sm"
                    />
                  )}
                  {sessionPOs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/po-tracker')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View {sessionPOs.length} Fulfilled PO{sessionPOs.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                  {sessionInventory.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/inventory')}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      View {sessionInventory.length} Inventory Item{sessionInventory.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              )}

              {/* POs Fulfilled */}
              {sessionPOs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Purchase Orders Fulfilled
                  </h3>
                  <div className="space-y-2">
                    {sessionPOs.map((po, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-success/5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{po.po_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {po.supplier_name} • Qty: {po.quantity}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/po-tracker?po=${po.po_number}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory Items Added */}
              {sessionInventory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Inventory Items Added
                  </h3>
                  <div className="space-y-2">
                    {sessionInventory.map((inv, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-primary/5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{inv.asin || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">
                              Qty: {inv.quantity} • Serial: {inv.serial_number?.substring(0, 20)}...
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/inventory?id=${inv.id}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Items */}
              <div className="space-y-2">
                <h3 className="font-medium">All Items Processed</h3>
                {sessionItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        {item.asin || item.sku_code || item.model_number}
                      </div>
                      <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Title: {item.title || 'N/A'}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>Received: {item.quantity_received}</div>
                        <div>To POs: {item.quantity_allocated_to_pos}</div>
                        <div>To Inv: {item.quantity_added_to_inventory}</div>
                      </div>
                      {item.supplier_name && (
                        <div className="text-muted-foreground">Supplier: {item.supplier_name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

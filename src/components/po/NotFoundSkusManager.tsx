import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, Trash2, RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NotFoundSku {
  id: string;
  model_number: string;
  search_attempts: number;
  last_search_date: string;
  notes?: string;
}

interface NotFoundSkusManagerProps {
  userId: string;
  onRefresh?: () => void;
}

export const NotFoundSkusManager: React.FC<NotFoundSkusManagerProps> = ({ userId, onRefresh }) => {
  const [notFoundSkus, setNotFoundSkus] = useState<NotFoundSku[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSkip, setAutoSkip] = useState(true);
  const [recheckDays, setRecheckDays] = useState(30);
  const { toast } = useToast();

  useEffect(() => {
    loadNotFoundSkus();
    loadPreferences();
  }, [userId]);

  const loadNotFoundSkus = async () => {
    try {
      setIsLoading(true);
      let allRecords: NotFoundSku[] = [];
      const batchSize = 1000;
      let currentBatch = 0;
      let hasMore = true;

      // Fetch records in batches until we get all of them
      while (hasMore) {
        const start = currentBatch * batchSize;
        const end = start + batchSize - 1;

        const { data, error } = await supabase
          .from('sunsky_not_found_skus')
          .select('*')
          .eq('user_id', userId)
          .order('last_search_date', { ascending: false })
          .range(start, end);

        if (error) throw error;

        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          currentBatch++;
          
          // If we got fewer records than the batch size, we've reached the end
          if (data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setNotFoundSkus(allRecords);
      console.log(`Loaded ${allRecords.length} not found SKUs in ${currentBatch} batches`);
    } catch (error) {
      console.error('Error loading not found SKUs:', error);
      toast({
        title: "Error",
        description: "Failed to load not found SKUs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sunsky_skip_not_found, sunsky_recheck_after_days')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setAutoSkip(data.sunsky_skip_not_found ?? true);
        setRecheckDays(data.sunsky_recheck_after_days ?? 30);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const updatePreference = async (key: 'sunsky_skip_not_found' | 'sunsky_recheck_after_days', value: boolean | number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', userId);

      if (error) throw error;
      
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved"
      });

      if (key === 'sunsky_skip_not_found') {
        setAutoSkip(value as boolean);
      } else {
        setRecheckDays(value as number);
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    }
  };

  const deleteNotFoundSku = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sunsky_not_found_skus')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadNotFoundSkus();
      toast({
        title: "Deleted",
        description: "Item removed from skip list"
      });
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting not found SKU:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const clearAllNotFound = async () => {
    if (!confirm('Are you sure you want to clear all not found items? This will allow them to be searched again.')) {
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('sunsky_not_found_skus')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      
      await loadNotFoundSkus();
      toast({
        title: "Cleared",
        description: "All not found items have been removed"
      });
      onRefresh?.();
    } catch (error) {
      console.error('Error clearing not found SKUs:', error);
      toast({
        title: "Error",
        description: "Failed to clear items",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportNotFoundList = () => {
    const csv = [
      ['Model Number', 'Search Attempts', 'Last Search Date', 'Notes'].join(','),
      ...notFoundSkus.map(sku => [
        sku.model_number,
        sku.search_attempts,
        new Date(sku.last_search_date).toLocaleDateString(),
        sku.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `not-found-skus-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Not found items exported to CSV"
    });
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Not Found SKU Management
          </CardTitle>
          <CardDescription>
            Automatically skip SKUs that were previously not found in Sunsky catalog
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-container p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Not Found</div>
              <div className="text-2xl font-bold text-primary">{notFoundSkus.length}</div>
            </div>
            <div className="glass-container p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Auto-Skip Status</div>
              <Badge variant={autoSkip ? "default" : "secondary"}>
                {autoSkip ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="glass-container p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Recheck After</div>
              <div className="text-2xl font-bold text-primary">{recheckDays} days</div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-container rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="auto-skip">Auto-skip not found items</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically skip SKUs that were previously not found
                </div>
              </div>
              <Switch
                id="auto-skip"
                checked={autoSkip}
                onCheckedChange={(checked) => updatePreference('sunsky_skip_not_found', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 glass-container rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="recheck-days">Re-check after</Label>
                <div className="text-sm text-muted-foreground">
                  Retry searching for items after this many days
                </div>
              </div>
              <Select
                value={recheckDays.toString()}
                onValueChange={(value) => updatePreference('sunsky_recheck_after_days', parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Ban className="w-4 h-4 mr-2" />
                  View Not Found Items ({notFoundSkus.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Not Found Items</DialogTitle>
                  <DialogDescription>
                    SKUs that were not found in Sunsky catalog
                  </DialogDescription>
                </DialogHeader>
                
                {notFoundSkus.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No not found items. All your SKUs have been successfully found or haven't been searched yet.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model Number</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Last Searched</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notFoundSkus.map((sku) => (
                        <TableRow key={sku.id}>
                          <TableCell className="font-mono">{sku.model_number}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{sku.search_attempts}x</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(sku.last_search_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNotFoundSku(sku.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={exportNotFoundList}
              disabled={notFoundSkus.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

            <Button
              variant="destructive"
              onClick={clearAllNotFound}
              disabled={notFoundSkus.length === 0 || isLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

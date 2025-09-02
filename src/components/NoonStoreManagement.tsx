import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Plus } from 'lucide-react';
import { useNoonStores } from '@/hooks/useNoonStores';
import { AddStoreDialog } from './AddStoreDialog';

interface NoonStoreManagementProps {
  selectedStoreId: string;
  onStoreChange: (storeId: string) => void;
}

export function NoonStoreManagement({ 
  selectedStoreId, 
  onStoreChange
}: NoonStoreManagementProps) {
  const { stores, loading: storesLoading, refreshStores } = useNoonStores();
  const [showAddStoreDialog, setShowAddStoreDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Store className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Noon Store Management</h2>
        </div>
        <Button onClick={() => setShowAddStoreDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Store
        </Button>
      </div>

      {/* Store Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Store Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {storesLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading stores...
              </div>
            ) : stores.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No stores configured. Add your first store to get started.
              </div>
            ) : (
              stores.map((store) => (
                <Card 
                  key={store.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedStoreId === store.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onStoreChange(store.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      {store.name}
                      <Badge variant="outline">{store.country}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Partner ID: {store.partner_id}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {store.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddStoreDialog 
        open={showAddStoreDialog}
        onOpenChange={setShowAddStoreDialog}
        onStoreAdded={refreshStores}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Store, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NoonStore {
  id: string;
  name: string;
  partner_id: string | null;
  country: string;
  created_at: string;
}

export function NoonStoresManager() {
  const [stores, setStores] = useState<NoonStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStore, setNewStore] = useState({
    name: '',
    partner_id: '',
    country: 'UAE'
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('noon_stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async () => {
    if (!newStore.name.trim()) {
      toast.error('Store name is required');
      return;
    }

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to add stores');
        return;
      }

      const { data, error } = await supabase
        .from('noon_stores')
        .insert([{
          user_id: user.id,
          name: newStore.name,
          partner_id: newStore.partner_id || null,
          country: newStore.country
        }])
        .select()
        .single();

      if (error) throw error;

      setStores([data, ...stores]);
      setNewStore({ name: '', partner_id: '', country: 'UAE' });
      toast.success('Store added successfully');
    } catch (error: any) {
      console.error('Error adding store:', error);
      if (error.code === '23505') {
        toast.error('A store with this partner ID already exists in this country');
      } else {
        toast.error('Failed to add store');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('noon_stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      setStores(stores.filter(store => store.id !== storeId));
      toast.success('Store deleted successfully');
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Noon Stores Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading stores...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Store */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Noon Store
          </CardTitle>
          <CardDescription>
            Add your Noon.com stores with their partner IDs to track orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                placeholder="e.g., My Noon Store UAE"
                value={newStore.name}
                onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partnerId">Partner ID</Label>
              <Input
                id="partnerId"
                placeholder="e.g., 123456"
                value={newStore.partner_id}
                onChange={(e) => setNewStore({ ...newStore, partner_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select 
                value={newStore.country} 
                onValueChange={(value) => setNewStore({ ...newStore, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAE">UAE</SelectItem>
                  <SelectItem value="KSA">Saudi Arabia</SelectItem>
                  <SelectItem value="EGY">Egypt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleAddStore} 
            disabled={isAdding || !newStore.name.trim()}
            className="w-full md:w-auto"
          >
            {isAdding ? 'Adding...' : 'Add Store'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Stores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Your Noon Stores ({stores.length})
          </CardTitle>
          <CardDescription>
            Manage your existing Noon.com stores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stores.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No stores added yet. Add your first Noon store above to start tracking orders.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{store.name}</h3>
                      <Badge variant="outline">{store.country}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {store.partner_id ? (
                        <span>Partner ID: {store.partner_id}</span>
                      ) : (
                        <span>No Partner ID</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Added: {new Date(store.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteStore(store.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

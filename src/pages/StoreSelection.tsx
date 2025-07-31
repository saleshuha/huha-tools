import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Store as StoreIcon, MapPin, Edit2, Trash2, BarChart3, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Store, CreateStore } from "@/types/store";

const countries = [
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR' }
];

export default function StoreSelection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [newStore, setNewStore] = useState<CreateStore>({
    name: '',
    location: '',
    description: '',
    currency: 'AED',
    country: 'UAE',
    is_active: true
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStores((data || []) as Store[]);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Error",
        description: "Failed to fetch stores",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStore = async () => {
    if (!newStore.name.trim()) {
      toast({
        title: "Error",
        description: "Store name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("stores")
        .insert([{
          ...newStore,
          user_id: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store created successfully",
      });

      setIsDialogOpen(false);
      setNewStore({
        name: '',
        location: '',
        description: '',
        currency: 'AED',
        country: 'UAE',
        is_active: true
      });
      fetchStores();
    } catch (error) {
      console.error("Error creating store:", error);
      toast({
        title: "Error",
        description: "Failed to create store",
        variant: "destructive",
      });
    }
  };

  const handleEditStore = async () => {
    if (!editingStore || !editingStore.name.trim()) {
      toast({
        title: "Error",
        description: "Store name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("stores")
        .update({
          name: editingStore.name,
          location: editingStore.location,
          description: editingStore.description,
          currency: editingStore.currency,
          country: editingStore.country,
        })
        .eq("id", editingStore.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store updated successfully",
      });

      setEditingStore(null);
      fetchStores();
    } catch (error) {
      console.error("Error updating store:", error);
      toast({
        title: "Error",
        description: "Failed to update store",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from("stores")
        .update({ is_active: false })
        .eq("id", storeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store deactivated successfully",
      });

      fetchStores();
    } catch (error) {
      console.error("Error deactivating store:", error);
      toast({
        title: "Error",
        description: "Failed to deactivate store",
        variant: "destructive",
      });
    }
  };

  const handleStoreSelect = (store: Store) => {
    // Navigate to Carrefour payments with store ID
    navigate(`/carrefour-payments/${store.id}`);
  };

  const getCountryInfo = (countryCode: string) => {
    return countries.find(c => c.code === countryCode) || countries[0];
  };

  if (isLoading) {
    return <div className="container mx-auto py-6 text-center">Loading stores...</div>;
  }

  return (
    <div className="w-full max-w-none px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <StoreIcon className="h-8 w-8 text-primary" />
            Store Management
            <Badge variant="secondary" className="text-xs">
              Multi-Store
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your stores and access their sales data
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              Add New Store
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Store</DialogTitle>
              <DialogDescription>
                Add a new store to manage its sales data separately.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Store Name *</label>
                <Input
                  placeholder="Enter store name"
                  value={newStore.name}
                  onChange={(e) => setNewStore(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="Store location"
                  value={newStore.location}
                  onChange={(e) => setNewStore(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Country</label>
                <Select
                  value={newStore.country}
                  onValueChange={(value) => {
                    const country = getCountryInfo(value);
                    setNewStore(prev => ({ 
                      ...prev, 
                      country: value,
                      currency: country.currency 
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Store description (optional)"
                  value={newStore.description}
                  onChange={(e) => setNewStore(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateStore}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Create Store
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stores Grid */}
      {stores.length === 0 ? (
        <div className="text-center py-12">
          <StoreIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Stores Found</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first store to start tracking sales data.</p>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Store
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => {
            const countryInfo = getCountryInfo(store.country);
            return (
              <Card 
                key={store.id} 
                className="cursor-pointer hover:shadow-lg transition-all border-slate-200 hover:border-emerald-300 group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <StoreIcon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{store.name}</CardTitle>
                        {store.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {store.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {countryInfo.flag} {store.currency}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {store.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {store.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStore(store);
                        }}
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        <Edit2 className="h-3 w-3 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStore(store.id);
                        }}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                    
                    <Button
                      onClick={() => handleStoreSelect(store)}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      size="sm"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View Sales Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Store Dialog */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>
              Update store information.
            </DialogDescription>
          </DialogHeader>
          
          {editingStore && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Store Name *</label>
                <Input
                  placeholder="Enter store name"
                  value={editingStore.name}
                  onChange={(e) => setEditingStore(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="Store location"
                  value={editingStore.location || ''}
                  onChange={(e) => setEditingStore(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Country</label>
                <Select
                  value={editingStore.country}
                  onValueChange={(value) => {
                    const country = getCountryInfo(value);
                    setEditingStore(prev => prev ? ({ 
                      ...prev, 
                      country: value,
                      currency: country.currency 
                    }) : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Store description (optional)"
                  value={editingStore.description || ''}
                  onChange={(e) => setEditingStore(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingStore(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditStore}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Update Store
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
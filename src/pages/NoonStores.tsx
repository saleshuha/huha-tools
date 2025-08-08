import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Edit, Trash2, ArrowLeft, MapPin, Building } from "lucide-react";
import { Link } from "react-router-dom";

interface NoonStore {
  id: string;
  name: string;
  location?: string;
  description?: string;
  currency: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function NoonStores() {
  const [stores, setStores] = useState<NoonStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<NoonStore | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: ""
  });
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('platform', 'noon')
        .eq('country', selectedCountry)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast({
        title: "Error loading stores",
        description: "Failed to load stores from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Store name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingStore) {
        // Update existing store
        const { error } = await supabase
          .from('stores')
          .update({
            name: formData.name.trim(),
            location: formData.location.trim() || null,
            description: formData.description.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingStore.id);

        if (error) throw error;

        toast({
          title: "Store updated",
          description: "Store has been updated successfully"
        });
      } else {
        // Create new store
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('stores')
          .insert({
            name: formData.name.trim(),
            location: formData.location.trim() || null,
            description: formData.description.trim() || null,
            platform: 'noon',
            country: selectedCountry,
            currency: selectedCountry === 'UAE' ? 'AED' : 'SAR',
            user_id: user.id
          });

        if (error) throw error;

        toast({
          title: "Store created",
          description: "New Noon store has been created successfully"
        });
      }

      // Reset form and reload stores
      setFormData({ name: "", location: "", description: "" });
      setShowAddDialog(false);
      setEditingStore(null);
      await loadStores();
    } catch (error) {
      console.error('Error saving store:', error);
      toast({
        title: "Error",
        description: "Failed to save store",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (store: NoonStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      location: store.location || "",
      description: store.description || ""
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (store: NoonStore) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', store.id);

      if (error) throw error;

      toast({
        title: "Store deleted",
        description: "Store has been deleted successfully"
      });

      await loadStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast({
        title: "Error",
        description: "Failed to delete store",
        variant: "destructive"
      });
    }
  };

  const toggleStoreStatus = async (store: NoonStore) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          is_active: !store.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', store.id);

      if (error) throw error;

      toast({
        title: "Store updated",
        description: `Store has been ${!store.is_active ? 'activated' : 'deactivated'}`
      });

      await loadStores();
    } catch (error) {
      console.error('Error updating store status:', error);
      toast({
        title: "Error",
        description: "Failed to update store status",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/noon-dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Store className="h-8 w-8 text-primary" />
                Noon Store Management
              </h1>
              <p className="text-slate-600 mt-1">
                Manage your Noon marketplace stores for {selectedCountry}
              </p>
            </div>
          </div>

          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingStore(null);
              setFormData({ name: "", location: "", description: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Store
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStore ? 'Edit Store' : 'Add New Noon Store'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Store Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter store name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter store location"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter store description"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStore ? 'Update Store' : 'Create Store'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
              <p className="text-xs text-muted-foreground">
                Noon marketplace stores
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stores.filter(s => s.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Country</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCountry}</div>
              <p className="text-xs text-muted-foreground">
                Current market
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stores List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading stores...</div>
            ) : stores.length === 0 ? (
              <div className="text-center py-12">
                <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No stores found</h3>
                <p className="text-slate-600 mb-4">
                  Get started by creating your first Noon store
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  Add First Store
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.location || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={store.is_active ? "default" : "secondary"}
                            className={store.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                          >
                            {store.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{store.currency}</TableCell>
                        <TableCell>{formatDate(store.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(store)}
                              disabled
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleStoreStatus(store)}
                            >
                              {store.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(store)}
                              className="text-red-600 hover:text-red-800"
                              disabled
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
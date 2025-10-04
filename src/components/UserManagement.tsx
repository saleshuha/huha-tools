import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, UserPlus, Shield, Settings, Users, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserPagePermissions } from '@/hooks/useUserPagePermissions';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  country: 'UAE' | 'KSA';
  role: 'admin' | 'user';
  is_main_admin: boolean;
  created_at: string;
}

const AVAILABLE_PAGES = [
  { route: '/', label: 'Homepage' },
  { route: '/inventory', label: 'Instock Inventory' },
  { route: '/replenishment', label: 'Sales & Replenishment' },
  { route: '/order-processing', label: 'DF Order Processing' },
  { route: '/po-tracker', label: 'Amazon Retail' },
  { route: '/amazon-fulfillment', label: 'Amazon Fulfillment Tracker' },
  { route: '/amazon-image-uploader', label: 'Amazon Image Uploader' },
  { route: '/amazon-vendor-central', label: 'Amazon Vendor Central' },
  { route: '/noon-order-processing', label: 'Noon Orders Processing' },
  { route: '/noon-order-tracking', label: 'Noon Orders Tracking' },
  { route: '/sunsky-importer', label: 'Source Product Importer' },
  { route: '/sunsky-order-tracking', label: 'Source Order Tracking' },
  { route: '/label-designer', label: 'Label Designer' },
  { route: '/carrefour-payments', label: 'Carrefour Sales Tracker' },
  { route: '/excel-mapper', label: 'Excel File Mapper' },
  { route: '/batch', label: 'Batch Processor' },
  { route: '/asin-sum', label: 'ASIN QTY Sum' },
  { route: '/zip-splitter', label: 'Zip Splitter' },
  { route: '/file-merger', label: 'File Merger' },
  { route: '/excel-editor', label: 'Excel Editor' },
  { route: '/bulk-column-editor', label: 'Bulk Column Editor' },
  { route: '/noon-file-cleaner', label: 'Noon File Cleaner' },
  { route: '/qz-tray', label: 'QZ Tray Setup' },
  { route: '/preview-settings', label: 'Preview Settings' },
];

export function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    country: 'UAE' as 'UAE' | 'KSA',
    role: 'user' as 'admin' | 'user'
  });

  const { toast } = useToast();
  const { profile: userProfile } = useUserProfile();
  const { permissions, updatePermissions, allowedRoutes } = useUserPagePermissions(editingPermissions || undefined);

  // Check if current user is admin (backwards compatible)
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (editingPermissions) {
      setSelectedPages(allowedRoutes);
    }
  }, [editingPermissions, allowedRoutes]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles((data || []) as Profile[]);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const createUser = async () => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create users",
        variant: "destructive"
      });
      return;
    }

    if (!newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newUser.full_name,
            country: newUser.country,
            role: newUser.role
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User created successfully"
      });

      setNewUser({
        email: '',
        password: '',
        full_name: '',
        country: 'UAE',
        role: 'user'
      });

      fetchProfiles();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update user roles",
        variant: "destructive"
      });
      return;
    }

    try {
      // First, remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert the new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole,
          assigned_by: userProfile?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully"
      });

      setEditingRole(null);
      fetchProfiles();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete users",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: "User deleted successfully"
      });

      fetchProfiles();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleSavePermissions = async () => {
    if (!editingPermissions) return;

    await updatePermissions(selectedPages);
    setEditingPermissions(null);
    setSelectedPages([]);
  };

  const togglePageSelection = (route: string) => {
    setSelectedPages(prev => 
      prev.includes(route) 
        ? prev.filter(r => r !== route)
        : [...prev, route]
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access user management.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and permissions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {profiles.length} users
        </div>
      </div>


      {/* Create User Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Password"
              />
            </div>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={newUser.country} onValueChange={(value) => setNewUser({ ...newUser, country: value as 'UAE' | 'KSA' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAE">UAE</SelectItem>
                  <SelectItem value="KSA">KSA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as 'admin' | 'user' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={createUser} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create User"}
          </Button>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>{profile.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{profile.country}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                      {profile.role}
                      {profile.is_main_admin && ' (Main)'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PagePermissionsCell userId={profile.id} />
                  </TableCell>
                  <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!profile.is_main_admin && (
                        <>
                          <Dialog open={editingRole === profile.id} onOpenChange={(open) => setEditingRole(open ? profile.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" title="Edit Role">
                                <Shield className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User Role</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>User</Label>
                                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                                </div>
                                <div>
                                  <Label htmlFor="role-select">Role</Label>
                                  <Select
                                    defaultValue={profile.role}
                                    onValueChange={(value) => updateUserRole(profile.id, value as 'admin' | 'user')}
                                  >
                                    <SelectTrigger id="role-select">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog 
                            open={editingPermissions === profile.id} 
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingPermissions(profile.id);
                              } else {
                                setEditingPermissions(null);
                                setSelectedPages([]);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" title="Assign Pages">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Assign Pages to User</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>User</Label>
                                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                                </div>
                                <div>
                                  <Label>Select Pages</Label>
                                  <ScrollArea className="h-[400px] rounded-md border p-4 mt-2">
                                    <div className="space-y-2">
                                      {AVAILABLE_PAGES.map((page) => (
                                        <div key={page.route} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`page-${page.route}`}
                                            checked={selectedPages.includes(page.route)}
                                            onCheckedChange={() => togglePageSelection(page.route)}
                                          />
                                          <label
                                            htmlFor={`page-${page.route}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            {page.label}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setEditingPermissions(null);
                                      setSelectedPages([]);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button onClick={handleSavePermissions}>
                                    Save Permissions
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}

                      {!profile.is_main_admin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {profile.email}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(profile.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component to show page permissions count
function PagePermissionsCell({ userId }: { userId: string }) {
  const { permissions } = useUserPagePermissions(userId);
  
  if (permissions.length === 0) {
    return <span className="text-xs text-muted-foreground">All pages</span>;
  }
  
  return (
    <Badge variant="secondary" className="text-xs">
      {permissions.length} page{permissions.length !== 1 ? 's' : ''}
    </Badge>
  );
}
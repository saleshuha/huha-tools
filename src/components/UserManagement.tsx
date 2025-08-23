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
import { Trash2, UserPlus, Shield, Settings, Users, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRoles } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  country: 'UAE' | 'KSA';
  role: 'admin' | 'user';
  is_main_admin: boolean;
  created_at: string;
}

interface UserWithRoles extends Profile {
  assigned_roles: string[];
  direct_permissions: string[];
}

export function UserManagement() {
  const [profiles, setProfiles] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    country: 'UAE' as 'UAE' | 'KSA',
    role: 'user' as 'admin' | 'user',
    roles: [] as string[],
    permissions: [] as string[]
  });
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [newPermission, setNewPermission] = useState({ key: '', label: '', description: '' });

  const { toast } = useToast();
  const { user } = useUserProfile();
  const { hasPermission } = useUserPermissions(user?.id);
  const { roles, createRole, deleteRole } = useRoles();
  const { permissions, createPermission, setRolePermissions, getRolePermissions } = usePermissions();
  const { assignUserRoles, assignUserPermissions, getUserRoles, getUserPermissions } = useUserRoles();

  useEffect(() => {
    if (hasPermission('page:user_management')) {
      fetchProfiles();
    }
  }, [hasPermission]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with role and permission data
      const enrichedProfiles: UserWithRoles[] = await Promise.all(
        (data || []).map(async (profile: Profile) => ({
          ...profile,
          assigned_roles: getUserRoles(profile.id),
          direct_permissions: getUserPermissions(profile.id)
        }))
      );

      setProfiles(enrichedProfiles);
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
    if (!hasPermission('action:user:create')) {
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

      // Assign roles and permissions if user was created
      if (data.user) {
        if (newUser.roles.length > 0) {
          await assignUserRoles(data.user.id, newUser.roles);
        }
        if (newUser.permissions.length > 0) {
          await assignUserPermissions(data.user.id, newUser.permissions);
        }
      }

      toast({
        title: "Success",
        description: "User created successfully"
      });

      setNewUser({
        email: '',
        password: '',
        full_name: '',
        country: 'UAE',
        role: 'user',
        roles: [],
        permissions: []
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

  const deleteUser = async (userId: string) => {
    if (!hasPermission('action:user:delete')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete users",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully"
      });

      fetchProfiles();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive"
      });
      return;
    }

    const { error } = await createRole(newRole.name, newRole.description);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Role created successfully"
      });
      setNewRole({ name: '', description: '' });
    }
  };

  const handleCreatePermission = async () => {
    if (!newPermission.key.trim() || !newPermission.label.trim()) {
      toast({
        title: "Error",
        description: "Permission key and label are required",
        variant: "destructive"
      });
      return;
    }

    const { error } = await createPermission(newPermission.key, newPermission.label, newPermission.description);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Permission created successfully"
      });
      setNewPermission({ key: '', label: '', description: '' });
    }
  };

  const handleRolePermissionChange = async (roleId: string, permissionId: string, checked: boolean) => {
    const currentPerms = getRolePermissions(roleId);
    const newPerms = checked 
      ? [...currentPerms, permissionId]
      : currentPerms.filter(p => p !== permissionId);
    
    const { error } = await setRolePermissions(roleId, newPerms);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update role permissions",
        variant: "destructive"
      });
    }
  };

  if (!hasPermission('page:user_management')) {
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
          <p className="text-muted-foreground">Manage users, roles and permissions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {profiles.length} users
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Create User Card */}
          {hasPermission('action:user:create') && (
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
                    <Label htmlFor="role">Legacy Role</Label>
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

                {/* Role Assignment */}
                <div>
                  <Label>Assign Roles</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={newUser.roles.includes(role.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUser(prev => ({ ...prev, roles: [...prev.roles, role.id] }));
                            } else {
                              setNewUser(prev => ({ ...prev, roles: prev.roles.filter(r => r !== role.id) }));
                            }
                          }}
                        />
                        <Label htmlFor={`role-${role.id}`} className="text-sm">
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={createUser} disabled={creating} className="w-full">
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </CardContent>
            </Card>
          )}

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
                    <TableHead>Legacy Role</TableHead>
                    <TableHead>RBAC Roles</TableHead>
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
                        <div className="flex flex-wrap gap-1">
                          {profile.assigned_roles.map((roleId) => {
                            const role = roles.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={roleId} variant="outline" className="text-xs">
                                {role.name}
                              </Badge>
                            ) : null;
                          })}
                          {profile.assigned_roles.length === 0 && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {hasPermission('action:user:update') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(selectedUser === profile.id ? null : profile.id)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('action:user:delete') && !profile.is_main_admin && (
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
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Roles Management */}
            <Card>
              <CardHeader>
                <CardTitle>Roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Role */}
                <div className="space-y-2 p-4 border rounded-lg">
                  <h4 className="font-medium">Create New Role</h4>
                  <Input
                    placeholder="Role name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                  <Button onClick={handleCreateRole} size="sm" className="w-full">
                    Create Role
                  </Button>
                </div>

                {/* Roles List */}
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{role.name}</div>
                        {role.description && (
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        )}
                      </div>
                      {role.name !== 'admin' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteRole(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Permissions Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Permission */}
                <div className="space-y-2 p-4 border rounded-lg">
                  <h4 className="font-medium">Create New Permission</h4>
                  <Input
                    placeholder="Permission key (e.g., page:analytics)"
                    value={newPermission.key}
                    onChange={(e) => setNewPermission({ ...newPermission, key: e.target.value })}
                  />
                  <Input
                    placeholder="Display label"
                    value={newPermission.label}
                    onChange={(e) => setNewPermission({ ...newPermission, label: e.target.value })}
                  />
                  <Button onClick={handleCreatePermission} size="sm" className="w-full">
                    Create Permission
                  </Button>
                </div>

                {/* Permissions Matrix */}
                <div className="space-y-3">
                  <h4 className="font-medium">Permission Matrix</h4>
                  <div className="space-y-2">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="space-y-2">
                        <div className="font-medium text-sm">{permission.label}</div>
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {roles.map((role) => (
                            <div key={`${role.id}-${permission.id}`} className="flex items-center space-x-2">
                              <Checkbox
                                id={`perm-${role.id}-${permission.id}`}
                                checked={getRolePermissions(role.id).includes(permission.id)}
                                onCheckedChange={(checked) =>
                                  handleRolePermissionChange(role.id, permission.id, checked as boolean)
                                }
                              />
                              <Label htmlFor={`perm-${role.id}-${permission.id}`} className="text-sm">
                                {role.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
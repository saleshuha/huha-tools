import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POPriorityBadge } from '@/components/po/POPriorityBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePOGroups } from '@/hooks/usePOGroups';
import { Loader2, Search, AlertTriangle, CheckSquare, Square, ChevronDown, ChevronUp, Folder, FolderPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PO {
  id: string;
  po_number: string;
  status: string;
  priority: number;
  quantity: number;
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  expected_delivery?: string;
}

export function PriorityPOList() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPriority, setNewGroupPriority] = useState<number>(3);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const { toast } = useToast();
  const { poGroups, createGroup, addPOsToGroup, updateGroupPriority, deleteGroup } = usePOGroups();

  useEffect(() => {
    loadPOs();
  }, []);

  const loadPOs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get ALL POs grouped by PO number with aggregated quantities
      const { data, error } = await supabase
        .from('po_orders')
        .select('id, po_number, status, priority, quantity, asin, sku_code, model_number, title, expected_delivery')
        .eq('user_id', user.id)
        // Removed status filter to show ALL POs
        .order('priority', { ascending: true })
        .order('expected_delivery', { ascending: true });

      if (error) throw error;

      // Group by PO number and sum quantities
      const grouped = (data || []).reduce((acc: any, po: any) => {
        const key = po.po_number;
        if (!acc[key]) {
          acc[key] = { ...po, quantity: 0, items: [] };
        }
        acc[key].quantity += po.quantity;
        acc[key].items.push(po);
        // Use the highest priority (lowest number) for the group
        if (!acc[key].priority || po.priority < acc[key].priority) {
          acc[key].priority = po.priority || 3;
        }
        return acc;
      }, {});

      setPOs(Object.values(grouped));
    } catch (error) {
      console.error('Failed to load POs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load purchase orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityUpdate = async (poNumber: string, newPriority: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update all items with this PO number
      const { error } = await supabase
        .from('po_orders')
        .update({ priority: newPriority })
        .eq('po_number', poNumber)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated priority for PO ${poNumber}`,
      });

      // Reload to reflect changes
      await loadPOs();
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive'
      });
    }
  };

  const handleBulkPriorityUpdate = async (newPriority: number) => {
    if (selectedPOs.size === 0) {
      toast({
        title: 'No POs selected',
        description: 'Please select POs to update',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all selected PO numbers
      const selectedPONumbers = Array.from(selectedPOs);

      // Update all items for selected PO numbers
      const { error } = await supabase
        .from('po_orders')
        .update({ priority: newPriority })
        .in('po_number', selectedPONumbers)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated priority for ${selectedPOs.size} PO(s)`,
      });

      setSelectedPOs(new Set());
      await loadPOs();
    } catch (error) {
      console.error('Failed to bulk update priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update priorities',
        variant: 'destructive'
      });
    }
  };

  const togglePOSelection = (poNumber: string) => {
    setSelectedPOs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(poNumber)) {
        newSet.delete(poNumber);
      } else {
        newSet.add(poNumber);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPOs.size === filteredPOs.length) {
      setSelectedPOs(new Set());
    } else {
      setSelectedPOs(new Set(filteredPOs.map(po => po.po_number)));
    }
  };

  const filteredPOs = pos.filter(po => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(query) ||
      po.asin?.toLowerCase().includes(query) ||
      po.sku_code?.toLowerCase().includes(query) ||
      po.title?.toLowerCase().includes(query)
    );
  });

  const allSelected = selectedPOs.size === filteredPOs.length && filteredPOs.length > 0;

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group name',
        variant: 'destructive'
      });
      return;
    }

    if (selectedPOs.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one PO',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Get the IDs of all items for selected PO numbers
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: poItems, error } = await supabase
        .from('po_orders')
        .select('id')
        .eq('user_id', user.id)
        .in('po_number', Array.from(selectedPOs));

      if (error) throw error;

      const poIds = poItems?.map(item => item.id) || [];

      await createGroup.mutateAsync({
        name: newGroupName,
        description: newGroupDescription,
        poIds
      });

      // Update priority for all POs in the group
      if (newGroupPriority !== 3) {
        await handleBulkPriorityUpdate(newGroupPriority);
      }

      setShowGroupDialog(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupPriority(3);
      setSelectedPOs(new Set());
      
      toast({
        title: 'Success',
        description: 'Group created successfully'
      });
    } catch (error) {
      console.error('Failed to create group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive'
      });
    }
  };

  const handleAddToExistingGroup = async () => {
    if (!selectedGroupId) {
      toast({
        title: 'Error',
        description: 'Please select a group',
        variant: 'destructive'
      });
      return;
    }

    if (selectedPOs.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one PO',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Get the IDs of all items for selected PO numbers
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: poItems, error } = await supabase
        .from('po_orders')
        .select('id')
        .eq('user_id', user.id)
        .in('po_number', Array.from(selectedPOs));

      if (error) throw error;

      const poIds = poItems?.map(item => item.id) || [];

      await addPOsToGroup.mutateAsync({
        groupId: selectedGroupId,
        poIds
      });

      setShowGroupDialog(false);
      setSelectedGroupId('');
      setSelectedPOs(new Set());
      
      toast({
        title: 'Success',
        description: 'POs added to group successfully'
      });
    } catch (error) {
      console.error('Failed to add to group:', error);
      toast({
        title: 'Error',
        description: 'Failed to add to group',
        variant: 'destructive'
      });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle>Priority & Group Management</CardTitle>
                  <CardDescription>
                    Set priorities and organize POs into groups for better control
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {filteredPOs.length} POs
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Tabs for Priority and Groups */}
            <Tabs defaultValue="priority" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="priority" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Priority Management
                </TabsTrigger>
                <TabsTrigger value="groups" className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Group Management
                </TabsTrigger>
              </TabsList>

              {/* Priority Management Tab */}
              <TabsContent value="priority" className="space-y-4 mt-4">
                {selectedPOs.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkPriorityUpdate(1)}
                      >
                        Set Highest
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkPriorityUpdate(2)}
                      >
                        Set High
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkPriorityUpdate(3)}
                      >
                        Set Normal
                      </Button>
                    </div>
                  </div>
                )}
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number, ASIN, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPOs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No POs match your search' : 'No open purchase orders'}
          </div>
        )}

        {/* PO List */}
        {!loading && filteredPOs.length > 0 && (
          <div className="space-y-2">
            {/* Select All Header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="h-auto p-0"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </Button>
              <span className="text-sm font-medium">
                Select All ({filteredPOs.length})
              </span>
            </div>

            {/* PO Items */}
            {filteredPOs.map((po) => (
              <div
                key={po.po_number}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                  selectedPOs.has(po.po_number)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                )}
              >
                <Checkbox
                  checked={selectedPOs.has(po.po_number)}
                  onCheckedChange={() => togglePOSelection(po.po_number)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {po.po_number}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {po.status.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {po.quantity} items
                    </Badge>
                  </div>
                  
                  {po.title && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {po.title}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {po.asin && <span>ASIN: {po.asin}</span>}
                    {po.sku_code && <span>• SKU: {po.sku_code}</span>}
                    {po.expected_delivery && (
                      <span>• Expected: {new Date(po.expected_delivery).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <POPriorityBadge
                  priority={po.priority || 3}
                  onUpdate={(newPriority) => handlePriorityUpdate(po.po_number, newPriority)}
                />
              </div>
            ))}
          </div>
        )}

                {/* Info Message */}
                {!loading && filteredPOs.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>How it works:</strong> When receiving items through the search bar above, 
                      higher priority POs (⚡ Highest, 🔴 High) will be fulfilled first automatically. 
                      This ensures urgent orders are completed before others.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Group Management Tab */}
              <TabsContent value="groups" className="space-y-4 mt-4">
                {selectedPOs.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedPOs.size} PO{selectedPOs.size > 1 ? 's' : ''} selected
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setShowGroupDialog(true)}
                      className="flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Create/Add to Group
                    </Button>
                  </div>
                )}

                {/* Existing Groups List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Existing Groups
                  </h4>
                  
                  {!poGroups || poGroups.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No groups created yet. Select POs and create a group to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {poGroups.map((group: any) => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Folder className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{group.group_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {group.member_count} POs
                              </Badge>
                            </div>
                            {group.description && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {group.description}
                              </p>
                            )}
                            {group.po_numbers && group.po_numbers.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1 ml-6">
                                POs: {group.po_numbers.slice(0, 3).join(', ')}
                                {group.po_numbers.length > 3 && ` +${group.po_numbers.length - 3} more`}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={group.priority?.toString() || '3'}
                              onValueChange={(value) => {
                                const priority = parseInt(value);
                                updateGroupPriority.mutate({
                                  groupId: group.id,
                                  priority
                                });
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">⚡ Highest</SelectItem>
                                <SelectItem value="2">🔴 High</SelectItem>
                                <SelectItem value="3">🟡 Normal</SelectItem>
                                <SelectItem value="4">🟢 Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this group?')) {
                                  deleteGroup.mutate(group.id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search (Shared) */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search PO number, ASIN, SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                {/* Empty State */}
                {!loading && filteredPOs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No POs match your search' : 'No open purchase orders'}
                  </div>
                )}

                {/* PO List (Shared) */}
                {!loading && filteredPOs.length > 0 && (
                  <div className="space-y-2">
                    {/* Select All Header */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="h-auto p-0"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                      <span className="text-sm font-medium">
                        Select All ({filteredPOs.length})
                      </span>
                    </div>

                    {/* PO Items */}
                    {filteredPOs.map((po) => (
                      <div
                        key={po.po_number}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                          selectedPOs.has(po.po_number)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                        )}
                      >
                        <Checkbox
                          checked={selectedPOs.has(po.po_number)}
                          onCheckedChange={() => togglePOSelection(po.po_number)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {po.po_number}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {po.status.toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {po.quantity} items
                            </Badge>
                          </div>
                          
                          {po.title && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {po.title}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {po.asin && <span>ASIN: {po.asin}</span>}
                            {po.sku_code && <span>• SKU: {po.sku_code}</span>}
                            {po.expected_delivery && (
                              <span>• Expected: {new Date(po.expected_delivery).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <POPriorityBadge
                          priority={po.priority || 3}
                          onUpdate={(newPriority) => handlePriorityUpdate(po.po_number, newPriority)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Create/Add Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group POs</DialogTitle>
            <DialogDescription>
              Create a new group or add selected POs to an existing group
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Create New Group</TabsTrigger>
              <TabsTrigger value="existing">Add to Existing</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  placeholder="Enter group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-description">Description (Optional)</Label>
                <Textarea
                  id="group-description"
                  placeholder="Enter group description..."
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-priority">Group Priority</Label>
                <Select
                  value={newGroupPriority.toString()}
                  onValueChange={(value) => setNewGroupPriority(parseInt(value))}
                >
                  <SelectTrigger id="group-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⚡ Highest</SelectItem>
                    <SelectItem value="2">🔴 High</SelectItem>
                    <SelectItem value="3">🟡 Normal</SelectItem>
                    <SelectItem value="4">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="existing" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="select-group">Select Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger id="select-group">
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {poGroups?.map((group: any) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.group_name} ({group.member_count} POs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddToExistingGroup}>Add to Group</Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

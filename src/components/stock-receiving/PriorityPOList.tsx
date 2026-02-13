import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POPriorityBadge } from '@/components/po/POPriorityBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePOGroups } from '@/hooks/usePOGroups';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Search, AlertTriangle, CheckSquare, Square, ChevronDown, ChevronUp, Folder, FolderPlus, Users, Trash2, Pencil } from 'lucide-react';
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

const PRIORITY_COLORS: Record<number, string> = {
  1: 'border-l-destructive',
  2: 'border-l-warning',
  3: 'border-l-sky',
  4: 'border-l-primary',
  5: 'border-l-muted-foreground',
};

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
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupPriority, setEditGroupPriority] = useState(3);
  const { toast } = useToast();
  const { poGroups, createGroup, addPOsToGroup, updateGroup, updateGroupPriority, deleteGroup, updateUngroupedPriorities } = usePOGroups();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPOs();
  }, []);

  const loadPOs = async () => {
    try {
      setLoading(true);
      
      await updateUngroupedPriorities.mutateAsync();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let allItems: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      console.log('Fetching PO orders in batches...');
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('po_orders')
          .select('id, po_number, status, priority, quantity, asin, sku_code, model_number, title, expected_delivery')
          .eq('user_id', user.id)
          .order('priority', { ascending: true })
          .order('expected_delivery', { ascending: true })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allItems = [...allItems, ...data];
          console.log(`Fetched batch: ${data.length} items (total so far: ${allItems.length})`);
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Fetched ${allItems.length} PO items total`);

      const grouped = allItems.reduce((acc: any, po: any) => {
        const key = po.po_number;
        if (!acc[key]) {
          acc[key] = { ...po, quantity: 0, items: [] };
        }
        acc[key].quantity += po.quantity;
        acc[key].items.push(po);
        if (!acc[key].priority || po.priority < acc[key].priority) {
          acc[key].priority = po.priority || 3;
        }
        return acc;
      }, {});

      const groupedArray = Object.values(grouped) as PO[];
      console.log(`Grouped into ${groupedArray.length} unique PO numbers`);
      setPOs(groupedArray);
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

  // Virtualizer for PO list
  const rowVirtualizer = useVirtualizer({
    count: filteredPOs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
  });

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
        poIds,
        priority: newGroupPriority
      });

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

  const pendingCount = pos.filter(po => po.status === 'pending' || po.status === 'placed').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <CardTitle>PO Groups & Priority</CardTitle>
                  <CardDescription>
                    Organize POs into groups and set priority
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {pos.length} POs
                </Badge>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Consolidated Search - shared across tabs */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search PO number, ASIN, SKU, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>

            <Tabs defaultValue="priority" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-lg">
                <TabsTrigger value="priority" className="flex items-center gap-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  Priority
                  <Badge variant="secondary" className="text-xs ml-1 h-5 px-1.5">
                    {filteredPOs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="groups" className="flex items-center gap-2 rounded-lg">
                  <Folder className="w-4 h-4" />
                  Groups
                  <Badge variant="secondary" className="text-xs ml-1 h-5 px-1.5">
                    {poGroups?.length || 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Priority Management Tab */}
              <TabsContent value="priority" className="space-y-3 mt-4">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                {!loading && filteredPOs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No POs match your search' : 'No open purchase orders'}
                  </div>
                )}

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

                    {/* Virtualized PO Items */}
                    <div
                      ref={parentRef}
                      className="max-h-[500px] overflow-auto rounded-lg"
                    >
                      <div
                        style={{
                          height: `${rowVirtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const po = filteredPOs[virtualRow.index];
                          const priorityColor = PRIORITY_COLORS[po.priority] || 'border-l-border';
                          return (
                            <div
                              key={po.po_number}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              className="pb-2"
                            >
                              <div
                                className={cn(
                                  "flex items-start gap-3 p-4 rounded-lg border border-l-4 transition-all h-full",
                                  priorityColor,
                                  selectedPOs.has(po.po_number)
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border hover:border-primary/50 hover:bg-accent/30 hover:shadow-sm"
                                )}
                              >
                                <Checkbox
                                  checked={selectedPOs.has(po.po_number)}
                                  onCheckedChange={() => togglePOSelection(po.po_number)}
                                  className="mt-1"
                                />
                                
                                <div className="flex-1 min-w-0 space-y-1.5">
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
                                  
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                    {po.asin && <span>ASIN: {po.asin}</span>}
                                    {po.sku_code && <span>• SKU: {po.sku_code}</span>}
                                    {po.expected_delivery && (
                                      <span>• Expected: {new Date(po.expected_delivery).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>

                                <POPriorityBadge
                                  priority={po.priority || 3}
                                  onUpdate={() => {}}
                                  disabled
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {!loading && filteredPOs.length > 0 && (
                  <div className="p-3 bg-sky/5 border border-sky/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>How it works:</strong> Higher priority POs (⚡ Highest, 🔴 High) will be fulfilled first automatically when receiving items.
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
                          className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-sm bg-card"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Folder className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-semibold">{group.group_name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {group.member_count} Items
                                </Badge>
                              </div>
                              {group.description && (
                                <p className="text-xs text-muted-foreground mt-1 ml-6">
                                  {group.description}
                                </p>
                              )}
                              {group.po_numbers && group.po_numbers.length > 0 && (() => {
                                const uniquePOs = [...new Set(group.po_numbers)];
                                return (
                                  <div className="text-xs text-muted-foreground mt-1 ml-6">
                                    POs: {uniquePOs.slice(0, 3).join(', ')}
                                    {uniquePOs.length > 3 && ` +${uniquePOs.length - 3} more`}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Priority display (read-only) */}
                              <Badge variant="outline" className="text-xs font-medium">
                                Priority {group.priority || 3}
                              </Badge>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setEditingGroup(group);
                                  setEditGroupName(group.group_name);
                                  setEditGroupDescription(group.description || '');
                                  setEditGroupPriority(group.priority || 3);
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Group</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{group.group_name}"? This will ungroup the POs but won't delete them.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteGroup.mutate(group.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Group Dialog */}
                <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Group</DialogTitle>
                      <DialogDescription>Update group name, description, and priority.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Group Name *</Label>
                        <Input
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={editGroupDescription}
                          onChange={(e) => setEditGroupDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={String(editGroupPriority)}
                          onValueChange={(v) => setEditGroupPriority(Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((p) => (
                              <SelectItem key={p} value={String(p)}>Priority {p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingGroup(null)}>Cancel</Button>
                      <Button
                        onClick={async () => {
                          if (!editGroupName.trim() || !editingGroup) return;
                          await updateGroup.mutateAsync({
                            groupId: editingGroup.id,
                            name: editGroupName,
                            description: editGroupDescription,
                            priority: editGroupPriority,
                          });
                          setEditingGroup(null);
                        }}
                        disabled={updateGroup.isPending}
                      >
                        {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* PO List in Groups tab - shared with priority tab */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                {!loading && filteredPOs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No POs match your search' : 'No open purchase orders'}
                  </div>
                )}

                {!loading && filteredPOs.length > 0 && (
                  <div className="space-y-2">
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

                    <div className="max-h-[400px] overflow-auto space-y-2 rounded-lg">
                      {filteredPOs.map((po) => {
                        const priorityColor = PRIORITY_COLORS[po.priority] || 'border-l-border';
                        return (
                          <div
                            key={po.po_number}
                            className={cn(
                              "flex items-start gap-3 p-4 rounded-lg border border-l-4 transition-all",
                              priorityColor,
                              selectedPOs.has(po.po_number)
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/50 hover:bg-accent/30 hover:shadow-sm"
                            )}
                          >
                            <Checkbox
                              checked={selectedPOs.has(po.po_number)}
                              onCheckedChange={() => togglePOSelection(po.po_number)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1 min-w-0 space-y-1.5">
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
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {po.asin && <span>ASIN: {po.asin}</span>}
                                {po.sku_code && <span>• SKU: {po.sku_code}</span>}
                                {po.expected_delivery && (
                                  <span>• Expected: {new Date(po.expected_delivery).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {po.priority < 6 ? (
                                <POPriorityBadge
                                  priority={po.priority || 3}
                                  onUpdate={() => {}}
                                  disabled
                                />
                              ) : (
                                <Badge variant="outline" className="text-xs border-dashed text-muted-foreground">
                                  📋 Auto-Priority {po.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                    <SelectItem value="1">🚀 1st Nearest Shipment</SelectItem>
                    <SelectItem value="2">🔥 2nd Nearest Shipment</SelectItem>
                    <SelectItem value="3">📦 3rd Nearest Shipment</SelectItem>
                    <SelectItem value="4">📅 4th Nearest Shipment</SelectItem>
                    <SelectItem value="5">⏰ 5th Nearest Shipment</SelectItem>
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
                    ))}</SelectContent>
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

import { useState, useCallback } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePOGroups } from '@/hooks/usePOGroups';
import { Loader2, Search, AlertTriangle, ChevronDown, ChevronUp, Folder, FolderPlus, Trash2, Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<number, string> = {
  1: 'border-l-destructive',
  2: 'border-l-warning',
  3: 'border-l-sky',
  4: 'border-l-primary',
  5: 'border-l-muted-foreground',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Minimal',
};

interface ExpandedGroupData {
  loading: boolean;
  pos: Array<{ po_id: string; po_number: string; quantity: number; priority: number; asin?: string; sku_code?: string; title?: string }>;
}

export function PriorityPOList() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedGroupData, setExpandedGroupData] = useState<Record<string, ExpandedGroupData>>({});
  
  // Create group state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPriority, setNewGroupPriority] = useState<number>(3);
  const [dialogPOs, setDialogPOs] = useState<Array<{ id: string; po_number: string; quantity: number; isGrouped?: boolean }>>([]);
  const [dialogPOsLoading, setDialogPOsLoading] = useState(false);
  const [dialogSelectedPOs, setDialogSelectedPOs] = useState<Set<string>>(new Set());
  const [dialogSearch, setDialogSearch] = useState('');
  const [dialogTab, setDialogTab] = useState<'new' | 'existing'>('new');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Edit group state
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupPriority, setEditGroupPriority] = useState(3);

  const { toast } = useToast();
  const { poGroups, isLoading, createGroup, addPOsToGroup, updateGroup, deleteGroup, getPOsInGroup } = usePOGroups();

  // Filter groups by search
  const filteredGroups = (poGroups || [])
    .filter(group => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        group.group_name.toLowerCase().includes(q) ||
        (group.po_numbers || []).some((pn: string) => pn.toLowerCase().includes(q))
      );
    })
    .sort((a: any, b: any) => (a.priority || 3) - (b.priority || 3));

  // Toggle expand and load PO details on-demand
  const toggleExpand = useCallback(async (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
        // Load PO details if not cached
        if (!expandedGroupData[groupId]) {
          loadGroupPOs(groupId);
        }
      }
      return next;
    });
  }, [expandedGroupData]);

  const loadGroupPOs = async (groupId: string) => {
    setExpandedGroupData(prev => ({ ...prev, [groupId]: { loading: true, pos: [] } }));
    try {
      const data = await getPOsInGroup(groupId);
      // Aggregate by po_number
      const poMap = new Map<string, any>();
      for (const member of (data || [])) {
        const po = member.po_orders as any;
        if (!po) continue;
        const key = po.po_number;
        if (!poMap.has(key)) {
          poMap.set(key, { po_id: member.po_id, po_number: po.po_number, quantity: 0, priority: po.priority || 3, asin: po.asin, sku_code: po.sku_code, title: po.title });
        }
        poMap.get(key).quantity += po.quantity || 0;
      }
      setExpandedGroupData(prev => ({ ...prev, [groupId]: { loading: false, pos: Array.from(poMap.values()) } }));
    } catch {
      setExpandedGroupData(prev => ({ ...prev, [groupId]: { loading: false, pos: [] } }));
    }
  };

  // Load POs for the create dialog - paginated to fetch all
  const loadDialogPOs = async () => {
    setDialogPOsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch all POs with pagination
      const pageSize = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('po_orders')
          .select('id, po_number, quantity')
          .eq('user_id', user.id)
          .in('status', ['pending', 'placed'])
          .order('po_number')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Fetch already-grouped PO IDs
      const { data: groupedMembers } = await supabase
        .from('po_group_members')
        .select('po_id');
      const groupedPoIds = new Set((groupedMembers || []).map(m => m.po_id));
      
      // Deduplicate by po_number, sum quantities, mark grouped
      const poMap = new Map<string, { id: string; po_number: string; quantity: number; isGrouped: boolean; poIds: string[] }>();
      for (const po of allData) {
        if (!poMap.has(po.po_number)) {
          poMap.set(po.po_number, { id: po.id, po_number: po.po_number, quantity: 0, isGrouped: false, poIds: [] });
        }
        const entry = poMap.get(po.po_number)!;
        entry.quantity += po.quantity || 0;
        entry.poIds.push(po.id);
        if (groupedPoIds.has(po.id)) entry.isGrouped = true;
      }
      setDialogPOs(Array.from(poMap.values()));
    } catch (error) {
      console.error('Failed to load POs for dialog:', error);
    } finally {
      setDialogPOsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setShowCreateDialog(true);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupPriority(3);
    setDialogSelectedPOs(new Set());
    setDialogSearch('');
    setDialogTab('new');
    setSelectedGroupId('');
    loadDialogPOs();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({ title: 'Error', description: 'Please enter a group name', variant: 'destructive' });
      return;
    }
    if (dialogSelectedPOs.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one PO', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Paginate to get ALL po IDs (avoid 1000-row default limit)
      const selectedArr = Array.from(dialogSelectedPOs);
      let allPoIds: string[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('po_orders')
          .select('id')
          .eq('user_id', user.id)
          .in('po_number', selectedArr)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allPoIds = [...allPoIds, ...data.map(i => i.id)];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      await createGroup.mutateAsync({
        name: newGroupName,
        description: newGroupDescription,
        poIds: allPoIds,
        priority: newGroupPriority,
      });

      setShowCreateDialog(false);
      // Clear cached expanded data
      setExpandedGroupData({});
    } catch (error) {
      console.error('Failed to create group:', error);
      toast({ title: 'Error', description: 'Failed to create group', variant: 'destructive' });
    }
  };

  const handleAddToExisting = async () => {
    if (!selectedGroupId || dialogSelectedPOs.size === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Paginate to get ALL po IDs (avoid 1000-row default limit)
      const selectedArr = Array.from(dialogSelectedPOs);
      let allPoIds: string[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('po_orders')
          .select('id')
          .eq('user_id', user.id)
          .in('po_number', selectedArr)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allPoIds = [...allPoIds, ...data.map(i => i.id)];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      await addPOsToGroup.mutateAsync({
        groupId: selectedGroupId,
        poIds: allPoIds,
      });

      setShowCreateDialog(false);
      setExpandedGroupData({});
    } catch (error) {
      console.error('Failed to add to group:', error);
      toast({ title: 'Error', description: 'Failed to add POs to group', variant: 'destructive' });
    }
  };

  const handleEditSave = async () => {
    if (!editGroupName.trim() || !editingGroup) return;
    await updateGroup.mutateAsync({
      groupId: editingGroup.id,
      name: editGroupName,
      description: editGroupDescription,
      priority: editGroupPriority,
    });
    setEditingGroup(null);
    setExpandedGroupData({});
  };

  const filteredDialogPOs = dialogPOs.filter(po => {
    if (!dialogSearch) return true;
    const searchTerms = dialogSearch.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return searchTerms.some(term => po.po_number.toLowerCase().includes(term));
  });

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
                  <CardDescription>Manage groups and set priority</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {poGroups?.length || 0} Groups
                </Badge>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Header with search + create */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups or PO numbers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg"
                />
              </div>
              <Button size="sm" onClick={openCreateDialog} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" />
                New Group
              </Button>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredGroups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? 'No groups match your search' : 'No groups yet. Create one to organize your POs.'}
              </div>
            )}

            {/* Group cards */}
            {!isLoading && filteredGroups.length > 0 && (
              <div className="space-y-2">
                {filteredGroups.map((group: any) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const priority = group.priority || 3;
                  const priorityColor = PRIORITY_COLORS[priority] || 'border-l-border';
                  const uniquePOs = [...new Set(group.po_numbers || [])];
                  const groupData = expandedGroupData[group.id];

                  return (
                    <div key={group.id} className="rounded-lg border border-border/50 overflow-hidden">
                      {/* Group header */}
                      <div
                        className={cn(
                          "flex items-center gap-2 w-full px-4 py-3 border-l-4 bg-muted/30 hover:bg-muted/50 transition-colors",
                          priorityColor
                        )}
                      >
                        <button
                          onClick={() => toggleExpand(group.id)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <Folder className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold text-sm truncate">{group.group_name}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {uniquePOs.length} POs • {group.total_quantity} items
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                            P{priority} {PRIORITY_LABELS[priority] || ''}
                          </Badge>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroup(group);
                              setEditGroupName(group.group_name);
                              setEditGroupDescription(group.description || '');
                              setEditGroupPriority(priority);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Group</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete "{group.group_name}"? POs will be ungrouped but not deleted.
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

                      {/* Expanded PO list */}
                      {isExpanded && (
                        <div className="p-3 space-y-1.5 bg-card border-t border-border/30">
                          {groupData?.loading && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {groupData && !groupData.loading && groupData.pos.length > 0 && (
                            groupData.pos.map((po) => (
                              <div
                                key={po.po_number}
                                className="flex items-center gap-3 p-2.5 rounded-md border border-border/50 hover:bg-accent/30 transition-colors text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{po.po_number}</span>
                                    <Badge variant="secondary" className="text-xs">{po.quantity} items</Badge>
                                  </div>
                                  {po.title && <p className="text-xs text-muted-foreground truncate mt-0.5">{po.title}</p>}
                                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                    {po.asin && <span>ASIN: {po.asin}</span>}
                                    {po.sku_code && <span>SKU: {po.sku_code}</span>}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          {groupData && !groupData.loading && groupData.pos.length === 0 && (
                            <div className="text-center py-3 text-xs text-muted-foreground">
                              {uniquePOs.length} POs: {uniquePOs.slice(0, 5).join(', ')}{uniquePOs.length > 5 ? ` +${uniquePOs.length - 5} more` : ''}
                            </div>
                          )}
                          {!groupData && (
                            <div className="text-center py-3 text-xs text-muted-foreground">
                              Loading...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tip */}
            {!isLoading && (poGroups?.length || 0) > 0 && (
              <div className="p-3 bg-sky/5 border border-sky/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 Higher priority groups (P1, P2) are fulfilled first. Ungrouped POs auto-receive a priority number.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Create / Add to Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add POs to Group</DialogTitle>
            <DialogDescription>Create a new group or add to an existing one</DialogDescription>
          </DialogHeader>

          <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">New Group</TabsTrigger>
              <TabsTrigger value="existing">Existing Group</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-3 mt-3">
              <div>
                <Label>Group Name *</Label>
                <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Urgent Orders" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Optional" rows={2} />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={String(newGroupPriority)} onValueChange={(v) => setNewGroupPriority(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(p => (
                      <SelectItem key={p} value={String(p)}>P{p} - {PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <div>
                <Label>Select Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger><SelectValue placeholder="Choose a group..." /></SelectTrigger>
                  <SelectContent>
                    {(poGroups || []).map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.group_name} (P{g.priority || 3})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* PO Selection */}
          <div className="space-y-2">
            <Label>Select POs ({dialogSelectedPOs.size} selected)</Label>
            <Input
              placeholder="Search PO numbers (comma separated)..."
              value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)}
              className="text-sm"
            />
            {filteredDialogPOs.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const selectablePOs = filteredDialogPOs.filter(po => !po.isGrouped);
                  const allSelected = selectablePOs.every(po => dialogSelectedPOs.has(po.po_number));
                  setDialogSelectedPOs(prev => {
                    const next = new Set(prev);
                    if (allSelected) {
                      selectablePOs.forEach(po => next.delete(po.po_number));
                    } else {
                      selectablePOs.forEach(po => next.add(po.po_number));
                    }
                    return next;
                  });
                }}
              >
                {filteredDialogPOs.every(po => dialogSelectedPOs.has(po.po_number)) ? 'Deselect All' : `Select All (${filteredDialogPOs.length})`}
              </Button>
            )}
            <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-lg p-2">
              {dialogPOsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDialogPOs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No POs found</p>
              ) : (
                filteredDialogPOs.map(po => (
                  <label key={po.po_number} className={cn(
                    "flex items-center gap-2 p-1.5 rounded text-sm",
                    po.isGrouped ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/30 cursor-pointer"
                  )}>
                    <Checkbox
                      checked={dialogSelectedPOs.has(po.po_number)}
                      disabled={po.isGrouped}
                      onCheckedChange={() => {
                        if (po.isGrouped) return;
                        setDialogSelectedPOs(prev => {
                          const next = new Set(prev);
                          if (next.has(po.po_number)) next.delete(po.po_number);
                          else next.add(po.po_number);
                          return next;
                        });
                      }}
                    />
                    <span className="font-medium">{po.po_number}</span>
                    {po.isGrouped && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Grouped</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">{po.quantity} items</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={dialogTab === 'new' ? handleCreateGroup : handleAddToExisting}
              disabled={createGroup.isPending || addPOsToGroup.isPending}
            >
              {(createGroup.isPending || addPOsToGroup.isPending) ? 'Saving...' : dialogTab === 'new' ? 'Create Group' : 'Add to Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group details and priority.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name *</Label>
              <Input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editGroupDescription} onChange={(e) => setEditGroupDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={String(editGroupPriority)} onValueChange={(v) => setEditGroupPriority(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(p => (
                    <SelectItem key={p} value={String(p)}>P{p} - {PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={updateGroup.isPending}>
              {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

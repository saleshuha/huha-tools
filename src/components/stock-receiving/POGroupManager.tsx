import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Package, Users } from 'lucide-react';
import { usePOGroups } from '@/hooks/usePOGroups';
import { POPriorityBadge } from '@/components/po/POPriorityBadge';

export const POGroupManager = () => {
  const { poGroups, isLoading, createGroup, deleteGroup, removePOFromGroup } = usePOGroups();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    
    await createGroup.mutateAsync({
      name: groupName,
      description: groupDescription,
      poIds: []
    });
    
    setGroupName('');
    setGroupDescription('');
    setCreateDialogOpen(false);
  };

  const filteredGroups = poGroups.filter(group =>
    group.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.po_numbers.some(po => po.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading groups...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              PO Groups
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Organize related POs for consolidated stock receiving
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create PO Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Group Name *</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Urgent Orders"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search groups or PO numbers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No groups match your search' : 'No groups created yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map(group => (
              <Card key={group.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{group.group_name}</h3>
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {group.member_count} POs
                        </Badge>
                        <Badge variant="outline">
                          {group.total_quantity} units
                        </Badge>
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {group.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {group.po_numbers.slice(0, 5).map((po, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {po}
                          </Badge>
                        ))}
                        {group.po_numbers.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.po_numbers.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGroup.mutate(group.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

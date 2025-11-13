import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { POGroup, POGroupMember, POGroupWithMembers } from '@/types/po-groups';

export const usePOGroups = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all PO groups with member counts
  const { data: poGroups, isLoading } = useQuery({
    queryKey: ['po-groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: groups, error: groupsError } = await supabase
        .from('po_groups')
        .select(`
          *,
          po_group_members (
            po_id,
            po_orders (
              po_number,
              quantity,
              priority
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Transform to include aggregated data
      const groupsWithMembers: POGroupWithMembers[] = (groups || []).map(group => {
        const members = group.po_group_members || [];
        const poNumbers = members.map((m: any) => m.po_orders?.po_number).filter(Boolean);
        const totalQuantity = members.reduce((sum: number, m: any) => sum + (m.po_orders?.quantity || 0), 0);
        
        return {
          ...group,
          member_count: members.length,
          total_quantity: totalQuantity,
          po_numbers: poNumbers,
          po_ids: members.map((m: any) => m.po_id)
        };
      });

      return groupsWithMembers;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Create new PO group
  const createGroup = useMutation({
    mutationFn: async ({ name, description, poIds }: { name: string; description?: string; poIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('po_groups')
        .insert({
          user_id: user.id,
          group_name: name,
          description,
          status: 'active'
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members
      if (poIds.length > 0) {
        const members = poIds.map(po_id => ({
          group_id: group.id,
          po_id
        }));

        const { error: membersError } = await supabase
          .from('po_group_members')
          .insert(members);

        if (membersError) throw membersError;
      }

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      toast({
        title: 'Group created',
        description: 'PO group created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add POs to group
  const addPOsToGroup = useMutation({
    mutationFn: async ({ groupId, poIds }: { groupId: string; poIds: string[] }) => {
      const members = poIds.map(po_id => ({
        group_id: groupId,
        po_id
      }));

      const { error } = await supabase
        .from('po_group_members')
        .insert(members);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      toast({
        title: 'POs added',
        description: 'POs added to group successfully',
      });
    },
  });

  // Remove PO from group
  const removePOFromGroup = useMutation({
    mutationFn: async ({ groupId, poId }: { groupId: string; poId: string }) => {
      const { error } = await supabase
        .from('po_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('po_id', poId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      toast({
        title: 'PO removed',
        description: 'PO removed from group',
      });
    },
  });

  // Delete group
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('po_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      toast({
        title: 'Group deleted',
        description: 'PO group deleted successfully',
      });
    },
  });

  // Get PO IDs for a group
  const getPOsInGroup = async (groupId: string) => {
    const { data, error } = await supabase
      .from('po_group_members')
      .select('po_id, po_orders(po_number, quantity, priority, asin, sku_code, title)')
      .eq('group_id', groupId);

    if (error) throw error;
    return data;
  };

  return {
    poGroups: poGroups || [],
    isLoading,
    createGroup,
    addPOsToGroup,
    removePOFromGroup,
    deleteGroup,
    getPOsInGroup,
  };
};

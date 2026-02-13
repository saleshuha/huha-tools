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
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // For each group, fetch member count and unique PO info separately to avoid 1000 row limit
      const groupsWithMembers: POGroupWithMembers[] = await Promise.all(
        (groups || []).map(async (group) => {
          // Get exact member count
          const { count: memberCount } = await supabase
            .from('po_group_members')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Paginate to fetch ALL members (bypass 1000 row limit)
          let allMembers: any[] = [];
          const PAGE_SIZE = 1000;
          let page = 0;
          let hasMore = true;
          while (hasMore) {
            const { data: members } = await supabase
              .from('po_group_members')
              .select('po_id, po_orders(po_number, quantity, priority)')
              .eq('group_id', group.id)
              .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
            
            const batch = members || [];
            allMembers = [...allMembers, ...batch];
            hasMore = batch.length === PAGE_SIZE;
            page++;
          }

          const poNumbers = allMembers.map((m: any) => m.po_orders?.po_number).filter(Boolean);
          const totalQuantity = allMembers.reduce((sum: number, m: any) => sum + (m.po_orders?.quantity || 0), 0);

          return {
            ...group,
            member_count: memberCount || 0,
            total_quantity: totalQuantity,
            po_numbers: poNumbers,
            po_ids: allMembers.map((m: any) => m.po_id)
          };
        })
      );

      return groupsWithMembers;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Update ungrouped PO priorities - defined first so it can be used in other mutations
  const updateUngroupedPriorities = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('update_ungrouped_po_priorities', { user_id_param: user.id });

      if (error) throw error;
      return data[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      if (data && data.updated_count > 0) {
        console.log(`Updated ${data.updated_count} ungrouped POs to priority ${data.new_priority}`);
      }
    },
  });

  // Create new PO group
  const createGroup = useMutation({
    mutationFn: async ({ name, description, poIds, priority }: { name: string; description?: string; poIds: string[]; priority?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create group with priority
      const { data: group, error: groupError } = await supabase
        .from('po_groups')
        .insert({
          user_id: user.id,
          group_name: name,
          description,
          status: 'active',
          priority: priority || 3
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members and update their priority
      if (poIds.length > 0) {
        // Batch inserts to avoid URL length limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < poIds.length; i += BATCH_SIZE) {
          const batch = poIds.slice(i, i + BATCH_SIZE);
          
          const members = batch.map(po_id => ({
            group_id: group.id,
            po_id
          }));

          const { error: membersError } = await supabase
            .from('po_group_members')
            .insert(members);

          if (membersError) throw membersError;

          // Update batch POs with the group's priority
          const { error: updateError } = await supabase
            .from('po_orders')
            .update({ priority: priority || 3 })
            .in('id', batch);

          if (updateError) throw updateError;
        }
      }

      return group;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      // Trigger auto-update for remaining ungrouped POs
      updateUngroupedPriorities.mutate();
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

  // Update group priority (updates all POs in the group)
  const updateGroupPriority = useMutation({
    mutationFn: async ({ groupId, priority }: { groupId: string; priority: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Paginate to get ALL PO IDs in the group
      let poIds: string[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data: members, error: membersError } = await supabase
          .from('po_group_members')
          .select('po_id')
          .eq('group_id', groupId)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (membersError) throw membersError;
        const batch = members || [];
        poIds = [...poIds, ...batch.map(m => m.po_id)];
        hasMore = batch.length === PAGE_SIZE;
        page++;
      }

      // Update priority for all POs in the group (batched)
      if (poIds.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < poIds.length; i += BATCH_SIZE) {
          const batch = poIds.slice(i, i + BATCH_SIZE);
          const { error: updateError } = await supabase
            .from('po_orders')
            .update({ priority })
            .in('id', batch)
            .eq('user_id', user.id);

          if (updateError) throw updateError;
        }
      }

      // Update group priority field
      const { error: groupError } = await supabase
        .from('po_groups')
        .update({ priority })
        .eq('id', groupId)
        .eq('user_id', user.id);

      if (groupError) throw groupError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      // Trigger auto-update for remaining ungrouped POs
      updateUngroupedPriorities.mutate();
      toast({
        title: 'Priority updated',
        description: 'Group priority updated successfully',
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

  // Update group details (name, description, priority)
  const updateGroup = useMutation({
    mutationFn: async ({ groupId, name, description, priority }: { groupId: string; name: string; description?: string; priority: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('po_groups')
        .update({ group_name: name, description, priority })
        .eq('id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Paginate to get ALL member PO IDs
      let poIds: string[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data: members } = await supabase
          .from('po_group_members')
          .select('po_id')
          .eq('group_id', groupId)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        const batch = members || [];
        poIds = [...poIds, ...batch.map(m => m.po_id)];
        hasMore = batch.length === PAGE_SIZE;
        page++;
      }
      if (poIds.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < poIds.length; i += BATCH_SIZE) {
          const batch = poIds.slice(i, i + BATCH_SIZE);
          await supabase
            .from('po_orders')
            .update({ priority })
            .in('id', batch)
            .eq('user_id', user.id);
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['po-groups'] });
      updateUngroupedPriorities.mutate();
      toast({
        title: 'Group updated',
        description: 'Group details updated successfully',
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
    updateGroup,
    updateGroupPriority,
    updateUngroupedPriorities,
    getPOsInGroup,
  };
};

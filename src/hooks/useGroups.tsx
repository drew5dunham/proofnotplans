import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Category } from '@/types';

export interface DbGroup {
  id: string;
  name: string;
  category: string;
  created_by: string;
  created_at: string;
}

export interface DbGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  invited_by: string | null;
  joined_at: string;
}

export interface GroupWithMembers extends DbGroup {
  member_count: number;
  members: { user_id: string; name: string | null }[];
}

export function useGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch groups the user is a member of
  const groupsQuery = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get user's group memberships
      const { data: memberships, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return [];

      const groupIds = memberships.map((m) => m.group_id);

      // Fetch the groups
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Fetch all members for these groups
      const { data: allMembers, error: membersError } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .in('group_id', groupIds);

      if (membersError) throw membersError;

      // Fetch profile names
      const memberUserIds = [...new Set(allMembers?.map((m) => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', memberUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      // Build groups with member info
      const groupsWithMembers: GroupWithMembers[] = (groups || []).map((group) => {
        const groupMembers = (allMembers || [])
          .filter((m) => m.group_id === group.id)
          .map((m) => ({
            user_id: m.user_id,
            name: profileMap.get(m.user_id) || null,
          }));

        return {
          ...group,
          member_count: groupMembers.length,
          members: groupMembers,
        };
      });

      return groupsWithMembers;
    },
    enabled: !!user,
  });

  // Create a new group
  const createGroupMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: Category }) => {
      if (!user) throw new Error('Not authenticated');

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          category,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as first member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          invited_by: null,
        });

      if (memberError) throw memberError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Group created!' });
    },
    onError: () => {
      toast({ title: 'Failed to create group', variant: 'destructive' });
    },
  });

  // Invite a user to a group
  const inviteToGroupMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          invited_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Invitation sent!' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast({ title: 'Already a member', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to invite', variant: 'destructive' });
      }
    },
  });

  // Leave a group
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Left group' });
    },
    onError: () => {
      toast({ title: 'Failed to leave group', variant: 'destructive' });
    },
  });

  // Delete a group (creator only)
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Group deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete group', variant: 'destructive' });
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    createGroup: createGroupMutation.mutate,
    inviteToGroup: inviteToGroupMutation.mutate,
    leaveGroup: leaveGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
    isCreating: createGroupMutation.isPending,
  };
}

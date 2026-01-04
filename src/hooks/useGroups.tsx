import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { sendPushNotification } from '@/lib/pushNotifications';
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
  status: 'pending' | 'accepted' | 'declined';
}

export interface GroupWithMembers extends DbGroup {
  member_count: number;
  members: { user_id: string; name: string | null; status: string }[];
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

      // Fetch all members for these groups (only accepted members)
      const { data: allMembers, error: membersError } = await supabase
        .from('group_members')
        .select('group_id, user_id, status')
        .in('group_id', groupIds)
        .eq('status', 'accepted');

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
            status: m.status || 'accepted',
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

      const { data: group, error } = await supabase.rpc('create_group', {
        _name: name,
        _category: category,
      });

      if (error) throw error;
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

  // Invite a user to a group (creates pending membership + notification)
  const inviteToGroupMutation = useMutation({
    mutationFn: async ({ groupId, userId, groupName }: { groupId: string; userId: string; groupName: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Create pending membership
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          invited_by: user.id,
          status: 'pending',
        });

      if (error) throw error;

      // Get inviter's profile name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const title = `${inviterProfile?.name || 'Someone'} invited you to join "${groupName}"`;
      const body = 'Tap to view and respond';

      // Create notification for the invited user
      await supabase.from('notifications').insert({
        user_id: userId,
        actor_id: user.id,
        type: 'group_invite',
        title,
        body,
        reference_id: groupId,
      });

      // Send push notification
      sendPushNotification(userId, title, body, '/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Invitation sent!' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast({ title: 'Already invited or a member', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to invite', variant: 'destructive' });
      }
    },
  });

  // Accept group invitation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_members')
        .update({ status: 'accepted' })
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitation'] });
      toast({ title: 'You joined the group!' });
    },
    onError: () => {
      toast({ title: 'Failed to accept invitation', variant: 'destructive' });
    },
  });

  // Decline group invitation
  const declineInvitationMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitation'] });
      toast({ title: 'Invitation declined' });
    },
    onError: () => {
      toast({ title: 'Failed to decline invitation', variant: 'destructive' });
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
    createGroupAsync: createGroupMutation.mutateAsync,
    inviteToGroup: inviteToGroupMutation.mutate,
    acceptInvitation: acceptInvitationMutation.mutate,
    declineInvitation: declineInvitationMutation.mutate,
    leaveGroup: leaveGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
    isCreating: createGroupMutation.isPending,
    isAccepting: acceptInvitationMutation.isPending,
    isDeclining: declineInvitationMutation.isPending,
  };
}

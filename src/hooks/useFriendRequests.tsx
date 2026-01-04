import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SearchResult {
  id: string;
  name: string | null;
}

// Search for users by name (excludes self and existing friends)
export function useSearchUsers(searchTerm: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-users', searchTerm, user?.id],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!user || !searchTerm || searchTerm.length < 2) return [];

      // Use the security definer function to search users
      const { data, error } = await supabase
        .rpc('search_users_by_name', {
          _search_term: searchTerm,
          _current_user_id: user.id
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && searchTerm.length >= 2,
  });
}

// Send a friend request
export function useSendFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendId, friendName }: { friendId: string; friendName: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      // Create the friendship with pending status
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (friendshipError) throw friendshipError;

      // Get sender's name for the notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Create notification for the recipient
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: friendId,
          actor_id: user.id,
          type: 'friend_request',
          title: `${profile?.name || 'Someone'} wants to be your friend`,
          body: 'Accept or ignore this friend request',
          reference_id: user.id // The sender's user ID for accepting/ignoring
        });

      if (notifError) throw notifError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-users'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-count'] });
    }
  });
}

// Accept a friend request
export function useAcceptFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ senderId, notificationId }: { senderId: string; notificationId: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Update friendship status to accepted
      const { error: friendshipError } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', senderId)
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (friendshipError) throw friendshipError;

      // Mark notification as read (which effectively removes it from unread)
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (notifError) throw notifError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Ignore a friend request (delete the pending friendship and mark notification as read)
export function useIgnoreFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ senderId, notificationId }: { senderId: string; notificationId: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Delete the pending friendship
      const { error: friendshipError } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', senderId)
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (friendshipError) throw friendshipError;

      // Mark notification as read
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (notifError) throw notifError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

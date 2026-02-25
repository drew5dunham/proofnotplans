import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sendPushNotification } from '@/lib/pushNotifications';

interface SearchResult {
  id: string;
  name: string | null;
  friendship_status: string;
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

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') throw new Error('Already friends');
        if (existing.status === 'pending') throw new Error('Friend request already pending');
      }

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

      const title = `${profile?.name || 'Someone'} wants to be your friend`;
      const body = 'Accept or ignore this friend request';

      // Create notification for the recipient (non-blocking - don't fail the friendship)
      try {
        const { data: notification, error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: friendId,
            actor_id: user.id,
            type: 'friend_request',
            title,
            body,
            reference_id: user.id
          })
          .select('id')
          .single();

        if (notifError) {
          console.error('Failed to create notification:', notifError);
        }

        // Send push notification with notification ID
        sendPushNotification(friendId, title, body, '/', notification?.id);
      } catch (notifErr) {
        console.error('Failed to create notification for friend request:', notifErr);
      }
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
    mutationFn: async ({ senderId, notificationId }: { senderId: string; notificationId?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Update friendship status to accepted
      const { error: friendshipError } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', senderId)
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (friendshipError) throw friendshipError;

      // Mark notification as read - find by reference if no ID provided
      if (notificationId) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId);
      } else {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('type', 'friend_request')
          .eq('reference_id', senderId)
          .is('read_at', null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['search-users'] });
    }
  });
}

// Ignore a friend request (delete the pending friendship and mark notification as read)
export function useIgnoreFriendRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ senderId, notificationId }: { senderId: string; notificationId?: string }) => {
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
      if (notificationId) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId);
      } else {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('type', 'friend_request')
          .eq('reference_id', senderId)
          .is('read_at', null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['search-users'] });
    }
  });
}

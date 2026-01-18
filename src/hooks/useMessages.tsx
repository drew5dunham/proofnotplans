import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { sendPushNotification } from '@/lib/pushNotifications';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

// Get messages between current user and a friend
export function useMessages(friendId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', user?.id, friendId],
    queryFn: async (): Promise<Message[]> => {
      if (!user || !friendId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!friendId
  });

  // Mark messages as read when viewing this conversation
  useEffect(() => {
    if (!user || !friendId || !query.data) return;

    const unreadMessages = query.data.filter(
      msg => msg.sender_id === friendId && !msg.read_at
    );

    if (unreadMessages.length > 0) {
      supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', friendId)
        .eq('recipient_id', user.id)
        .is('read_at', null)
        .then(() => {
          // Invalidate conversation queries to update unread counts
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });
    }
  }, [user, friendId, query.data, queryClient]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !friendId) return;

    const channel = supabase
      .channel(`messages-${user.id}-${friendId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add if it's part of this conversation
          if (
            (newMessage.sender_id === user.id && newMessage.recipient_id === friendId) ||
            (newMessage.sender_id === friendId && newMessage.recipient_id === user.id)
          ) {
            queryClient.setQueryData(
              ['messages', user.id, friendId],
              (old: Message[] | undefined) => [...(old || []), newMessage]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friendId, queryClient]);

  return query;
}

// Send a message
export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { recipient_id: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: data.recipient_id,
        content: data.content
      });

      if (error) throw error;

      // Get sender's profile for push notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const title = `Message from ${profile?.name || 'Someone'}`;
      const body = data.content.length > 100 ? data.content.substring(0, 100) + '...' : data.content;

      // Create notification record
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          user_id: data.recipient_id,
          actor_id: user.id,
          type: 'message',
          title,
          body,
          reference_id: user.id // Sender's ID so we can navigate to the chat
        })
        .select('id')
        .single();

      // Send push notification with notification ID
      sendPushNotification(
        data.recipient_id, 
        title, 
        body, 
        `/chat/${user.id}`,
        notification?.id
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['messages', user?.id, variables.recipient_id] 
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Get unread message count
export function useUnreadMessageCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['messages', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user
  });
}

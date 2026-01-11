import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Conversation {
  friendId: string;
  friendName: string;
  friendAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isFromMe: boolean;
}

// Sample conversations for demo
const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    friendId: 'sample-s1',
    friendName: 'Sarah M.',
    friendAvatarUrl: null,
    lastMessage: '🔥 You got this today!',
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 1,
    isFromMe: false
  },
  {
    friendId: 'sample-s2',
    friendName: 'Jake R.',
    friendAvatarUrl: null,
    lastMessage: '💪',
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    unreadCount: 0,
    isFromMe: false
  },
  {
    friendId: 'sample-s3',
    friendName: 'Morgan L.',
    friendAvatarUrl: null,
    lastMessage: '❤️ Crush those goals!',
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 0,
    isFromMe: false
  },
];

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      // Get all messages where user is sender or recipient
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!messages || messages.length === 0) return SAMPLE_CONVERSATIONS;

      // Group by conversation partner and get latest message
      const conversationsMap = new Map<string, {
        lastMessage: typeof messages[0];
        unreadCount: number;
      }>();

      messages.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        
        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            lastMessage: msg,
            unreadCount: 0
          });
        }
        
        // Count unread messages from this partner
        if (msg.sender_id !== user.id && !msg.read_at) {
          const conv = conversationsMap.get(partnerId)!;
          conv.unreadCount++;
        }
      });

      // Get all partner IDs
      const partnerIds = Array.from(conversationsMap.keys());
      
      if (partnerIds.length === 0) return SAMPLE_CONVERSATIONS;

      // Fetch partner profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build conversation list
      const conversations: Conversation[] = Array.from(conversationsMap.entries()).map(([partnerId, data]) => {
        const profile = profileMap.get(partnerId);
        return {
          friendId: partnerId,
          friendName: profile?.name || 'Unknown',
          friendAvatarUrl: profile?.avatar_url || null,
          lastMessage: data.lastMessage.content,
          lastMessageAt: data.lastMessage.created_at,
          unreadCount: data.unreadCount,
          isFromMe: data.lastMessage.sender_id === user.id
        };
      });

      // Sort by last message time (most recent first)
      conversations.sort((a, b) => 
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      return conversations;
    },
    enabled: !!user
  });
}

// Get total unread message count
export function useUnreadConversationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', 'unread-count', user?.id],
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

// Delete all messages in a conversation with a specific friend
export function useDeleteConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Delete messages where user is sender or recipient with this friend
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });
}

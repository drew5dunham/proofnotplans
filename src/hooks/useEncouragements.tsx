import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isToday, startOfDay } from 'date-fns';

interface Friend {
  id: string;
  name: string | null;
}

// Get friends who haven't posted today
export function useFriendsToEncourage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends-to-encourage', user?.id],
    queryFn: async (): Promise<Friend[]> => {
      if (!user) return [];

      // Get accepted friendships
      const { data: friendships, error: friendshipError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendshipError) throw friendshipError;
      if (!friendships || friendships.length === 0) return [];

      // Get friend IDs
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Get today's completions
      const todayStart = startOfDay(new Date()).toISOString();
      const { data: completions, error: completionsError } = await supabase
        .from('goal_completions')
        .select('user_id')
        .in('user_id', friendIds)
        .gte('completed_at', todayStart);

      if (completionsError) throw completionsError;

      // Filter out friends who have already posted
      const postedUserIds = new Set(completions?.map(c => c.user_id) || []);
      const friendsWhoHaventPosted = friendIds.filter(id => !postedUserIds.has(id));

      if (friendsWhoHaventPosted.length === 0) return [];

      // Get friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', friendsWhoHaventPosted);

      if (profilesError) throw profilesError;

      return profiles || [];
    },
    enabled: !!user
  });
}

// Send encouragement
export function useSendEncouragement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      recipient_id: string;
      emoji: string | null;
      message: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('encouragements').insert({
        sender_id: user.id,
        recipient_id: data.recipient_id,
        emoji: data.emoji,
        message: data.message
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encouragements'] });
    }
  });
}

// Get received encouragements
export function useReceivedEncouragements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['encouragements', 'received', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('encouragements')
        .select(`
          *,
          sender:profiles!encouragements_sender_id_fkey(id, name)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Fallback without join if foreign key doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('encouragements')
          .select('*')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }

      return data || [];
    },
    enabled: !!user
  });
}

// Get unread encouragement count
export function useUnreadEncouragementCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['encouragements', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('encouragements')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user
  });
}

// Mark encouragements as read
export function useMarkEncouragementRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (encouragementId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('encouragements')
        .update({ read_at: new Date().toISOString() })
        .eq('id', encouragementId)
        .eq('recipient_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encouragements'] });
    }
  });
}

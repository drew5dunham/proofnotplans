import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Friend {
  id: string;
  name: string | null;
}

// Get accepted friends for a specific user
export function useFriends(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['friends', targetUserId],
    queryFn: async (): Promise<Friend[]> => {
      if (!targetUserId) return [];

      // Get all accepted friendships where user is either user_id or friend_id
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);

      if (error) throw error;
      if (!friendships || friendships.length === 0) return [];

      // Extract the friend IDs (the one that isn't the target user)
      const friendIds = friendships.map(f => 
        f.user_id === targetUserId ? f.friend_id : f.user_id
      );

      // Get profiles for all friends
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      return profiles || [];
    },
    enabled: !!targetUserId,
  });
}

// Get friend count for a specific user
export function useFriendCount(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['friend-count', targetUserId],
    queryFn: async (): Promise<number> => {
      if (!targetUserId) return 0;

      const { count, error } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!targetUserId,
  });
}

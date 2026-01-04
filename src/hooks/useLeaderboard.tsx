import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: string;
  subtitle: string;
  isYou: boolean;
}

export function useLeaderboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leaderboard', user?.id],
    queryFn: async () => {
      if (!user) return { mostConsistent: [], mostImproved: [] };

      // Get accepted friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      // Extract friend IDs
      const friendIds = new Set<string>();
      friendships?.forEach(f => {
        if (f.user_id === user.id) friendIds.add(f.friend_id);
        else friendIds.add(f.user_id);
      });

      // Include current user
      const allUserIds = [user.id, ...Array.from(friendIds)];

      if (allUserIds.length === 0) {
        return { mostConsistent: [], mostImproved: [] };
      }

      // Get profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Date ranges
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });

      // Get goals for all users to calculate total possible completions
      const { data: goals } = await supabase
        .from('goals')
        .select('id, user_id')
        .in('user_id', allUserIds)
        .eq('is_active', true);

      const goalsPerUser = new Map<string, number>();
      goals?.forEach(g => {
        goalsPerUser.set(g.user_id, (goalsPerUser.get(g.user_id) || 0) + 1);
      });

      // Get this week's completions
      const { data: thisWeekCompletions } = await supabase
        .from('goal_completions')
        .select('user_id, status')
        .in('user_id', allUserIds)
        .gte('completed_at', thisWeekStart.toISOString())
        .lte('completed_at', thisWeekEnd.toISOString())
        .eq('status', 'completed');

      // Get last week's completions
      const { data: lastWeekCompletions } = await supabase
        .from('goal_completions')
        .select('user_id, status')
        .in('user_id', allUserIds)
        .gte('completed_at', lastWeekStart.toISOString())
        .lte('completed_at', lastWeekEnd.toISOString())
        .eq('status', 'completed');

      // Calculate stats per user
      const thisWeekCounts = new Map<string, number>();
      thisWeekCompletions?.forEach(c => {
        thisWeekCounts.set(c.user_id, (thisWeekCounts.get(c.user_id) || 0) + 1);
      });

      const lastWeekCounts = new Map<string, number>();
      lastWeekCompletions?.forEach(c => {
        lastWeekCounts.set(c.user_id, (lastWeekCounts.get(c.user_id) || 0) + 1);
      });

      // Build leaderboard entries
      const consistencyData: LeaderboardEntry[] = [];
      const improvementData: LeaderboardEntry[] = [];

      allUserIds.forEach(userId => {
        const profile = profileMap.get(userId);
        const totalGoals = goalsPerUser.get(userId) || 0;
        const thisWeekCount = thisWeekCounts.get(userId) || 0;
        const lastWeekCount = lastWeekCounts.get(userId) || 0;

        // Calculate days elapsed this week (1-7)
        const daysThisWeek = Math.min(7, Math.ceil((now.getTime() - thisWeekStart.getTime()) / (1000 * 60 * 60 * 24)));
        const maxPossibleThisWeek = totalGoals * daysThisWeek;
        const consistencyPercent = maxPossibleThisWeek > 0 
          ? Math.round((thisWeekCount / maxPossibleThisWeek) * 100) 
          : 0;

        // Improvement: compare this week's count to last week's
        const improvement = lastWeekCount > 0 
          ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
          : thisWeekCount > 0 ? 100 : 0;

        const entry = {
          userId,
          name: userId === user.id ? 'You' : (profile?.name || 'Unknown'),
          avatarUrl: profile?.avatar_url || null,
          isYou: userId === user.id,
        };

        if (totalGoals > 0) {
          consistencyData.push({
            ...entry,
            score: `${consistencyPercent}%`,
            subtitle: `${thisWeekCount}/${maxPossibleThisWeek} completed`,
          });
        }

        improvementData.push({
          ...entry,
          score: improvement >= 0 ? `+${improvement}%` : `${improvement}%`,
          subtitle: 'vs last week',
        });
      });

      // Sort by score (descending)
      consistencyData.sort((a, b) => {
        const aVal = parseInt(a.score);
        const bVal = parseInt(b.score);
        return bVal - aVal;
      });

      improvementData.sort((a, b) => {
        const aVal = parseInt(a.score.replace('+', ''));
        const bVal = parseInt(b.score.replace('+', ''));
        return bVal - aVal;
      });

      return {
        mostConsistent: consistencyData.slice(0, 10),
        mostImproved: improvementData.slice(0, 10),
      };
    },
    enabled: !!user,
  });
}

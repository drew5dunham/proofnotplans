import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Returns a Set of goal IDs that have been reported today (user's local timezone)
 */
export function useTodayCompletions() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['today-completions', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();

      // Get start of today in user's local timezone
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const { data, error } = await supabase
        .from('goal_completions')
        .select('goal_id, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', startOfToday.toISOString());

      if (error) throw error;

      // Filter completions to only those from today in user's local timezone
      const todayGoalIds = new Set<string>();
      for (const completion of data || []) {
        const completionDate = new Date(completion.completed_at);
        const completionLocalDate = new Date(
          completionDate.getFullYear(),
          completionDate.getMonth(),
          completionDate.getDate()
        );
        
        if (completionLocalDate.getTime() === startOfToday.getTime()) {
          todayGoalIds.add(completion.goal_id);
        }
      }

      return todayGoalIds;
    },
    enabled: !!user,
  });

  return {
    todayCompletedGoalIds: query.data || new Set<string>(),
    isLoading: query.isLoading,
  };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import type { Frequency } from '@/types';

interface CompletionWithGoal {
  goal_id: string;
  completed_at: string;
  goals: {
    frequency: string;
  } | null;
}

/**
 * Returns a Map of goal IDs to whether they've been completed this period
 * based on their frequency (daily/weekly/monthly)
 */
export function usePeriodCompletions() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['period-completions', user?.id],
    queryFn: async () => {
      if (!user) return new Map<string, boolean>();

      const now = new Date();
      const startOfToday = startOfDay(now);
      const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const startOfThisMonth = startOfMonth(now);
      
      // Get completions from start of month (covers all periods)
      const { data, error } = await supabase
        .from('goal_completions')
        .select('goal_id, completed_at, goals!inner(frequency)')
        .eq('user_id', user.id)
        .gte('completed_at', startOfThisMonth.toISOString());

      if (error) throw error;

      const completedThisPeriod = new Map<string, boolean>();
      
      for (const completion of (data as CompletionWithGoal[]) || []) {
        const frequency = (completion.goals?.frequency || 'daily') as Frequency;
        const completionDate = new Date(completion.completed_at);
        
        let isCompletedThisPeriod = false;
        
        switch (frequency) {
          case 'daily':
            isCompletedThisPeriod = completionDate >= startOfToday;
            break;
          case 'weekly':
            isCompletedThisPeriod = completionDate >= startOfThisWeek;
            break;
          case 'monthly':
            isCompletedThisPeriod = completionDate >= startOfThisMonth;
            break;
        }
        
        if (isCompletedThisPeriod) {
          completedThisPeriod.set(completion.goal_id, true);
        }
      }

      return completedThisPeriod;
    },
    enabled: !!user,
  });

  return {
    completedThisPeriodMap: query.data || new Map<string, boolean>(),
    isCompletedThisPeriod: (goalId: string) => query.data?.get(goalId) ?? false,
    isLoading: query.isLoading,
  };
}

/**
 * Helper to get a user-friendly label for when the goal can be reported again
 */
export function getNextReportLabel(frequency: Frequency): string {
  switch (frequency) {
    case 'daily':
      return 'Report again tomorrow';
    case 'weekly':
      return 'Report again next week';
    case 'monthly':
      return 'Report again next month';
    default:
      return 'Report again tomorrow';
  }
}

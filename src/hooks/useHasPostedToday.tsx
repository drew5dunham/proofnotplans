import { useCompletions } from '@/hooks/useGoals';
import { useAuth } from '@/hooks/useAuth';
import { isToday } from 'date-fns';

export function useHasPostedToday() {
  const { user } = useAuth();
  const { data: completions, isLoading } = useCompletions();

  const hasPostedToday = completions?.some(
    (c) => isToday(new Date(c.completed_at))
  ) ?? false;

  return {
    hasPostedToday,
    isLoading,
    isLoggedIn: !!user,
  };
}

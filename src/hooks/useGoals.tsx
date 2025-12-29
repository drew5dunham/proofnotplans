import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Category } from '@/types';

export interface DbGoal {
  id: string;
  user_id: string;
  name: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface DbCompletion {
  id: string;
  goal_id: string;
  user_id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  completed_at: string;
  goals?: DbGoal;
}

export interface GoalWithStats extends DbGoal {
  completionCount: number;
  lastCompleted: string | null;
}

export function useGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const goalsQuery = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DbGoal[];
    },
    enabled: !!user,
  });

  const goalsWithStatsQuery = useQuery({
    queryKey: ['goals-with-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (goalsError) throw goalsError;
      
      // Fetch completions for all goals
      const { data: completions, error: completionsError } = await supabase
        .from('goal_completions')
        .select('goal_id, completed_at')
        .eq('user_id', user.id);
      
      if (completionsError) throw completionsError;
      
      // Calculate stats for each goal
      const goalsWithStats: GoalWithStats[] = (goals || []).map((goal) => {
        const goalCompletions = (completions || []).filter(c => c.goal_id === goal.id);
        const sortedCompletions = goalCompletions.sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );
        
        return {
          ...goal,
          completionCount: goalCompletions.length,
          lastCompleted: sortedCompletions[0]?.completed_at || null,
        };
      });
      
      return goalsWithStats;
    },
    enabled: !!user,
  });

  const addGoalMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: Category }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name,
          category,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-with-stats'] });
      toast({ title: 'Goal added!' });
    },
    onError: () => {
      toast({ title: 'Failed to add goal', variant: 'destructive' });
    },
  });

  const removeGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-with-stats'] });
    },
  });

  const completeGoalMutation = useMutation({
    mutationFn: async ({
      goalId,
      caption,
      mediaType,
      mediaUrl,
    }: {
      goalId: string;
      caption?: string;
      mediaType?: 'photo' | 'text';
      mediaUrl?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('goal_completions')
        .insert({
          goal_id: goalId,
          user_id: user.id,
          caption,
          media_type: mediaType,
          media_url: mediaUrl,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['completions'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast({ title: 'Goal completed!' });
    },
    onError: () => {
      toast({ title: 'Failed to complete goal', variant: 'destructive' });
    },
  });

  return {
    goals: goalsQuery.data || [],
    goalsWithStats: goalsWithStatsQuery.data || [],
    isLoading: goalsQuery.isLoading || goalsWithStatsQuery.isLoading,
    addGoal: addGoalMutation.mutate,
    removeGoal: removeGoalMutation.mutate,
    completeGoal: completeGoalMutation.mutate,
    isAdding: addGoalMutation.isPending,
    isCompleting: completeGoalMutation.isPending,
  };
}

export function useCompletions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['completions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('goal_completions')
        .select(`
          *,
          goals (*)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data as DbCompletion[];
    },
    enabled: !!user,
  });
}

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_completions')
        .select(`
          *,
          goals (*)
        `)
        .order('completed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as DbCompletion[];
    },
  });
}

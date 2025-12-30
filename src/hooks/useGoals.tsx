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
  what_went_well: string | null;
  what_was_hard: string | null;
  status: 'completed' | 'missed';
  goals?: DbGoal;
  profiles?: { name: string | null };
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
      whatWentWell,
      whatWasHard,
      status = 'completed',
    }: {
      goalId: string;
      caption?: string;
      mediaType?: 'photo' | 'text';
      mediaUrl?: string;
      whatWentWell?: string;
      whatWasHard?: string;
      status?: 'completed' | 'missed';
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
          what_went_well: whatWentWell,
          what_was_hard: whatWasHard,
          status,
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
      toast({ title: 'Posted to feed!' });
    },
    onError: () => {
      toast({ title: 'Failed to post', variant: 'destructive' });
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

// Sample posts to show social activity
const SAMPLE_POSTS: DbCompletion[] = [
  {
    id: 'sample-1',
    goal_id: 'sample-goal-1',
    user_id: 'sample-user-1',
    completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: 'Got up early and the weather was perfect. Felt amazing after!',
    what_was_hard: 'That first step out of bed is always the hardest. Almost hit snooze 3 times.',
    status: 'completed',
    goals: { id: 'sample-goal-1', user_id: 'sample-user-1', name: 'Morning run', category: 'fitness', is_active: true, created_at: '' },
    profiles: { name: 'Sarah M.' },
  },
  {
    id: 'sample-2',
    goal_id: 'sample-goal-2',
    user_id: 'sample-user-2',
    completed_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: 'Finished a whole chapter of Atomic Habits. Taking notes helped me stay focused.',
    what_was_hard: 'My phone kept buzzing. Had to put it in another room.',
    status: 'completed',
    goals: { id: 'sample-goal-2', user_id: 'sample-user-2', name: 'Read 30 minutes', category: 'learning', is_active: true, created_at: '' },
    profiles: { name: 'Jake R.' },
  },
  {
    id: 'sample-3',
    goal_id: 'sample-goal-3',
    user_id: 'sample-user-3',
    completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: null,
    what_was_hard: 'Woke up with a headache and just could not focus. Tried for 10 minutes but had to stop.',
    status: 'missed',
    goals: { id: 'sample-goal-3', user_id: 'sample-user-3', name: 'Practice guitar', category: 'creative', is_active: true, created_at: '' },
    profiles: { name: 'Emma L.' },
  },
  {
    id: 'sample-4',
    goal_id: 'sample-goal-4',
    user_id: 'sample-user-4',
    completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: 'Prepped 5 healthy lunches for the week. Chicken, rice, and veggies.',
    what_was_hard: 'Took longer than expected. Need to get more efficient with chopping.',
    status: 'completed',
    goals: { id: 'sample-goal-4', user_id: 'sample-user-4', name: 'Meal prep', category: 'health', is_active: true, created_at: '' },
    profiles: { name: 'Marcus T.' },
  },
  {
    id: 'sample-5',
    goal_id: 'sample-goal-5',
    user_id: 'sample-user-1',
    completed_at: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: 'Actually felt present for once. My mind wandered less than usual.',
    what_was_hard: 'Kept thinking about my to-do list. Had to keep bringing focus back.',
    status: 'completed',
    goals: { id: 'sample-goal-5', user_id: 'sample-user-1', name: 'Meditate 10 min', category: 'health', is_active: true, created_at: '' },
    profiles: { name: 'Sarah M.' },
  },
  {
    id: 'sample-6',
    goal_id: 'sample-goal-6',
    user_id: 'sample-user-2',
    completed_at: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: 'Day 14 of cold showers! It is getting easier. Energy boost is real.',
    what_was_hard: 'That first 10 seconds never gets easier. Brain screams to get out.',
    status: 'completed',
    goals: { id: 'sample-goal-6', user_id: 'sample-user-2', name: 'Cold shower', category: 'health', is_active: true, created_at: '' },
    profiles: { name: 'Jake R.' },
  },
];

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
      
      // Fetch profile names for all unique user_ids
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);
      
      const realPosts = data.map((completion) => ({
        ...completion,
        profiles: { name: profileMap.get(completion.user_id) || null },
      })) as DbCompletion[];

      // Combine real posts with sample posts, real posts first
      return [...realPosts, ...SAMPLE_POSTS];
    },
  });
}

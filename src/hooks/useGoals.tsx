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
  visibility: 'public' | 'private';
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
  group_id: string | null;
  goals?: DbGoal;
  profiles?: { name: string | null; avatar_url?: string | null };
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
          visibility: (goal.visibility || 'public') as 'public' | 'private',
          completionCount: goalCompletions.length,
          lastCompleted: sortedCompletions[0]?.completed_at || null,
        };
      });
      
      return goalsWithStats;
    },
    enabled: !!user,
  });

  // Fetch inactive (past) goals with stats
  const inactiveGoalsWithStatsQuery = useQuery({
    queryKey: ['inactive-goals-with-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch inactive goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', false)
        .order('created_at', { ascending: false });
      
      if (goalsError) throw goalsError;
      
      if (!goals || goals.length === 0) return [];
      
      // Fetch completions for these goals
      const goalIds = goals.map(g => g.id);
      const { data: completions, error: completionsError } = await supabase
        .from('goal_completions')
        .select('goal_id, completed_at')
        .eq('user_id', user.id)
        .in('goal_id', goalIds);
      
      if (completionsError) throw completionsError;
      
      // Calculate stats for each goal
      const goalsWithStats: GoalWithStats[] = goals.map((goal) => {
        const goalCompletions = (completions || []).filter(c => c.goal_id === goal.id);
        const sortedCompletions = goalCompletions.sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );
        
        return {
          ...goal,
          visibility: (goal.visibility || 'public') as 'public' | 'private',
          completionCount: goalCompletions.length,
          lastCompleted: sortedCompletions[0]?.completed_at || null,
        };
      });
      
      return goalsWithStats;
    },
    enabled: !!user,
  });

  const addGoalMutation = useMutation({
    mutationFn: async ({ name, category, visibility = 'public' }: { name: string; category: Category; visibility?: 'public' | 'private' }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name,
          category,
          visibility,
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
      queryClient.invalidateQueries({ queryKey: ['inactive-goals-with-stats'] });
    },
  });

  const toggleGoalActiveMutation = useMutation({
    mutationFn: async ({ goalId, isActive }: { goalId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: isActive })
        .eq('id', goalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-goals-with-stats'] });
      toast({ title: 'Goal updated!' });
    },
    onError: () => {
      toast({ title: 'Failed to update goal', variant: 'destructive' });
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
      groupId,
    }: {
      goalId: string;
      caption?: string;
      mediaType?: 'photo' | 'text';
      mediaUrl?: string;
      whatWentWell?: string;
      whatWasHard?: string;
      status?: 'completed' | 'missed';
      groupId?: string;
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
          group_id: groupId || null,
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
      queryClient.invalidateQueries({ queryKey: ['today-completions'] });
      toast({ title: 'Posted to feed!' });
    },
    onError: () => {
      toast({ title: 'Failed to post', variant: 'destructive' });
    },
  });

  const deleteCompletionMutation = useMutation({
    mutationFn: async (completionId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('goal_completions')
        .delete()
        .eq('id', completionId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['completions'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['today-completions'] });
      toast({ title: 'Post deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
    },
  });

  return {
    goals: goalsQuery.data || [],
    goalsWithStats: goalsWithStatsQuery.data || [],
    inactiveGoalsWithStats: inactiveGoalsWithStatsQuery.data || [],
    isLoading: goalsQuery.isLoading || goalsWithStatsQuery.isLoading,
    isLoadingInactive: inactiveGoalsWithStatsQuery.isLoading,
    addGoal: addGoalMutation.mutate,
    removeGoal: removeGoalMutation.mutate,
    toggleGoalActive: (goalId: string, isActive: boolean) => 
      toggleGoalActiveMutation.mutate({ goalId, isActive }),
    completeGoal: completeGoalMutation.mutate,
    deleteCompletion: deleteCompletionMutation.mutate,
    isAdding: addGoalMutation.isPending,
    isToggling: toggleGoalActiveMutation.isPending,
    isCompleting: completeGoalMutation.isPending,
    isDeleting: deleteCompletionMutation.isPending,
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First, get accepted friends
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      // Build list of user IDs to show in feed (self + friends)
      const friendIds = new Set<string>();
      friendIds.add(user.id); // Include own posts
      
      for (const f of friendships || []) {
        if (f.user_id === user.id) {
          friendIds.add(f.friend_id);
        } else {
          friendIds.add(f.user_id);
        }
      }

      const userIdsArray = Array.from(friendIds);

      // Fetch completions from self and friends only
      const { data, error } = await supabase
        .from('goal_completions')
        .select(`
          *,
          goals (*)
        `)
        .in('user_id', userIdsArray)
        .order('completed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Fetch profile names and avatars for all unique user_ids
      const postUserIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', postUserIds);
      
      const profileMap = new Map(profiles?.map((p) => [p.id, { name: p.name, avatar_url: p.avatar_url }]) || []);
      
      return data.map((completion) => ({
        ...completion,
        profiles: profileMap.get(completion.user_id) || { name: null, avatar_url: null },
      })) as DbCompletion[];
    },
    enabled: !!user,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserSettings {
  id: string;
  user_id: string;
  push_notifications_enabled: boolean;
  daily_reminder_time: string | null;
  friend_activity_notifications: boolean;
  profile_visibility: 'public' | 'friends_and_groups' | 'private';
  default_goal_visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async (): Promise<UserSettings | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no settings exist, create default settings
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('user_settings')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (insertError) {
            console.error('Error creating settings:', insertError);
            return null;
          }
          return newSettings as UserSettings;
        }
        console.error('Error fetching settings:', error);
        return null;
      }

      return data as UserSettings;
    },
    enabled: !!user
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: updateSettingsMutation.mutate,
    updateSettingsAsync: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending
  };
}

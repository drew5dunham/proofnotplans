import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { sendPushNotification } from '@/lib/pushNotifications';

export interface Comment {
  id: string;
  completion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    id: string;
    name: string | null;
    avatar_url?: string | null;
  };
}

// Get comments for a post
export function useComments(completionId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['comments', completionId],
    queryFn: async (): Promise<Comment[]> => {
      if (!completionId) return [];

      // Skip for sample posts
      if (completionId.startsWith('sample-')) {
        return getSampleComments(completionId);
      }

      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('completion_id', completionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      // Fetch profiles separately
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return comments.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || { id: comment.user_id, name: null }
      }));
    },
    enabled: !!completionId
  });

  // Real-time subscription for new comments
  useEffect(() => {
    if (!completionId || completionId.startsWith('sample-')) return;

    const channel = supabase
      .channel(`comments-${completionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `completion_id=eq.${completionId}`
        },
        async (payload) => {
          // Fetch the comment with profile
          const newComment = payload.new as any;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', newComment.user_id)
            .maybeSingle();

          const commentWithProfile: Comment = {
            ...newComment,
            profiles: profile || { id: newComment.user_id, name: null }
          };

          queryClient.setQueryData(
            ['comments', completionId],
            (old: Comment[] | undefined) => [...(old || []), commentWithProfile]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [completionId, queryClient]);

  return query;
}

// Get comment count for a post
export function useCommentCount(completionId: string | null) {
  return useQuery({
    queryKey: ['comment-count', completionId],
    queryFn: async () => {
      if (!completionId) return 0;

      // Return sample count for sample posts
      if (completionId.startsWith('sample-')) {
        return Math.floor(Math.random() * 5);
      }

      const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('completion_id', completionId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!completionId
  });
}

// Add a comment
export function useAddComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      completion_id: string; 
      content: string;
      post_author_id: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Skip for sample posts
      if (data.completion_id.startsWith('sample-')) {
        return;
      }

      // Add the comment
      const { error: commentError } = await supabase.from('comments').insert({
        completion_id: data.completion_id,
        user_id: user.id,
        content: data.content
      });

      if (commentError) throw commentError;

      // Create notification for post author (if not commenting on own post)
      if (data.post_author_id !== user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        const title = `${profile?.name || 'Someone'} commented on your post`;
        const body = data.content.substring(0, 100);

        await supabase.from('notifications').insert({
          user_id: data.post_author_id,
          type: 'comment',
          title,
          body,
          reference_id: data.completion_id,
          actor_id: user.id
        });

        // Send push notification with post ID in URL
        sendPushNotification(data.post_author_id, title, body, `/?post=${data.completion_id}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.completion_id] });
      queryClient.invalidateQueries({ queryKey: ['comment-count', variables.completion_id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Sample comments for demo
function getSampleComments(completionId: string): Comment[] {
  const sampleComments: Record<string, Comment[]> = {
    'sample-1': [
      { id: 'sc-1', completion_id: 'sample-1', user_id: 'su-1', content: 'Amazing work! Keep it up! 💪', created_at: new Date(Date.now() - 3600000).toISOString(), profiles: { id: 'su-1', name: 'Alex C.' } },
      { id: 'sc-2', completion_id: 'sample-1', user_id: 'su-2', content: 'So inspiring!', created_at: new Date(Date.now() - 1800000).toISOString(), profiles: { id: 'su-2', name: 'Jordan S.' } },
    ],
    'sample-2': [
      { id: 'sc-3', completion_id: 'sample-2', user_id: 'su-3', content: 'Great progress!', created_at: new Date(Date.now() - 7200000).toISOString(), profiles: { id: 'su-3', name: 'Taylor K.' } },
    ],
  };
  return sampleComments[completionId] || [];
}

// Get user notifications
export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });
}

// Get unread notification count
export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user
  });
}

// Mark notification as read
export function useMarkNotificationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Delete a notification
export function useDeleteNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { FeedPost } from '@/components/FeedPost';
import { CategoryIcon, getCategoryLabel } from '@/components/CategoryIcon';
import { Button } from '@/components/ui/button';
import type { Category } from '@/types';
import type { DbCompletion } from '@/hooks/useGoals';

export default function GroupFeed() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  // Fetch group details
  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch group members
  const { data: members } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (error) throw error;
      return data?.map((m) => m.user_id) || [];
    },
    enabled: !!groupId,
  });

  // Fetch feed: public goals in the group's category for group members
  const { data: feed, isLoading: loadingFeed } = useQuery({
    queryKey: ['group-feed', groupId, group?.category, members],
    queryFn: async (): Promise<DbCompletion[]> => {
      if (!group || !members || members.length === 0) return [];

      // First get all public goals in this category for group members
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .in('user_id', members)
        .eq('category', group.category)
        .eq('visibility', 'public');

      if (goalsError) throw goalsError;
      if (!goals || goals.length === 0) return [];

      const goalIds = goals.map((g) => g.id);

      // Then get completions for those goals
      const { data: completions, error: completionsError } = await supabase
        .from('goal_completions')
        .select('*, goals(*)')
        .in('goal_id', goalIds)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (completionsError) throw completionsError;

      // Fetch user profiles for the completions
      const userIds = [...new Set((completions || []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (completions || []).map((c) => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
      })) as DbCompletion[];
    },
    enabled: !!group && !!members && members.length > 0,
  });

  const isLoading = loadingGroup || loadingFeed;

  if (!group && !loadingGroup) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Group" />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Group not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/profile')}>
            Back to Profile
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={group?.name || 'Group Feed'} />

      <main className="max-w-md mx-auto px-4">
        {/* Back button & group info */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft size={20} />
          </Button>
          {group && (
            <div className="flex-1">
              <h1 className="text-lg font-bold">{group.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="category-badge">
                  <CategoryIcon category={group.category as Category} size={12} />
                  <span>{getCategoryLabel(group.category as Category)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !feed || feed.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border">
            <Users size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete goals in the "{getCategoryLabel(group?.category as Category)}" category to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((post, index) => (
              <FeedPost key={post.id} post={post} index={index} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

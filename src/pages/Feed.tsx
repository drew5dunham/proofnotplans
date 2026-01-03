import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Target, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFeed, useCompletions, useGoals, DbCompletion } from '@/hooks/useGoals';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { FeedPost } from '@/components/FeedPost';
import { Paywall } from '@/components/Paywall';
import { Button } from '@/components/ui/button';
import { ReportGoalDialog } from '@/components/ReportGoalDialog';
import { GroupFilter } from '@/components/GroupFilter';
import { Link } from 'react-router-dom';
import { isToday } from 'date-fns';

export default function Feed() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightPostId = searchParams.get('post');
  const { data: feedPosts, isLoading: loadingFeed } = useFeed();
  const { data: myCompletions } = useCompletions();
  const { goals } = useGoals();
  const { groups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Clear the post param after initial load to clean up URL
  useEffect(() => {
    if (highlightPostId && !loadingFeed) {
      // Wait a bit for scroll/highlight, then clear URL param
      const timeout = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [highlightPostId, loadingFeed, setSearchParams]);

  // Get selected group details
  const selectedGroup = selectedGroupId 
    ? groups.find(g => g.id === selectedGroupId) 
    : null;

  // Fetch group-specific feed when a group is selected
  const { data: groupFeed, isLoading: loadingGroupFeed } = useQuery({
    queryKey: ['group-feed', selectedGroupId, selectedGroup?.category, selectedGroup?.members?.map(m => m.user_id)],
    queryFn: async (): Promise<DbCompletion[]> => {
      if (!selectedGroup) return [];
      
      const memberIds = selectedGroup.members.map(m => m.user_id);
      if (memberIds.length === 0) return [];

      // Get public goals in this category for group members
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, user_id, name, category, visibility, is_active, created_at')
        .in('user_id', memberIds)
        .eq('category', selectedGroup.category)
        .eq('visibility', 'public');

      if (goalsError) throw goalsError;
      if (!goalsData || goalsData.length === 0) return [];

      const goalIds = goalsData.map(g => g.id);

      // Get completions for those goals
      const { data: completions, error: completionsError } = await supabase
        .from('goal_completions')
        .select('*')
        .in('goal_id', goalIds)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (completionsError) throw completionsError;

      // Map goals and fetch profiles
      const userIds = [...new Set(completions?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      const goalMap = new Map(goalsData.map(g => [g.id, g]));

      return (completions || []).map(c => ({
        ...c,
        status: c.status as 'completed' | 'missed',
        goals: goalMap.get(c.goal_id),
        profiles: { name: profileMap.get(c.user_id) || null },
      })) as DbCompletion[];
    },
    enabled: !!selectedGroupId && !!selectedGroup,
  });

  // Check if user has reported today
  const hasReportedToday = myCompletions?.some(
    (c) => isToday(new Date(c.completed_at))
  );

  const hasGoals = goals && goals.length > 0;

  // Use group feed when a group is selected, otherwise use main feed
  const filteredPosts = selectedGroupId ? groupFeed : feedPosts;
  const isLoading = selectedGroupId ? loadingGroupFeed : loadingFeed;

  const headerRightAction = user && hasGoals ? (
    <ReportGoalDialog 
      trigger={
        <Button size="sm" className="h-9 rounded-full px-4">
          <Plus size={16} className="mr-1.5" />
          Report
        </Button>
      }
    />
  ) : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Feed" rightAction={headerRightAction} />
      
      <main className="max-w-md mx-auto px-4">
        {/* Group Filter */}
        <div className="mb-4">
          <GroupFilter selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
        </div>

        {/* Report prompt for users who haven't posted today */}
        {user && !hasReportedToday && (
          <div className="mb-4 p-4 bg-primary/10 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-xl">
                <Target size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">
                  Report on your goal to post
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete a goal and share your reflection to join the feed.
                </p>
                {hasGoals ? (
                  <ReportGoalDialog 
                    trigger={
                      <Button size="sm" className="mt-3 rounded-full">
                        <Plus size={16} className="mr-1.5" />
                        Report Now
                      </Button>
                    }
                  />
                ) : (
                  <Button asChild size="sm" className="mt-3 rounded-full">
                    <Link to="/goals">Add Goals First</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {filteredPosts && filteredPosts.map((post, index) => (
              <FeedPost 
                key={post.id} 
                post={post} 
                index={index} 
                autoOpenComments={post.id === highlightPostId}
              />
            ))}

            {(!filteredPosts || filteredPosts.length === 0) && (
              <div className="py-12 text-center bg-card rounded-2xl">
                <p className="text-muted-foreground">
                  {selectedGroupId ? 'No posts in this group yet.' : 'No posts yet.'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Be the first to report on a goal!
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
      <Paywall />
    </div>
  );
}

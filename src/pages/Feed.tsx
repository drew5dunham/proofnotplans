import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Target, Plus, Users } from 'lucide-react';
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
import { UserAvatar } from '@/components/UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddFriendsPrompt } from '@/components/AddFriendsPrompt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { isToday } from 'date-fns';

export default function Feed() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightPostId = searchParams.get('post');
  const { data: feedPosts, isLoading: loadingFeed } = useFeed();
  const { data: myCompletions } = useCompletions();
  const { goals, deleteCompletion, isDeleting } = useGoals();
  const { groups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    if (highlightPostId && !loadingFeed) {
      const timeout = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [highlightPostId, loadingFeed, setSearchParams]);

  const selectedGroup = selectedGroupId 
    ? groups.find(g => g.id === selectedGroupId) 
    : null;

  const { data: groupFeed, isLoading: loadingGroupFeed } = useQuery({
    queryKey: ['group-feed', selectedGroupId, selectedGroup?.category, selectedGroup?.members?.map(m => m.user_id)],
    queryFn: async (): Promise<DbCompletion[]> => {
      if (!selectedGroup) return [];
      const memberIds = selectedGroup.members.map(m => m.user_id);
      if (memberIds.length === 0) return [];

      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, user_id, name, category, visibility, is_active, created_at')
        .in('user_id', memberIds)
        .eq('category', selectedGroup.category)
        .eq('visibility', 'public');

      if (goalsError) throw goalsError;
      if (!goalsData || goalsData.length === 0) return [];

      const goalIds = goalsData.map(g => g.id);

      const { data: completions, error: completionsError } = await supabase
        .from('goal_completions')
        .select('*')
        .in('goal_id', goalIds)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (completionsError) throw completionsError;

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

  const hasReportedToday = myCompletions?.some(
    (c) => isToday(new Date(c.completed_at))
  );

  const hasGoals = goals && goals.length > 0;
  const filteredPosts = selectedGroupId ? groupFeed : feedPosts;
  const isLoading = selectedGroupId ? loadingGroupFeed : loadingFeed;

  const headerRightAction = user && hasGoals ? (
    <ReportGoalDialog 
      trigger={
        <Button size="sm" className="h-9 rounded-full px-4 font-display font-bold">
          <Plus size={16} className="mr-1.5" />
          Report
        </Button>
      }
    />
  ) : null;

  return (
    <div className="min-h-screen bg-background pb-28" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      <Header title="Feed" rightAction={headerRightAction} />
      
      <main className="max-w-md mx-auto px-4">
        {/* Group Filter */}
        <div className="mb-4">
          <GroupFilter selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
          {selectedGroup && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setMembersOpen(true)}
                className="text-xs text-primary hover:text-primary/80 underline cursor-pointer transition-colors"
              >
                {selectedGroup.member_count} member{selectedGroup.member_count !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>

        {/* Report prompt */}
        {user && !hasReportedToday && (
          <div className="mb-4 p-5 bg-primary/8 border border-primary/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-primary/15 text-primary rounded-xl">
                <Target size={20} />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-foreground text-sm">
                  Report on your goal to post
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete a goal and share your reflection to join the feed.
                </p>
                {hasGoals ? (
                  <ReportGoalDialog 
                    trigger={
                      <Button size="sm" className="mt-3 rounded-full font-display font-bold">
                        <Plus size={16} className="mr-1.5" />
                        Report Now
                      </Button>
                    }
                  />
                ) : (
                  <Button asChild size="sm" className="mt-3 rounded-full font-display font-bold">
                    <Link to="/goals?add=true">Add Goals First</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <AddFriendsPrompt />

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
                currentUserId={user?.id}
                onDelete={deleteCompletion}
                isDeleting={isDeleting}
              />
            ))}

            {(!filteredPosts || filteredPosts.length === 0) && (
              <div className="py-12 text-center bg-card rounded-2xl border border-border/50">
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

      {/* Group members modal */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Users size={18} />
              {selectedGroup?.name} Members
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {selectedGroup?.members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <UserAvatar name={member.name || undefined} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.name || 'Unknown'}
                    </p>
                    {member.user_id === selectedGroup?.created_by && (
                      <p className="text-xs text-muted-foreground">Creator</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

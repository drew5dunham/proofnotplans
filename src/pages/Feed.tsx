import { useState } from 'react';
import { Loader2, Target, Plus } from 'lucide-react';
import { useFeed, useCompletions, useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/hooks/useAuth';
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
  const { data: feedPosts, isLoading } = useFeed();
  const { data: myCompletions } = useCompletions();
  const { goals } = useGoals();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Check if user has reported today
  const hasReportedToday = myCompletions?.some(
    (c) => isToday(new Date(c.completed_at))
  );

  const hasGoals = goals && goals.length > 0;

  // Filter posts by group
  const filteredPosts = feedPosts?.filter((post) => {
    if (!selectedGroupId) return true;
    return post.group_id === selectedGroupId;
  });

  const headerRightAction = user && hasGoals ? (
    <ReportGoalDialog 
      trigger={
        <Button size="sm" variant="outline" className="h-8 text-xs">
          <Plus size={14} className="mr-1" />
          Report
        </Button>
      }
    />
  ) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Feed" rightAction={headerRightAction} />
      
      <main className="max-w-md mx-auto px-4">
        {/* Group Filter */}
        <div className="mb-4">
          <GroupFilter selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
        </div>

        {/* Report prompt for users who haven't posted today */}
        {user && !hasReportedToday && (
          <div className="mb-4 p-4 bg-accent/10 border border-accent/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent/20 text-accent">
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
                      <Button size="sm" className="mt-3">
                        <Plus size={16} className="mr-1.5" />
                        Report Now
                      </Button>
                    }
                  />
                ) : (
                  <Button asChild size="sm" className="mt-3">
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
              <FeedPost key={post.id} post={post} index={index} />
            ))}

            {(!filteredPosts || filteredPosts.length === 0) && (
              <div className="py-12 text-center">
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

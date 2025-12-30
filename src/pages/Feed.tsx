import { Loader2, Target, Plus } from 'lucide-react';
import { useFeed, useCompletions, useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { FeedPost } from '@/components/FeedPost';
import { Paywall } from '@/components/Paywall';
import { Button } from '@/components/ui/button';
import { ReportGoalDialog } from '@/components/ReportGoalDialog';
import { Link } from 'react-router-dom';
import { isToday } from 'date-fns';

export default function Feed() {
  const { user } = useAuth();
  const { data: feedPosts, isLoading } = useFeed();
  const { data: myCompletions } = useCompletions();
  const { goals } = useGoals();

  // Check if user has reported today
  const hasReportedToday = myCompletions?.some(
    (c) => isToday(new Date(c.completed_at))
  );

  const hasGoals = goals && goals.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Feed" />
      
      <main className="max-w-md mx-auto px-4">
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

        {/* Floating report button for users who have already posted today */}
        {user && hasReportedToday && hasGoals && (
          <div className="mb-4">
            <ReportGoalDialog 
              trigger={
                <Button className="w-full" variant="outline">
                  <Plus size={16} className="mr-1.5" />
                  Report on a Goal
                </Button>
              }
            />
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {feedPosts && feedPosts.map((post, index) => (
              <FeedPost key={post.id} post={post} index={index} />
            ))}

            {(!feedPosts || feedPosts.length === 0) && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No posts yet.</p>
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

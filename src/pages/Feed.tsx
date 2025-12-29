import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { FeedPost } from '@/components/FeedPost';
import { WeeklySummaryPost } from '@/components/WeeklySummaryPost';
import { Paywall } from '@/components/Paywall';

export default function Feed() {
  const { feedPosts } = useAppStore();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Feed" />
      
      <main className="max-w-md mx-auto px-4">
        {/* Weekly summary at top */}
        <WeeklySummaryPost
          userName="Marcus"
          goalsCompleted={7}
          goalsAttempted={9}
          index={0}
        />

        {/* Feed posts */}
        {feedPosts.map((post, index) => (
          <FeedPost key={post.id} post={post} index={index + 1} />
        ))}

        {feedPosts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No completions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete a goal to post.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
      <Paywall />
    </div>
  );
}

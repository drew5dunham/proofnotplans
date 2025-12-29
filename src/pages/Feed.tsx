import { Loader2 } from 'lucide-react';
import { useFeed } from '@/hooks/useGoals';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { FeedPost } from '@/components/FeedPost';
import { Paywall } from '@/components/Paywall';

export default function Feed() {
  const { data: feedPosts, isLoading } = useFeed();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Feed" />
      
      <main className="max-w-md mx-auto px-4">
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
                <p className="text-muted-foreground">No completions yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete a goal to post.
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

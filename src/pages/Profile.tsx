import { motion } from 'framer-motion';
import { Flame, Target, Check, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { FeedPost } from '@/components/FeedPost';
import { Paywall } from '@/components/Paywall';

export default function Profile() {
  const { currentUser, feedPosts } = useAppStore();
  
  const userPosts = feedPosts.filter(post => post.userId === currentUser.id);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Profile</h1>
        <button className="p-2 text-muted-foreground hover:text-foreground">
          <Settings size={20} />
        </button>
      </header>

      <main className="max-w-md mx-auto">
        {/* User info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{currentUser.name}</h2>
              {currentUser.isPremium && (
                <span className="text-xs font-medium text-accent">Unlimited</span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="stat-block"
            >
              <div className="flex items-center gap-1 text-accent mb-1">
                <Flame size={16} />
              </div>
              <span className="text-xl font-bold">{currentUser.streak}</span>
              <span className="text-xs text-muted-foreground">day streak</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="stat-block"
            >
              <div className="flex items-center gap-1 text-accent mb-1">
                <Target size={16} />
              </div>
              <span className="text-xl font-bold">{currentUser.completionRate}%</span>
              <span className="text-xs text-muted-foreground">completion</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="stat-block"
            >
              <div className="flex items-center gap-1 text-accent mb-1">
                <Check size={16} />
              </div>
              <span className="text-xl font-bold">{currentUser.totalCompleted}</span>
              <span className="text-xs text-muted-foreground">completed</span>
            </motion.div>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Your Timeline</h3>
        </div>

        <div className="px-4">
          {userPosts.map((post, index) => (
            <FeedPost key={post.id} post={post} index={index} />
          ))}

          {userPosts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No completions yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your posts will appear here.
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
      <Paywall />
    </div>
  );
}

import { motion } from 'framer-motion';
import { Flame, Target, Check, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGoals, useCompletions } from '@/hooks/useGoals';
import { BottomNav } from '@/components/BottomNav';
import { Paywall } from '@/components/Paywall';
import { GoalProgressSection } from '@/components/GoalProgressSection';
import { GroupsSection } from '@/components/GroupsSection';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { goalsWithStats, isLoading: goalsLoading } = useGoals();
  const { data: completions, isLoading: completionsLoading } = useCompletions();

  const isLoading = goalsLoading || completionsLoading;
  const totalCompleted = completions?.length || 0;
  
  // Calculate streak (consecutive days with completions)
  const calculateStreak = () => {
    if (!completions || completions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completionDates = completions.map(c => {
      const date = new Date(c.completed_at);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    });
    
    const uniqueDates = [...new Set(completionDates)].sort((a, b) => b - a);
    
    let streak = 0;
    let currentDate = today.getTime();
    
    for (const date of uniqueDates) {
      if (date === currentDate || date === currentDate - 86400000) {
        streak++;
        currentDate = date;
      } else if (date < currentDate - 86400000) {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Profile</h1>
        <button 
          onClick={signOut}
          className="p-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-md mx-auto">
        {/* User info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{userName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
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
                <span className="text-xl font-bold">{streak}</span>
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
                <span className="text-xl font-bold">{goalsWithStats.length}</span>
                <span className="text-xs text-muted-foreground">active goals</span>
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
                <span className="text-xl font-bold">{totalCompleted}</span>
                <span className="text-xs text-muted-foreground">completed</span>
              </motion.div>
            </div>
          )}
        </div>

        {/* Groups Section */}
        <div className="px-4 py-4 border-b border-border">
          <GroupsSection />
        </div>

        {/* Goal Progress Section */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : goalsWithStats.length > 0 ? (
            <GoalProgressSection 
              goals={goalsWithStats} 
              completions={completions || []} 
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No goals yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add goals to start tracking.
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

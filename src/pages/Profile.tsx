import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Target, Check, LogOut, Loader2, Settings, ChevronDown, Archive } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGoals, useCompletions } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { BottomNav } from '@/components/BottomNav';
import { Paywall } from '@/components/Paywall';
import { GoalProgressSection } from '@/components/GoalProgressSection';
import { GroupsSection } from '@/components/GroupsSection';
import { FriendsListDialog } from '@/components/FriendsListDialog';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { goalsWithStats, inactiveGoalsWithStats, isLoading: goalsLoading, isLoadingInactive } = useGoals();
  const { data: completions, isLoading: completionsLoading } = useCompletions();
  const { profile, isLoading: profileLoading } = useProfile();
  const [pastGoalsOpen, setPastGoalsOpen] = useState(false);

  const isLoading = goalsLoading || completionsLoading || profileLoading;
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
  const userName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Profile</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {/* User info */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <AvatarUpload 
              currentAvatarUrl={profile?.avatar_url} 
              size="md"
              editable={true}
            />
            <div>
              <h2 className="text-2xl font-bold">{userName} 👋</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="stat-block"
              >
                <div className="flex items-center gap-1 text-orange-400 mb-1">
                  <Flame size={18} />
                </div>
                <span className="text-2xl font-bold">{streak}</span>
                <span className="text-xs text-muted-foreground">streak</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="stat-block"
              >
                <div className="flex items-center gap-1 text-primary mb-1">
                  <Target size={18} />
                </div>
                <span className="text-2xl font-bold">{goalsWithStats.length}</span>
                <span className="text-xs text-muted-foreground">goals</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="stat-block"
              >
                <div className="flex items-center gap-1 text-success mb-1">
                  <Check size={18} />
                </div>
                <span className="text-2xl font-bold">{totalCompleted}</span>
                <span className="text-xs text-muted-foreground">done</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <FriendsListDialog userName={userName} />
              </motion.div>
            </div>
          )}
        </div>

        {/* Groups Section */}
        <div className="px-4 py-4">
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
            <div className="py-12 text-center bg-card rounded-2xl">
              <p className="text-muted-foreground">No goals yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add goals to start tracking.
              </p>
            </div>
          )}
        </div>

        {/* Past Goals Section */}
        {inactiveGoalsWithStats.length > 0 && (
          <div className="px-4 pb-4">
            <Collapsible open={pastGoalsOpen} onOpenChange={setPastGoalsOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Archive size={16} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Past Goals</span>
                    <span className="text-xs text-muted-foreground">({inactiveGoalsWithStats.length})</span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`text-muted-foreground transition-transform ${pastGoalsOpen ? 'rotate-180' : ''}`} 
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                {isLoadingInactive ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <GoalProgressSection 
                    goals={inactiveGoalsWithStats} 
                    completions={completions || []} 
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </main>

      <BottomNav />
      <Paywall />
    </div>
  );
}

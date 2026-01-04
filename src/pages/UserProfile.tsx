import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Target, Check, ArrowLeft, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { GoalProgressSection } from '@/components/GoalProgressSection';
import { FriendsListDialog } from '@/components/FriendsListDialog';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import type { GoalWithStats, DbCompletion } from '@/hooks/useGoals';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarFullscreen, setAvatarFullscreen] = useState(false);
  const isOwnProfile = !!userId && !!user?.id && user.id === userId;

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', userId!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user's goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['user-goals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user's completions
  const { data: completions, isLoading: completionsLoading } = useQuery({
    queryKey: ['user-completions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_completions')
        .select('*, goals(*)')
        .eq('user_id', userId!)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data as DbCompletion[];
    },
    enabled: !!userId,
  });

  const isLoading = profileLoading || goalsLoading || completionsLoading;
  const totalCompleted = completions?.filter(c => c.status === 'completed').length || 0;

  // Calculate streak
  const calculateStreak = () => {
    if (!completions || completions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completionDates = completions
      .filter(c => c.status === 'completed')
      .map(c => {
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

  // Build goals with stats
  const goalsWithStats: GoalWithStats[] = (goals || []).map(goal => {
    const goalCompletions = (completions || []).filter(c => c.goal_id === goal.id);
    const completedCount = goalCompletions.filter(c => c.status === 'completed').length;
    const lastCompleted = goalCompletions.find(c => c.status === 'completed')?.completed_at;
    
    return {
      ...goal,
      visibility: (goal.visibility || 'public') as 'public' | 'private',
      completionCount: completedCount,
      lastCompleted: lastCompleted || null,
    };
  });

  const userName = profile?.name || 'User';

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold tracking-tight">{userName}'s Profile</h1>
      </header>

      <main className="max-w-md mx-auto">
        {/* User info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => profile?.avatar_url && setAvatarFullscreen(true)}
              className={profile?.avatar_url ? 'cursor-pointer' : 'cursor-default'}
            >
              <UserAvatar 
                name={userName} 
                avatarUrl={profile?.avatar_url}
                size="lg" 
              />
            </button>
            <div>
              <h2 className="text-xl font-bold">{userName}</h2>
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
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
                <span className="text-xs text-muted-foreground">streak</span>
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
                <span className="text-xl font-bold">{goals?.length || 0}</span>
                <span className="text-xs text-muted-foreground">goals</span>
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
                <span className="text-xs text-muted-foreground">done</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <FriendsListDialog userId={userId} userName={userName} />
              </motion.div>
            </div>
          )}
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
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Fullscreen avatar modal */}
      <AnimatePresence>
        {avatarFullscreen && profile?.avatar_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setAvatarFullscreen(false)}
          >
            <button
              onClick={() => setAvatarFullscreen(false)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
            >
              <X size={24} />
            </button>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-72 h-72 rounded-full overflow-hidden border-4 border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={profile.avatar_url}
                alt={`${userName}'s profile`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

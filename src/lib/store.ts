import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Goal, CompletedGoal, User, Category } from '@/types';

interface AppState {
  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => void;

  // User
  currentUser: User;
  
  // Goals
  activeGoals: Goal[];
  addGoal: (name: string, category: Category) => boolean;
  completeGoal: (goalId: string, mediaType?: 'photo' | 'video' | 'text', caption?: string, mediaUrl?: string) => void;
  removeGoal: (goalId: string) => void;

  // Feed
  feedPosts: CompletedGoal[];

  // Paywall
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  upgradeToPremium: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
      
      hasCompletedOnboarding: false,
      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

      currentUser: {
        id: 'u1',
        name: 'You',
        joinedAt: new Date(),
        isPremium: false,
        streak: 3,
        completionRate: 78,
        totalCompleted: 14,
      },

      activeGoals: [],
      
      addGoal: (name: string, category: Category) => {
        const { activeGoals, currentUser, setShowPaywall } = get();
        
        if (!currentUser.isPremium && activeGoals.length >= 3) {
          setShowPaywall(true);
          return false;
        }

        const newGoal: Goal = {
          id: crypto.randomUUID(),
          name,
          category,
          createdAt: new Date(),
          isActive: true,
        };

        set({ activeGoals: [...activeGoals, newGoal] });
        return true;
      },

      completeGoal: (goalId: string, mediaType?: 'photo' | 'video' | 'text', caption?: string, mediaUrl?: string) => {
        const { activeGoals, feedPosts, currentUser } = get();
        const goal = activeGoals.find(g => g.id === goalId);
        
        if (!goal) return;

        const completedPost: CompletedGoal = {
          id: crypto.randomUUID(),
          goalId,
          goalName: goal.name,
          category: goal.category,
          completedAt: new Date(),
          mediaType,
          mediaUrl,
          caption,
          userId: currentUser.id,
          userName: currentUser.name,
          reactions: [],
          comments: [],
        };

        set({
          activeGoals: activeGoals.filter(g => g.id !== goalId),
          feedPosts: [completedPost, ...feedPosts],
          currentUser: {
            ...currentUser,
            totalCompleted: currentUser.totalCompleted + 1,
          },
        });
      },

      removeGoal: (goalId: string) => {
        set({ activeGoals: get().activeGoals.filter(g => g.id !== goalId) });
      },

      feedPosts: [],

      showPaywall: false,
      setShowPaywall: (show: boolean) => set({ showPaywall: show }),
      
      upgradeToPremium: () => {
        set({
          currentUser: { ...get().currentUser, isPremium: true },
          showPaywall: false,
        });
      },
    }),
    {
      name: 'proof-app-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GoalCard } from '@/components/GoalCard';
import { AddGoalForm } from '@/components/AddGoalForm';
import { Paywall } from '@/components/Paywall';

export default function Goals() {
  const { goalsWithStats, isLoading } = useGoals();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="My Goals" />

      <main className="max-w-md mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {goalsWithStats.map((goal) => (
                <GoalCard key={goal.id} goal={goal} showStats />
              ))}
            </AnimatePresence>

            <AddGoalForm />

            {goalsWithStats.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No active goals. Add one to get started.
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

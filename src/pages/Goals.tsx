import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GoalCard } from '@/components/GoalCard';
import { AddGoalForm } from '@/components/AddGoalForm';
import { Paywall } from '@/components/Paywall';

export default function Goals() {
  const { activeGoals } = useAppStore();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Active Goals" />

      <main className="max-w-md mx-auto px-4 py-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </AnimatePresence>

        <AddGoalForm />

        {activeGoals.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No active goals. Add one to get started.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
      <Paywall />
    </div>
  );
}

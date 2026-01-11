import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2, Globe, Lock, Check, ToggleLeft, ToggleRight, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { useGoals, DbGoal, GoalWithStats } from '@/hooks/useGoals';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Category, Frequency } from '@/types';

const categories: Category[] = ['fitness', 'learning', 'creative', 'health', 'work', 'personal'];

type Visibility = 'public' | 'private';

const frequencies: { value: Frequency; label: string; icon: typeof Calendar }[] = [
  { value: 'daily', label: 'Daily', icon: Calendar },
  { value: 'weekly', label: 'Weekly', icon: CalendarDays },
  { value: 'monthly', label: 'Monthly', icon: CalendarRange },
];

interface MyGoalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyGoalsModal({ open, onOpenChange }: MyGoalsModalProps) {
  const { goalsWithStats, inactiveGoalsWithStats, addGoal, isAdding, toggleGoalActive, isToggling } = useGoals();
  const [showAddForm, setShowAddForm] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('personal');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [confirmDeactivate, setConfirmDeactivate] = useState<GoalWithStats | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;

    addGoal(
      { name: goalName.trim(), category: selectedCategory, visibility, frequency },
      {
        onSuccess: () => {
          setGoalName('');
          setSelectedCategory('personal');
          setVisibility('public');
          setFrequency('daily');
          setShowAddForm(false);
        },
      }
    );
  };

  const handleToggleActive = (goal: GoalWithStats) => {
    if (goal.is_active) {
      // Show confirmation before deactivating
      setConfirmDeactivate(goal);
    } else {
      // Reactivate without confirmation
      toggleGoalActive?.(goal.id, true);
    }
  };

  const confirmDeactivateGoal = () => {
    if (confirmDeactivate) {
      toggleGoalActive?.(confirmDeactivate.id, false);
      setConfirmDeactivate(null);
    }
  };

  const handleClose = () => {
    setShowAddForm(false);
    setGoalName('');
    setSelectedCategory('personal');
    setVisibility('public');
    setFrequency('daily');
    onOpenChange(false);
  };

  const getFrequencyLabel = (freq: Frequency) => {
    return frequencies.find(f => f.value === freq)?.label || 'Daily';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>My Goals</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Active Goals */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Active Goals ({goalsWithStats.length})
              </p>
              {goalsWithStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-xl">
                  No active goals yet
                </p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {goalsWithStats.map((goal) => (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{goal.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className="category-badge text-[10px]">
                              <CategoryIcon category={goal.category as Category} size={10} />
                              <span>{getCategoryLabel(goal.category as Category)}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {getFrequencyLabel(goal.frequency)}
                            </span>
                            {goal.visibility === 'private' && (
                              <Lock size={10} className="text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleActive(goal)}
                          disabled={isToggling}
                          className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                          title="Deactivate goal"
                        >
                          <ToggleRight size={20} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Inactive Goals */}
            {inactiveGoalsWithStats.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Inactive Goals ({inactiveGoalsWithStats.length})
                </p>
                <div className="space-y-2">
                  {inactiveGoalsWithStats.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50 opacity-70"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{goal.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="category-badge text-[10px]">
                            <CategoryIcon category={goal.category as Category} size={10} />
                            <span>{getCategoryLabel(goal.category as Category)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(goal)}
                        disabled={isToggling}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Reactivate goal"
                      >
                        <ToggleLeft size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Goal Form */}
            <AnimatePresence>
              {showAddForm ? (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSubmit}
                  className="bg-card rounded-xl p-4 space-y-4 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">New Goal</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <Input
                    type="text"
                    placeholder="What will you complete?"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full h-11 rounded-xl"
                    autoFocus
                  />

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Category</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                            selectedCategory === cat
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <CategoryIcon category={cat} size={10} />
                          {getCategoryLabel(cat)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">How often?</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {frequencies.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFrequency(value)}
                          className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                            frequency === value
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon size={12} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Visibility</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibility('public')}
                        className={`p-2.5 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                          visibility === 'public'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Globe size={14} />
                        <span>Public</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibility('private')}
                        className={`p-2.5 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                          visibility === 'private'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Lock size={14} />
                        <span>Private</span>
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full rounded-xl" disabled={!goalName.trim() || isAdding}>
                    {isAdding ? (
                      <>
                        <Loader2 size={14} className="mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check size={14} className="mr-2" />
                        Add Goal
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowAddForm(true)}
                  className="w-full p-4 border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Plus size={16} />
                  <span className="text-sm font-medium">Add New Goal</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <ConfirmDeleteDialog
        open={!!confirmDeactivate}
        onOpenChange={() => setConfirmDeactivate(null)}
        onConfirm={confirmDeactivateGoal}
        title={`Deactivate "${confirmDeactivate?.name}"?`}
        description="This goal will be moved to inactive. You can reactivate it anytime."
        isDeleting={isToggling}
      />
    </>
  );
}

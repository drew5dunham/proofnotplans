import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader2, Globe, Lock } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { useGoals } from '@/hooks/useGoals';
import type { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const categories: Category[] = ['fitness', 'learning', 'creative', 'health', 'work', 'personal'];

type Visibility = 'public' | 'private';

export function AddGoalForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('personal');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const { addGoal, isAdding, goals } = useGoals();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;

    addGoal(
      { name: goalName.trim(), category: selectedCategory, visibility },
      {
        onSuccess: () => {
          setGoalName('');
          setSelectedCategory('personal');
          setVisibility('public');
          setIsOpen(false);
        },
      }
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-4 border border-dashed border-border hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <Plus size={18} />
        <span className="text-sm font-medium">Add Goal</span>
        <span className="text-xs ml-1">({goals.length} active)</span>
      </button>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="border border-border p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">New Goal</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>
      </div>

      <Input
        type="text"
        placeholder="What will you complete?"
        value={goalName}
        onChange={(e) => setGoalName(e.target.value)}
        className="w-full"
        autoFocus
      />

      <div>
        <p className="text-xs text-muted-foreground mb-2">Category</p>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`p-2 border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                selectedCategory === cat
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/20'
              }`}
            >
              <CategoryIcon category={cat} size={12} />
              {getCategoryLabel(cat)}
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
            className={`p-3 border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
              visibility === 'public'
                ? 'border-accent bg-accent/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/20'
            }`}
          >
            <Globe size={16} />
            <span>Public</span>
            <span className="text-[10px] text-muted-foreground">Shows in feed</span>
          </button>
          <button
            type="button"
            onClick={() => setVisibility('private')}
            className={`p-3 border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
              visibility === 'private'
                ? 'border-accent bg-accent/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/20'
            }`}
          >
            <Lock size={16} />
            <span>Private</span>
            <span className="text-[10px] text-muted-foreground">Only you can see</span>
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!goalName.trim() || isAdding}>
        {isAdding ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          'Add Goal'
        )}
      </Button>
    </motion.form>
  );
}

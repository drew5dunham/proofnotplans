import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Camera, Type } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { useAppStore } from '@/lib/store';
import type { Goal } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [addCaption, setAddCaption] = useState(false);
  const { completeGoal, removeGoal } = useAppStore();

  const handleComplete = () => {
    completeGoal(
      goal.id,
      addCaption && caption ? 'text' : undefined,
      addCaption && caption ? caption : undefined
    );
    setShowCompleteModal(false);
    setCaption('');
    setAddCaption(false);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="goal-card"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground leading-snug mb-1">{goal.name}</h3>
            <div className="category-badge">
              <CategoryIcon category={goal.category} size={12} />
              <span>{getCategoryLabel(goal.category)}</span>
            </div>
          </div>
          <button
            onClick={() => removeGoal(goal.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <Button
          onClick={() => setShowCompleteModal(true)}
          className="w-full mt-3"
          variant="default"
        >
          <Check size={16} className="mr-2" />
          Mark Complete
        </Button>
      </motion.div>

      {/* Completion Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-left">Complete Goal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted">
              <p className="font-semibold">{goal.name}</p>
              <div className="category-badge mt-1">
                <CategoryIcon category={goal.category} size={12} />
                <span>{getCategoryLabel(goal.category)}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Add proof? (optional)
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setAddCaption(!addCaption)}
                className={`flex-1 p-3 border transition-colors flex flex-col items-center gap-1 ${
                  addCaption ? 'border-accent bg-accent/10' : 'border-border hover:border-foreground/20'
                }`}
              >
                <Type size={20} />
                <span className="text-xs">Caption</span>
              </button>
              <button
                className="flex-1 p-3 border border-border text-muted-foreground flex flex-col items-center gap-1 cursor-not-allowed opacity-50"
                disabled
              >
                <Camera size={20} />
                <span className="text-xs">Photo</span>
              </button>
            </div>

            {addCaption && (
              <Textarea
                placeholder="What did you accomplish?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="resize-none"
                rows={2}
              />
            )}

            <Button onClick={handleComplete} className="w-full" size="lg">
              <Check size={18} className="mr-2" />
              Post Completion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

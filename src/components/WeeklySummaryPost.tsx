import { motion } from 'framer-motion';
import { TrendingUp, Calendar } from 'lucide-react';

interface WeeklySummaryPostProps {
  userName: string;
  goalsCompleted: number;
  goalsAttempted: number;
  index: number;
}

export function WeeklySummaryPost({ userName, goalsCompleted, goalsAttempted, index }: WeeklySummaryPostProps) {
  const completionRate = goalsAttempted > 0 ? Math.round((goalsCompleted / goalsAttempted) * 100) : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="feed-post bg-muted/50"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-accent text-accent-foreground flex items-center justify-center">
          <Calendar size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{userName}'s Week</p>
          <p className="timestamp">Weekly summary</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-2">
        <div className="stat-block flex-1">
          <span className="text-2xl font-bold text-foreground">{goalsCompleted}</span>
          <span className="text-xs text-muted-foreground">completed</span>
        </div>
        <div className="stat-block flex-1">
          <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
          <span className="text-xs text-muted-foreground">rate</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-border w-full">
        <div 
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>
    </motion.article>
  );
}

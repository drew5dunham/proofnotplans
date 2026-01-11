import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon, getCategoryLabel } from '@/components/CategoryIcon';
import type { Category } from '@/types';
import type { GoalWithStats, DbCompletion } from '@/hooks/useGoals';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

type TimeFrame = 'week' | 'month' | 'all';

interface GoalProgressSectionProps {
  goals: GoalWithStats[];
  completions: DbCompletion[];
  onActivityClick?: () => void;
}

export function GoalProgressSection({ goals, completions, onActivityClick }: GoalProgressSectionProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');

  const getDateRange = (tf: TimeFrame) => {
    const now = new Date();
    const start = new Date();
    
    if (tf === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (tf === 'month') {
      start.setDate(now.getDate() - 30);
    } else {
      start.setFullYear(now.getFullYear() - 10); // Essentially "all time"
    }
    
    return { start, end: now };
  };

  const { start, end } = getDateRange(timeFrame);

  const filteredCompletions = useMemo(() => {
    return completions.filter(c => {
      const date = new Date(c.completed_at);
      return date >= start && date <= end;
    });
  }, [completions, start, end]);

  // Calculate stats per goal
  const goalStats = useMemo(() => {
    return goals.map(goal => {
      const goalCompletions = filteredCompletions.filter(c => c.goal_id === goal.id);
      const completed = goalCompletions.filter(c => c.status === 'completed').length;
      const missed = goalCompletions.filter(c => c.status === 'missed').length;
      const total = completed + missed;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Calculate streak for this goal
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const completionDates = goalCompletions
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

      return {
        ...goal,
        completed,
        missed,
        total,
        completionRate,
        streak,
      };
    });
  }, [goals, filteredCompletions]);

  // Generate weekly trend data
  const weeklyTrendData = useMemo(() => {
    const weeks: { week: string; completed: number; missed: number }[] = [];
    const now = new Date();
    const weeksToShow = timeFrame === 'week' ? 1 : timeFrame === 'month' ? 4 : 12;
    
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 7);
      
      const weekCompletions = completions.filter(c => {
        const date = new Date(c.completed_at);
        return date >= weekStart && date <= weekEnd;
      });
      
      weeks.push({
        week: `W${weeksToShow - i}`,
        completed: weekCompletions.filter(c => c.status === 'completed').length,
        missed: weekCompletions.filter(c => c.status === 'missed').length,
      });
    }
    
    return weeks;
  }, [completions, timeFrame]);

  // Generate calendar heatmap data (last 7 weeks)
  const calendarData = useMemo(() => {
    const days: { date: Date; count: number; status: 'none' | 'low' | 'medium' | 'high' }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const daysToShow = timeFrame === 'week' ? 7 : timeFrame === 'month' ? 30 : 84;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      const dayCompletions = completions.filter(c => {
        const cDate = new Date(c.completed_at);
        cDate.setHours(0, 0, 0, 0);
        return cDate.getTime() === date.getTime() && c.status === 'completed';
      }).length;
      
      let status: 'none' | 'low' | 'medium' | 'high' = 'none';
      if (dayCompletions > 0) status = 'low';
      if (dayCompletions >= 2) status = 'medium';
      if (dayCompletions >= 4) status = 'high';
      
      days.push({ date, count: dayCompletions, status });
    }
    
    return days;
  }, [completions, timeFrame]);

  const chartConfig = {
    completed: {
      label: 'Completed',
      color: 'hsl(var(--accent))',
    },
    missed: {
      label: 'Missed',
      color: 'hsl(var(--destructive))',
    },
  };

  const overallCompletionRate = useMemo(() => {
    const totalCompleted = goalStats.reduce((sum, g) => sum + g.completed, 0);
    const totalReported = goalStats.reduce((sum, g) => sum + g.total, 0);
    return totalReported > 0 ? Math.round((totalCompleted / totalReported) * 100) : 0;
  }, [goalStats]);

  return (
    <div className="space-y-4">
      {/* Time Frame Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Goal Progress</h3>
        <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
          <TabsList className="h-8">
            <TabsTrigger value="week" className="text-xs px-2 h-6">Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-2 h-6">Month</TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-block"
        >
          <div className="flex items-center gap-1 text-accent mb-1">
            <TrendingUp size={16} />
          </div>
          <span className="text-xl font-bold">{overallCompletionRate}%</span>
          <span className="text-xs text-muted-foreground">completion rate</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="stat-block"
        >
          <div className="flex items-center gap-1 text-accent mb-1">
            <BarChart3 size={16} />
          </div>
          <span className="text-xl font-bold">{filteredCompletions.length}</span>
          <span className="text-xs text-muted-foreground">total reports</span>
        </motion.div>
      </div>

      {/* Calendar Heatmap - Clickable */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={onActivityClick}
        className="w-full p-3 bg-card border border-border text-left cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Activity</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Tap to expand</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {calendarData.map((day, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm transition-colors ${
                day.status === 'none' ? 'bg-muted' :
                day.status === 'low' ? 'bg-accent/40' :
                day.status === 'medium' ? 'bg-accent/70' :
                'bg-accent'
              }`}
              title={`${day.date.toLocaleDateString()}: ${day.count} completions`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="w-2 h-2 rounded-sm bg-muted" />
          <div className="w-2 h-2 rounded-sm bg-accent/40" />
          <div className="w-2 h-2 rounded-sm bg-accent/70" />
          <div className="w-2 h-2 rounded-sm bg-accent" />
          <span>More</span>
        </div>
      </motion.button>

      {/* Weekly Trends Chart */}
      {weeklyTrendData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-3 bg-card border border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Weekly Trends</span>
          </div>
          <ChartContainer config={chartConfig} className="h-[120px] w-full">
            <AreaChart data={weeklyTrendData}>
              <XAxis 
                dataKey="week" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="hsl(var(--accent))"
                fill="hsl(var(--accent))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="missed"
                stroke="hsl(var(--destructive))"
                fill="hsl(var(--destructive))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </motion.div>
      )}

      {/* Per-Goal Progress */}
      <div className="space-y-3">
        {goalStats.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="p-3 bg-card border border-border space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{goal.name}</h4>
                <div className="category-badge mt-1">
                  <CategoryIcon category={goal.category as Category} size={12} />
                  <span>{getCategoryLabel(goal.category as Category)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-accent">
                <Flame size={14} />
                <span className="text-sm font-bold">{goal.streak}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Completion rate</span>
                <span className="font-medium">{goal.completionRate}%</span>
              </div>
              <Progress value={goal.completionRate} className="h-2" />
            </div>

            {/* Done vs Missed */}
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-muted-foreground">Done:</span>
                <span className="font-medium">{goal.completed}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Missed:</span>
                <span className="font-medium">{goal.missed}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Flame, Target, TrendingUp, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CategoryIcon, getCategoryLabel } from '@/components/CategoryIcon';
import type { Category } from '@/types';
import type { GoalWithStats, DbCompletion } from '@/hooks/useGoals';

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completions: DbCompletion[];
  goals: GoalWithStats[];
}

export function ActivityModal({ open, onOpenChange, completions, goals }: ActivityModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  // Get calendar days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get completions count per day for heatmap
  const completionsByDay = useMemo(() => {
    const map = new Map<string, number>();
    
    completions.forEach(c => {
      if (c.status === 'completed') {
        const dateKey = format(new Date(c.completed_at), 'yyyy-MM-dd');
        map.set(dateKey, (map.get(dateKey) || 0) + 1);
      }
    });
    
    return map;
  }, [completions]);

  // Get completions for selected day
  const selectedDayCompletions = useMemo(() => {
    if (!selectedDate) return [];
    
    return completions
      .filter(c => {
        const cDate = new Date(c.completed_at);
        return isSameDay(cDate, selectedDate) && c.status === 'completed';
      })
      .map(c => {
        const goal = goals.find(g => g.id === c.goal_id);
        return { ...c, goal };
      });
  }, [selectedDate, completions, goals]);

  // Get heatmap intensity class
  const getHeatmapClass = (count: number) => {
    if (count === 0) return 'bg-muted';
    if (count === 1) return 'bg-accent/40';
    if (count <= 3) return 'bg-accent/70';
    return 'bg-accent';
  };

  // Monthly totals
  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthCompletions = completions.filter(c => {
      const date = new Date(c.completed_at);
      return date >= monthStart && date <= monthEnd && c.status === 'completed';
    });

    return {
      total: monthCompletions.length,
      uniqueDays: new Set(monthCompletions.map(c => format(new Date(c.completed_at), 'yyyy-MM-dd'))).size,
    };
  }, [completions, currentMonth]);

  // Goal breakdown for current month
  const goalBreakdown = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return goals.map(goal => {
      const goalCompletions = completions.filter(c => {
        const date = new Date(c.completed_at);
        return c.goal_id === goal.id && date >= monthStart && date <= monthEnd && c.status === 'completed';
      }).length;
      
      return { ...goal, monthlyCount: goalCompletions };
    }).sort((a, b) => b.monthlyCount - a.monthlyCount);
  }, [goals, completions, currentMonth]);

  // Calculate overall streak
  const overallStreak = useMemo(() => {
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
    
    let current = 0;
    let longest = 0;
    let currentDate = today.getTime();
    let trackingCurrent = true;
    
    for (const date of uniqueDates) {
      if (trackingCurrent && (date === currentDate || date === currentDate - 86400000)) {
        current++;
        currentDate = date;
      } else {
        trackingCurrent = false;
      }
    }

    // Calculate longest streak
    let tempStreak = 0;
    let tempDate: number | null = null;
    
    for (const date of [...new Set(completionDates)].sort((a, b) => a - b)) {
      if (tempDate === null || date === tempDate + 86400000) {
        tempStreak++;
        tempDate = date;
      } else {
        longest = Math.max(longest, tempStreak);
        tempStreak = 1;
        tempDate = date;
      }
    }
    longest = Math.max(longest, tempStreak);
    
    return { current, longest };
  }, [completions]);

  const isCurrentMonth = isSameMonth(currentMonth, new Date());
  const canGoNext = !isCurrentMonth;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar size={20} className="text-accent" />
            Activity Overview
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-60px)]">
          <div className="p-4 space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft size={20} />
              </Button>
              <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
              <Button variant="ghost" size="icon" onClick={goToNextMonth} disabled={!canGoNext}>
                <ChevronRight size={20} />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-card border border-border rounded-lg p-3">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs text-muted-foreground font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const count = completionsByDay.get(dateKey) || 0;
                  const isCurrentMonthDay = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={`
                        aspect-square rounded-md flex items-center justify-center text-xs font-medium
                        transition-all hover:ring-2 hover:ring-accent/50
                        ${!isCurrentMonthDay ? 'opacity-30' : ''}
                        ${isSelected ? 'ring-2 ring-accent' : ''}
                        ${isToday ? 'ring-1 ring-foreground/30' : ''}
                        ${getHeatmapClass(isCurrentMonthDay ? count : 0)}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-muted-foreground">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-accent/40" />
                <div className="w-3 h-3 rounded-sm bg-accent/70" />
                <div className="w-3 h-3 rounded-sm bg-accent" />
                <span>More</span>
              </div>
            </div>

            {/* Selected Day Details */}
            <AnimatePresence mode="wait">
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h4 className="font-medium text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedDate(null)}>
                      <X size={14} />
                    </Button>
                  </div>
                  <div className="p-3">
                    {selectedDayCompletions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">No completions on this day</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayCompletions.map((completion) => (
                          <div key={completion.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                            {completion.goal && (
                              <div className="mt-0.5 text-accent">
                                <CategoryIcon category={completion.goal.category as Category} size={16} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{completion.goal?.name || 'Unknown Goal'}</p>
                              {completion.caption && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{completion.caption}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(new Date(completion.completed_at), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Monthly Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="stat-block">
                <TrendingUp size={14} className="text-accent mb-1" />
                <span className="text-lg font-bold">{monthlyStats.total}</span>
                <span className="text-[10px] text-muted-foreground">this month</span>
              </div>
              <div className="stat-block">
                <Calendar size={14} className="text-accent mb-1" />
                <span className="text-lg font-bold">{monthlyStats.uniqueDays}</span>
                <span className="text-[10px] text-muted-foreground">active days</span>
              </div>
              <div className="stat-block">
                <Flame size={14} className="text-orange-400 mb-1" />
                <span className="text-lg font-bold">{overallStreak.current}</span>
                <span className="text-[10px] text-muted-foreground">current streak</span>
              </div>
            </div>

            {/* Streak History */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={14} className="text-orange-400" />
                <span className="text-xs font-medium">Streak History</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <span className="text-2xl font-bold text-orange-400">{overallStreak.current}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Current Streak</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <span className="text-2xl font-bold text-accent">{overallStreak.longest}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Longest Streak</p>
                </div>
              </div>
            </div>

            {/* Goal Breakdown */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-accent" />
                <span className="text-xs font-medium">Goal Breakdown ({format(currentMonth, 'MMMM')})</span>
              </div>
              <div className="space-y-2">
                {goalBreakdown.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-2">
                    <div className="text-muted-foreground">
                      <CategoryIcon category={goal.category as Category} size={14} />
                    </div>
                    <span className="text-xs flex-1 truncate">{goal.name}</span>
                    <span className="text-xs font-medium tabular-nums">{goal.monthlyCount}</span>
                  </div>
                ))}
                {goalBreakdown.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No goals tracked yet</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

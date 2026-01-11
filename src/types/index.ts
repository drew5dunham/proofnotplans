export type Category = 'fitness' | 'learning' | 'creative' | 'health' | 'work' | 'personal';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Goal {
  id: string;
  name: string;
  category: Category;
  createdAt: Date;
  completedAt?: Date;
  isActive: boolean;
}

export interface CompletedGoal {
  id: string;
  goalId: string;
  goalName: string;
  category: Category;
  completedAt: Date;
  mediaType?: 'photo' | 'video' | 'text';
  mediaUrl?: string;
  caption?: string;
  userId: string;
  userName: string;
  reactions: Reaction[];
  comments: Comment[];
}

export interface Reaction {
  id: string;
  userId: string;
  type: 'like' | '💪' | '🔥' | '👏';
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  joinedAt: Date;
  isPremium: boolean;
  streak: number;
  completionRate: number;
  totalCompleted: number;
}

export interface WeeklySummary {
  id: string;
  userId: string;
  userName: string;
  weekStart: Date;
  weekEnd: Date;
  goalsCompleted: number;
  goalsAttempted: number;
  completionRate: number;
  createdAt: Date;
}

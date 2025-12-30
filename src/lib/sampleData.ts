import type { GoalWithStats, DbCompletion } from '@/hooks/useGoals';

// Sarah M's detailed completions
const SAMPLE_USER_1_COMPLETIONS: DbCompletion[] = [
  // Recent completions for Morning run
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `sarah-run-${i}`,
    goal_id: 'sample-goal-1',
    user_id: 'sample-user-1',
    completed_at: new Date(Date.now() - (i * 24 + 2) * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: i === 0 ? 'Hit a new personal best! 5K in under 25 minutes.' : i % 3 === 0 ? 'Great pace today' : null,
    what_was_hard: i === 2 ? 'Legs were sore from yesterday' : null,
    status: i === 5 || i === 12 ? 'missed' as const : 'completed' as const,
    goals: { id: 'sample-goal-1', user_id: 'sample-user-1', name: 'Morning run', category: 'fitness', is_active: true, created_at: '' },
    profiles: { name: 'Sarah M.' },
  })),
  // Meditation completions
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `sarah-meditate-${i}`,
    goal_id: 'sample-goal-5',
    user_id: 'sample-user-1',
    completed_at: new Date(Date.now() - (i * 24 + 27) * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: i === 0 ? 'Actually felt present for once. My mind wandered less than usual.' : null,
    what_was_hard: i === 0 ? 'Kept thinking about my to-do list.' : null,
    status: i === 3 || i === 8 || i === 15 ? 'missed' as const : 'completed' as const,
    goals: { id: 'sample-goal-5', user_id: 'sample-user-1', name: 'Meditate 10 min', category: 'health', is_active: true, created_at: '' },
    profiles: { name: 'Sarah M.' },
  })),
  // Journal completions
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `sarah-journal-${i}`,
    goal_id: 'sample-goal-7',
    user_id: 'sample-user-1',
    completed_at: new Date(Date.now() - (i * 24 + 48) * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: i === 0 ? 'Wrote 2 pages about my goals for next month.' : null,
    what_was_hard: null,
    status: i === 4 || i === 9 ? 'missed' as const : 'completed' as const,
    goals: { id: 'sample-goal-7', user_id: 'sample-user-1', name: 'Journal', category: 'personal', is_active: true, created_at: '' },
    profiles: { name: 'Sarah M.' },
  })),
];

// Jake R's completions
const SAMPLE_USER_2_COMPLETIONS: DbCompletion[] = [
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `jake-read-${i}`,
    goal_id: 'sample-goal-2',
    user_id: 'sample-user-2',
    completed_at: new Date(Date.now() - (i * 24 + 4) * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: i === 0 ? 'Finished a whole chapter of Atomic Habits.' : null,
    what_was_hard: i === 0 ? 'My phone kept buzzing.' : null,
    status: i === 7 || i === 14 || i === 20 ? 'missed' as const : 'completed' as const,
    goals: { id: 'sample-goal-2', user_id: 'sample-user-2', name: 'Read 30 minutes', category: 'learning', is_active: true, created_at: '' },
    profiles: { name: 'Jake R.' },
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    id: `jake-cold-${i}`,
    goal_id: 'sample-goal-6',
    user_id: 'sample-user-2',
    completed_at: new Date(Date.now() - (i * 24 + 29) * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: i === 0 ? 'Day 14 of cold showers! Energy boost is real.' : null,
    what_was_hard: i === 0 ? 'That first 10 seconds never gets easier.' : null,
    status: 'completed' as const,
    goals: { id: 'sample-goal-6', user_id: 'sample-user-2', name: 'Cold shower', category: 'health', is_active: true, created_at: '' },
    profiles: { name: 'Jake R.' },
  })),
];

// Emma L's completions
const SAMPLE_USER_3_COMPLETIONS: DbCompletion[] = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `emma-guitar-${i}`,
    goal_id: 'sample-goal-3',
    user_id: 'sample-user-3',
    completed_at: new Date(Date.now() - (i * 48 + 6) * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: i === 2 ? 'Finally nailed that chord transition!' : null,
    what_was_hard: i === 0 ? 'Woke up with a headache and could not focus.' : null,
    status: i === 0 || i === 5 || i === 10 ? 'missed' as const : 'completed' as const,
    goals: { id: 'sample-goal-3', user_id: 'sample-user-3', name: 'Practice guitar', category: 'creative', is_active: true, created_at: '' },
    profiles: { name: 'Emma L.' },
  })),
];

// Marcus T's completions
const SAMPLE_USER_4_COMPLETIONS: DbCompletion[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `marcus-meal-${i}`,
    goal_id: 'sample-goal-4',
    user_id: 'sample-user-4',
    completed_at: new Date(Date.now() - (i * 7 * 24 + 24) * 60 * 60 * 1000).toISOString(),
    caption: null,
    media_type: null,
    media_url: null,
    what_went_well: i === 0 ? 'Prepped 5 healthy lunches for the week.' : null,
    what_was_hard: i === 0 ? 'Took longer than expected.' : null,
    status: i === 3 ? 'missed' as const : 'completed' as const,
    goals: { id: 'sample-goal-4', user_id: 'sample-user-4', name: 'Meal prep', category: 'health', is_active: true, created_at: '' },
    profiles: { name: 'Marcus T.' },
  })),
];

// Sample user data for demo purposes - defined AFTER completions arrays
export const SAMPLE_USERS: Record<string, { name: string; goals: GoalWithStats[]; completions: DbCompletion[] }> = {
  'sample-user-1': {
    name: 'Sarah M.',
    goals: [
      { id: 'sample-goal-1', user_id: 'sample-user-1', name: 'Morning run', category: 'fitness', is_active: true, created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), completionCount: 18, lastCompleted: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'sample-goal-5', user_id: 'sample-user-1', name: 'Meditate 10 min', category: 'health', is_active: true, created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), completionCount: 22, lastCompleted: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString() },
      { id: 'sample-goal-7', user_id: 'sample-user-1', name: 'Journal', category: 'personal', is_active: true, created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), completionCount: 15, lastCompleted: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
    ],
    completions: SAMPLE_USER_1_COMPLETIONS,
  },
  'sample-user-2': {
    name: 'Jake R.',
    goals: [
      { id: 'sample-goal-2', user_id: 'sample-user-2', name: 'Read 30 minutes', category: 'learning', is_active: true, created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), completionCount: 24, lastCompleted: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { id: 'sample-goal-6', user_id: 'sample-user-2', name: 'Cold shower', category: 'health', is_active: true, created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), completionCount: 14, lastCompleted: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString() },
    ],
    completions: SAMPLE_USER_2_COMPLETIONS,
  },
  'sample-user-3': {
    name: 'Emma L.',
    goals: [
      { id: 'sample-goal-3', user_id: 'sample-user-3', name: 'Practice guitar', category: 'creative', is_active: true, created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), completionCount: 12, lastCompleted: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() },
    ],
    completions: SAMPLE_USER_3_COMPLETIONS,
  },
  'sample-user-4': {
    name: 'Marcus T.',
    goals: [
      { id: 'sample-goal-4', user_id: 'sample-user-4', name: 'Meal prep', category: 'health', is_active: true, created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), completionCount: 8, lastCompleted: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    ],
    completions: SAMPLE_USER_4_COMPLETIONS,
  },
};

export function isSampleUser(userId: string): boolean {
  return userId.startsWith('sample-user-');
}

export function getSampleUserData(userId: string) {
  return SAMPLE_USERS[userId] || null;
}

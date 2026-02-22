import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeaderboardPosition {
  userId: string;
  consistencyRank: number;
  improvementRank: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authorization - only allow calls with service role key or valid anon key from cron
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  if (token !== serviceRoleKey && token !== anonKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('=== Weekly Leaderboard Check Job Started ===');
  console.log('Time:', new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Helper function to get start/end of week
    const getWeekBounds = (date: Date) => {
      const start = new Date(date);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    const now = new Date();
    const thisWeek = getWeekBounds(now);
    const lastWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = getWeekBounds(lastWeekDate);
    const twoWeeksAgoDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = getWeekBounds(twoWeeksAgoDate);

    // Get all users with active goals
    const { data: allGoals, error: goalsError } = await supabase
      .from('goals')
      .select('id, user_id')
      .eq('is_active', true);

    if (goalsError) throw goalsError;

    const allUserIds = [...new Set(allGoals?.map(g => g.user_id) || [])];
    console.log(`Found ${allUserIds.length} users with active goals`);

    // Calculate goals per user
    const goalsPerUser = new Map<string, number>();
    allGoals?.forEach(g => {
      goalsPerUser.set(g.user_id, (goalsPerUser.get(g.user_id) || 0) + 1);
    });

    // Get this week's completions
    const { data: thisWeekCompletions } = await supabase
      .from('goal_completions')
      .select('user_id')
      .in('user_id', allUserIds)
      .gte('completed_at', thisWeek.start.toISOString())
      .lte('completed_at', thisWeek.end.toISOString())
      .eq('status', 'completed');

    // Get last week's completions (for improvement calculation)
    const { data: lastWeekCompletions } = await supabase
      .from('goal_completions')
      .select('user_id')
      .in('user_id', allUserIds)
      .gte('completed_at', lastWeek.start.toISOString())
      .lte('completed_at', lastWeek.end.toISOString())
      .eq('status', 'completed');

    // Get two weeks ago completions (for last week's improvement)
    const { data: twoWeeksAgoCompletions } = await supabase
      .from('goal_completions')
      .select('user_id')
      .in('user_id', allUserIds)
      .gte('completed_at', twoWeeksAgo.start.toISOString())
      .lte('completed_at', twoWeeksAgo.end.toISOString())
      .eq('status', 'completed');

    // Count completions per user per period
    const countByUser = (completions: any[] | null) => {
      const counts = new Map<string, number>();
      completions?.forEach(c => {
        counts.set(c.user_id, (counts.get(c.user_id) || 0) + 1);
      });
      return counts;
    };

    const thisWeekCounts = countByUser(thisWeekCompletions);
    const lastWeekCounts = countByUser(lastWeekCompletions);
    const twoWeeksAgoCounts = countByUser(twoWeeksAgoCompletions);

    // Calculate current leaderboard positions
    const calculateLeaderboard = (
      counts: Map<string, number>,
      prevCounts: Map<string, number>
    ) => {
      const consistencyData: { userId: string; score: number }[] = [];
      const improvementData: { userId: string; score: number }[] = [];

      allUserIds.forEach(userId => {
        const totalGoals = goalsPerUser.get(userId) || 0;
        const currentCount = counts.get(userId) || 0;
        const prevCount = prevCounts.get(userId) || 0;

        // Consistency: completions / (goals * 7 days)
        const maxPossible = totalGoals * 7;
        const consistencyPercent = maxPossible > 0 
          ? Math.round((currentCount / maxPossible) * 100) 
          : 0;

        // Improvement: % change from previous period
        const improvement = prevCount > 0 
          ? Math.round(((currentCount - prevCount) / prevCount) * 100)
          : currentCount > 0 ? 100 : 0;

        if (totalGoals > 0) {
          consistencyData.push({ userId, score: consistencyPercent });
        }
        improvementData.push({ userId, score: improvement });
      });

      // Sort and rank
      consistencyData.sort((a, b) => b.score - a.score);
      improvementData.sort((a, b) => b.score - a.score);

      const positions = new Map<string, LeaderboardPosition>();
      
      consistencyData.forEach((item, idx) => {
        positions.set(item.userId, {
          userId: item.userId,
          consistencyRank: idx + 1,
          improvementRank: 0
        });
      });

      improvementData.forEach((item, idx) => {
        const existing = positions.get(item.userId);
        if (existing) {
          existing.improvementRank = idx + 1;
        } else {
          positions.set(item.userId, {
            userId: item.userId,
            consistencyRank: 0,
            improvementRank: idx + 1
          });
        }
      });

      return positions;
    };

    // Current positions (this week vs last week)
    const currentPositions = calculateLeaderboard(thisWeekCounts, lastWeekCounts);
    
    // Previous positions (last week vs two weeks ago)
    const previousPositions = calculateLeaderboard(lastWeekCounts, twoWeeksAgoCounts);

    let notificationsSent = 0;

    // Compare positions and send notifications
    for (const userId of allUserIds) {
      const current = currentPositions.get(userId);
      const previous = previousPositions.get(userId);

      if (!current || !previous) continue;

      // Check if user has push subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!subscriptions || subscriptions.length === 0) continue;

      // Get user's friends to calculate their personal leaderboard
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      const friendIds = new Set<string>();
      friendships?.forEach(f => {
        if (f.user_id === userId) friendIds.add(f.friend_id);
        else friendIds.add(f.user_id);
      });

      // Only notify if they have friends (leaderboard is meaningless alone)
      if (friendIds.size === 0) continue;

      // Calculate position among friends for consistency
      const friendsAndSelf = [userId, ...Array.from(friendIds)];
      
      const getRank = (list: string[], id: string, positions: Map<string, LeaderboardPosition>, key: 'consistencyRank' | 'improvementRank') => {
        const sorted = list.filter(uid => positions.get(uid)?.[key]).sort((a, b) => {
          return positions.get(a)![key] - positions.get(b)![key];
        });
        return sorted.indexOf(id) + 1;
      };

      const currentConsistencyRank = getRank(friendsAndSelf, userId, currentPositions, 'consistencyRank');
      const previousConsistencyRank = getRank(friendsAndSelf, userId, previousPositions, 'consistencyRank');
      const currentImprovementRank = getRank(friendsAndSelf, userId, currentPositions, 'improvementRank');
      const previousImprovementRank = getRank(friendsAndSelf, userId, previousPositions, 'improvementRank');

      // Check for consistency rank change
      if (currentConsistencyRank > 0 && previousConsistencyRank > 0) {
        if (currentConsistencyRank < previousConsistencyRank) {
          // Moved UP on Most Consistent
          await sendLeaderboardNotification(
            supabase,
            userId,
            'Most Consistent',
            true
          );
          notificationsSent++;
        } else if (currentConsistencyRank > previousConsistencyRank) {
          // Moved DOWN on Most Consistent
          await sendLeaderboardNotification(
            supabase,
            userId,
            'Most Consistent',
            false
          );
          notificationsSent++;
        }
      }

      // Check for improvement rank change
      if (currentImprovementRank > 0 && previousImprovementRank > 0) {
        if (currentImprovementRank < previousImprovementRank) {
          // Moved UP on Most Improved
          await sendLeaderboardNotification(
            supabase,
            userId,
            'Most Improved',
            true
          );
          notificationsSent++;
        } else if (currentImprovementRank > previousImprovementRank) {
          // Moved DOWN on Most Improved
          await sendLeaderboardNotification(
            supabase,
            userId,
            'Most Improved',
            false
          );
          notificationsSent++;
        }
      }
    }

    console.log(`=== Weekly Leaderboard Check Complete: ${notificationsSent} notifications sent ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent,
        usersChecked: allUserIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in weekly-leaderboard-check:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendLeaderboardNotification(
  supabase: any,
  userId: string,
  boardName: string,
  movedUp: boolean
) {
  const title = movedUp 
    ? `You moved up! 🎉` 
    : `Keep pushing! 💪`;

  const body = movedUp
    ? `You've moved up on the "${boardName}" leaderboard. Let's see where you're at!`
    : `You've moved down on the "${boardName}" leaderboard. Progress is a process. Let's see where you're at and get after it.`;

  try {
    // Create notification in database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'leaderboard_change',
        title,
        body,
        actor_id: userId, // Self-notification
      })
      .select('id')
      .single();

    if (notifError) {
      console.error('Error creating leaderboard notification:', notifError);
      return;
    }

    // Send push notification
    const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        title,
        body,
        url: '/leaderboard',
        notificationId: notification?.id
      }
    });

    if (pushError) {
      console.error('Error sending leaderboard push notification:', pushError);
    }
  } catch (error) {
    console.error('Error in sendLeaderboardNotification:', error);
  }
}

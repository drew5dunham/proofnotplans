import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  // Only allow service role key or anon key (used by pg_net cron)
  if (token !== serviceRoleKey && token !== anonKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('=== Daily Goal Reminder Job Started ===');
  console.log('Time:', new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users with active goals
    const { data: usersWithGoals, error: usersError } = await supabase
      .from('goals')
      .select('user_id')
      .eq('is_active', true);

    if (usersError) {
      console.error('Error fetching users with goals:', usersError);
      throw usersError;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(usersWithGoals?.map(g => g.user_id) || [])];
    console.log(`Found ${uniqueUserIds.length} users with active goals`);

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let remindersSent = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Get user's active goals
        const { data: userGoals, error: goalsError } = await supabase
          .from('goals')
          .select('id, frequency')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (goalsError || !userGoals?.length) {
          continue;
        }

        // Check each goal based on its frequency
        let hasOverdueGoal = false;

        for (const goal of userGoals) {
          let checkSince: Date;
          
          switch (goal.frequency) {
            case 'daily':
              checkSince = twentyFourHoursAgo;
              break;
            case 'weekly':
              checkSince = oneWeekAgo;
              break;
            case 'monthly':
              checkSince = oneMonthAgo;
              break;
            default:
              checkSince = twentyFourHoursAgo;
          }

          // Check if goal has a completion within the period
          const { data: completions, error: compError } = await supabase
            .from('goal_completions')
            .select('id')
            .eq('goal_id', goal.id)
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('completed_at', checkSince.toISOString())
            .limit(1);

          if (compError) {
            console.error('Error checking completions for goal:', goal.id, compError);
            continue;
          }

          if (!completions || completions.length === 0) {
            hasOverdueGoal = true;
            break; // We only need to know if ANY goal is overdue
          }
        }

        if (hasOverdueGoal) {
          // Check if user has push subscriptions
          const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          if (subscriptions && subscriptions.length > 0) {
            // Create a notification in the database
            const { data: notification, error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                type: 'goal_reminder',
                title: 'Goal Reminder',
                body: 'Did you make any progress today? Report on your goals and encourage your friends! 🔥',
                actor_id: userId, // Self-notification
              })
              .select('id')
              .single();

            if (notifError) {
              console.error('Error creating notification:', notifError);
              continue;
            }

            // Send push notification via the existing function
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                userId,
                title: 'Goal Reminder',
                body: 'Did you make any progress today? Report on your goals and encourage your friends! 🔥',
                url: '/goals',
                notificationId: notification?.id
              }
            });

            if (pushError) {
              console.error('Error sending push notification:', pushError);
            } else {
              remindersSent++;
              console.log(`Sent reminder to user: ${userId}`);
            }
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
      }
    }

    console.log(`=== Daily Goal Reminder Job Complete: ${remindersSent} reminders sent ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent,
        usersChecked: uniqueUserIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in daily-goal-reminder:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

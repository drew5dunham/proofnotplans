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

  console.log('=== Daily Goal Reminder Job Started ===');
  const serverNow = new Date();
  console.log('Server time:', serverNow.toISOString());

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

    const uniqueUserIds = [...new Set(usersWithGoals?.map(g => g.user_id) || [])];
    console.log(`Found ${uniqueUserIds.length} users with active goals`);

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let remindersSent = 0;
    let skippedDisabled = 0;
    let skippedOutsideWindow = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Fetch user settings
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('push_notifications_enabled, daily_reminder_time')
          .eq('user_id', userId)
          .single();

        // Check if push notifications are disabled
        if (userSettings && userSettings.push_notifications_enabled === false) {
          console.log(`[SKIP] user=${userId} reason=push_disabled`);
          skippedDisabled++;
          continue;
        }

        // Check reminder time window (±10 minutes)
        const reminderTimeStr: string = userSettings?.daily_reminder_time ?? '09:00:00';
        const [rH, rM] = reminderTimeStr.split(':').map(Number);
        const serverMinutes = serverNow.getUTCHours() * 60 + serverNow.getUTCMinutes();
        const reminderMinutes = rH * 60 + rM;
        const diff = Math.abs(serverMinutes - reminderMinutes);
        const withinWindow = diff <= 10 || (1440 - diff) <= 10; // handle midnight wrap

        if (!withinWindow) {
          console.log(`[SKIP] user=${userId} reason=outside_reminder_window server=${serverMinutes}min reminder=${reminderMinutes}min`);
          skippedOutsideWindow++;
          continue;
        }

        // Get user's active goals
        const { data: userGoals, error: goalsError } = await supabase
          .from('goals')
          .select('id, frequency')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (goalsError || !userGoals?.length) {
          continue;
        }

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

          const { data: completions, error: compError } = await supabase
            .from('goal_completions')
            .select('id')
            .eq('goal_id', goal.id)
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('completed_at', checkSince.toISOString())
            .limit(1);

          if (compError) {
            console.error(`[ERROR] completion check goal=${goal.id}`, compError);
            continue;
          }

          if (!completions || completions.length === 0) {
            hasOverdueGoal = true;
            break;
          }
        }

        if (hasOverdueGoal) {
          const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          if (subscriptions && subscriptions.length > 0) {
            const { data: notification, error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                type: 'goal_reminder',
                title: 'Goal Reminder',
                body: 'Did you make any progress today? Report on your goals and encourage your friends! 🔥',
                actor_id: userId,
              })
              .select('id')
              .single();

            if (notifError) {
              console.error(`[ERROR] create notification user=${userId}`, notifError);
              continue;
            }

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
              console.error(`[ERROR] push send user=${userId}`, pushError);
            } else {
              remindersSent++;
              console.log(`[OK] reminder sent user=${userId}`);
            }
          }
        }
      } catch (userError) {
        console.error(`[ERROR] processing user=${userId}`, userError);
      }
    }

    console.log(`=== Daily Goal Reminder Complete: sent=${remindersSent} skippedDisabled=${skippedDisabled} skippedWindow=${skippedOutsideWindow} checked=${uniqueUserIds.length} ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent,
        skippedDisabled,
        skippedOutsideWindow,
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

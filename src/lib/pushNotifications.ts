import { supabase } from '@/integrations/supabase/client';

/**
 * Send a push notification to a user.
 * This should be called alongside creating in-app notifications.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url: string = '/'
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: { userId, title, body, url }
    });
    
    if (error) {
      console.error('Failed to send push notification:', error);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

import { supabase } from '@/integrations/supabase/client';

/**
 * Send a push notification to a user.
 * This should be called alongside creating in-app notifications.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url: string = '/',
  notificationId?: string
): Promise<void> {
  try {
    console.log('Sending push notification:', { userId, title, body, url, notificationId });
    
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { userId, title, body, url, notificationId }
    });
    
    if (error) {
      console.error('Failed to send push notification:', error);
    } else {
      console.log('Push notification result:', data);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useNativePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    // Only supported on native platforms
    const supported = Capacitor.isNativePlatform();
    setIsSupported(supported);
    
    if (supported) {
      checkPermission();
    }
  }, []);

  useEffect(() => {
    if (isSupported && user) {
      checkSubscription();
      setupListeners();
    }
  }, [isSupported, user]);

  const checkPermission = async () => {
    try {
      const result = await PushNotifications.checkPermissions();
      if (result.receive === 'granted') {
        setPermission('granted');
      } else if (result.receive === 'denied') {
        setPermission('denied');
      } else {
        setPermission('prompt');
      }
    } catch (error) {
      console.error('Error checking push permission:', error);
    }
  };

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'ios')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const setupListeners = () => {
    // Handle registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      
      if (user) {
        await saveToken(token.value);
      }
    });

    // Handle registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Handle notification received when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      // You can show an in-app notification here
    });

    // Handle notification action (user tapped on notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      
      // Get the URL from the notification data and navigate
      const data = action.notification.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });
  };

  const saveToken = async (deviceToken: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: `apns:${deviceToken}`, // Use a unique identifier
        device_token: deviceToken,
        platform: 'ios',
        p256dh: '', // Not used for APNs
        auth: '' // Not used for APNs
      }, {
        onConflict: 'user_id,endpoint,platform'
      });

      if (error) {
        console.error('Error saving device token:', error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Error saving device token:', error);
      return false;
    }
  };

  const subscribe = useCallback(async () => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive === 'granted') {
        setPermission('granted');
        
        // Register for push notifications
        await PushNotifications.register();
        
        return true;
      } else {
        setPermission('denied');
        console.log('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'ios');
      
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe
  };
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useNativePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const listenersAdded = useRef(false);

  useEffect(() => {
    const supported = Capacitor.isNativePlatform();
    setIsSupported(supported);
    
    if (supported) {
      checkPermission();
    }
  }, []);

  useEffect(() => {
    if (isSupported && user) {
      checkSubscription();
      if (!listenersAdded.current) {
        setupListeners();
        listenersAdded.current = true;
        console.log('[PUSH_DEBUG] Listeners added (once)');
      }
    }
  }, [isSupported, user]);

  // Auto-register if permission already granted
  useEffect(() => {
    if (isSupported && permission === 'granted' && user) {
      console.log('[PUSH_DEBUG] Permission already granted, auto-registering');
      PushNotifications.register().catch(err =>
        console.error('[PUSH_DEBUG] Auto-register failed:', err)
      );
    }
  }, [isSupported, permission, user]);

  const checkPermission = async () => {
    try {
      const result = await PushNotifications.checkPermissions();
      console.log('[PUSH_DEBUG] checkPermissions result:', result.receive);
      if (result.receive === 'granted') {
        setPermission('granted');
      } else if (result.receive === 'denied') {
        setPermission('denied');
      } else {
        setPermission('prompt');
      }
    } catch (error) {
      console.error('[PUSH_DEBUG] Error checking push permission:', error);
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
        .not('device_token', 'is', null)
        .limit(1);
      
      const count = data?.length ?? 0;
      console.log('[PUSH_DEBUG] checkSubscription: found', count, 'subscription(s) for user', user.id);
      
      if (!error && count > 0) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('[PUSH_DEBUG] Error checking subscription:', error);
    }
  };

  const setupListeners = () => {
    // Handle registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[PUSH_DEBUG] Registration success, token:', token.value);
      
      if (user) {
        const saved = await saveToken(token.value);
        if (!saved) {
          console.error('[PUSH_DEBUG] Failed to save token after registration');
        } else {
          console.log('[PUSH_DEBUG] Token saved successfully after registration');
        }
      } else {
        console.warn('[PUSH_DEBUG] Registration event fired but no user available');
      }
    });

    // Handle registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PUSH_DEBUG] Push registration error:', error);
    });

    // Handle notification received when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[PUSH_DEBUG] Push notification received in foreground:', notification);
    });

    // Handle notification action (user tapped on notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[PUSH_DEBUG] Push notification action performed:', action);
      
      const data = action.notification.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });
  };

  const saveToken = async (deviceToken: string): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log('[PUSH_DEBUG] Saving token via edge function for user', user.id, 'token prefix:', deviceToken.substring(0, 12));
      
      const { data, error } = await supabase.functions.invoke('register-ios-push-token', {
        body: { token: deviceToken },
      });

      if (error) {
        console.error('[PUSH_DEBUG] Edge function invoke error:', error.message);
        toast.error('Failed to save push token: ' + error.message);
        return false;
      }

      if (data && !data.success) {
        console.error('[PUSH_DEBUG] Edge function returned failure:', data);
        toast.error('Failed to save push token');
        return false;
      }

      setIsSubscribed(true);
      console.log('[PUSH_DEBUG] Token saved via edge function, isSubscribed = true');
      return true;
    } catch (error) {
      console.error('[PUSH_DEBUG] Exception saving device token:', error);
      return false;
    }
  };

  const subscribe = useCallback(async () => {
    if (!user) {
      console.error('[PUSH_DEBUG] subscribe: User not authenticated');
      return false;
    }

    try {
      const permResult = await PushNotifications.requestPermissions();
      console.log('[PUSH_DEBUG] requestPermissions result:', permResult.receive);
      
      if (permResult.receive === 'granted') {
        setPermission('granted');
        await PushNotifications.register();
        console.log('[PUSH_DEBUG] PushNotifications.register() called after permission grant');
        return true;
      } else {
        setPermission('denied');
        console.log('[PUSH_DEBUG] Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[PUSH_DEBUG] Error subscribing to push:', error);
      return false;
    }
  }, [user]);

  const forceRegister = useCallback(async () => {
    if (!user) {
      console.error('[PUSH_DEBUG] forceRegister: no user');
      return false;
    }
    
    console.log('[PUSH_DEBUG] forceRegister called');
    
    try {
      // Check / request permission first
      const permResult = await PushNotifications.checkPermissions();
      console.log('[PUSH_DEBUG] forceRegister: current permission:', permResult.receive);
      
      if (permResult.receive !== 'granted') {
        const reqResult = await PushNotifications.requestPermissions();
        if (reqResult.receive !== 'granted') {
          console.log('[PUSH_DEBUG] forceRegister: permission not granted');
          setPermission('denied');
          return false;
        }
        setPermission('granted');
      }
      
      // Register — the 'registration' listener will call saveToken
      await PushNotifications.register();
      console.log('[PUSH_DEBUG] forceRegister: register() called');
      return true;
    } catch (error) {
      console.error('[PUSH_DEBUG] forceRegister error:', error);
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'ios');
      
      setIsSubscribed(false);
      console.log('[PUSH_DEBUG] Unsubscribed, tokens deleted');
      return true;
    } catch (error) {
      console.error('[PUSH_DEBUG] Error unsubscribing:', error);
      return false;
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    forceRegister
  };
};

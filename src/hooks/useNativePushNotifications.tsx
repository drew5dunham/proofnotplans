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
  // Store the latest token so the debug button can use it
  const latestToken = useRef<string | null>(null);

  console.log('[PUSH_DEBUG] useNativePushNotifications hook init, user:', user?.id ?? 'none', 'isNative:', Capacitor.isNativePlatform());

  useEffect(() => {
    const supported = Capacitor.isNativePlatform();
    console.log('[PUSH_DEBUG] Platform check — isNative:', supported);
    setIsSupported(supported);
    
    if (supported) {
      checkPermission();
    }
  }, []);

  // Attach listeners + check subscription when user is ready
  useEffect(() => {
    if (isSupported && user) {
      console.log('[PUSH_DEBUG] User ready, setting up listeners if needed');
      if (!listenersAdded.current) {
        setupListeners();
        listenersAdded.current = true;
        console.log('[PUSH_DEBUG] Listeners attached (first time)');
      }
      checkSubscription();
    }
  }, [isSupported, user]);

  // Auto-register on startup if permission already granted
  useEffect(() => {
    if (isSupported && permission === 'granted' && user) {
      console.log('[PUSH_DEBUG] Auto-register: permission granted + user present, calling PushNotifications.register()');
      PushNotifications.register()
        .then(() => console.log('[PUSH_DEBUG] Auto-register: register() resolved'))
        .catch(err => console.error('[PUSH_DEBUG] Auto-register: register() rejected:', err));
    }
  }, [isSupported, permission, user]);

  const checkPermission = async () => {
    try {
      console.log('[PUSH_DEBUG] checkPermission: calling PushNotifications.checkPermissions()');
      const result = await PushNotifications.checkPermissions();
      console.log('[PUSH_DEBUG] checkPermission result:', result.receive);
      if (result.receive === 'granted') {
        setPermission('granted');
      } else if (result.receive === 'denied') {
        setPermission('denied');
      } else {
        setPermission('prompt');
      }
    } catch (error) {
      console.error('[PUSH_DEBUG] checkPermission error:', error);
    }
  };

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      console.log('[PUSH_DEBUG] checkSubscription: querying for user', user.id);
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'ios')
        .not('device_token', 'is', null)
        .limit(1);
      
      const count = data?.length ?? 0;
      console.log('[PUSH_DEBUG] checkSubscription: found', count, 'row(s), error:', error?.message ?? 'none');
      
      if (!error && count > 0) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('[PUSH_DEBUG] checkSubscription exception:', error);
    }
  };

  const setupListeners = () => {
    console.log('[PUSH_DEBUG] setupListeners: attaching registration listener');

    // Registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[PUSH_DEBUG] >>> registration listener fired, token:', token.value?.substring(0, 20), '... length:', token.value?.length);
      latestToken.current = token.value;
      
      if (user) {
        console.log('[PUSH_DEBUG] registration listener: user present, calling saveToken for user', user.id);
        const saved = await saveToken(token.value);
        console.log('[PUSH_DEBUG] registration listener: saveToken returned', saved);
        if (!saved) {
          toast.error('[DEBUG] Token save failed — check logs');
        }
      } else {
        console.warn('[PUSH_DEBUG] registration listener: NO user available, cannot save token');
      }
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PUSH_DEBUG] >>> registrationError listener fired:', JSON.stringify(error));
    });

    // Foreground notification
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[PUSH_DEBUG] pushNotificationReceived:', notification);
    });

    // Notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[PUSH_DEBUG] pushNotificationActionPerformed:', action);
      const data = action.notification.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });

    console.log('[PUSH_DEBUG] setupListeners: all listeners attached');
  };

  const saveToken = async (deviceToken: string): Promise<boolean> => {
    if (!user) {
      console.error('[PUSH_DEBUG] saveToken: no user');
      return false;
    }

    try {
      console.log('[PUSH_DEBUG] saveToken: invoking edge function register-ios-push-token, user:', user.id, 'token prefix:', deviceToken.substring(0, 12));
      
      const { data, error } = await supabase.functions.invoke('register-ios-push-token', {
        body: { token: deviceToken },
      });

      console.log('[PUSH_DEBUG] saveToken: invoke returned data:', JSON.stringify(data), 'error:', error?.message ?? 'none');

      if (error) {
        console.error('[PUSH_DEBUG] saveToken: edge function error:', error.message);
        toast.error('Failed to save push token: ' + error.message);
        return false;
      }

      if (data && !data.success) {
        console.error('[PUSH_DEBUG] saveToken: edge function returned failure:', JSON.stringify(data));
        toast.error('Failed to save push token');
        return false;
      }

      setIsSubscribed(true);
      console.log('[PUSH_DEBUG] saveToken: SUCCESS, isSubscribed = true');
      return true;
    } catch (error) {
      console.error('[PUSH_DEBUG] saveToken: exception:', error);
      return false;
    }
  };

  const subscribe = useCallback(async () => {
    if (!user) {
      console.error('[PUSH_DEBUG] subscribe: no user');
      return false;
    }

    try {
      console.log('[PUSH_DEBUG] subscribe: requesting permissions');
      const permResult = await PushNotifications.requestPermissions();
      console.log('[PUSH_DEBUG] subscribe: requestPermissions result:', permResult.receive);
      
      if (permResult.receive === 'granted') {
        setPermission('granted');
        console.log('[PUSH_DEBUG] subscribe: calling register()');
        await PushNotifications.register();
        console.log('[PUSH_DEBUG] subscribe: register() done');
        return true;
      } else {
        setPermission('denied');
        console.log('[PUSH_DEBUG] subscribe: permission denied');
        return false;
      }
    } catch (error) {
      console.error('[PUSH_DEBUG] subscribe error:', error);
      return false;
    }
  }, [user]);

  const forceRegister = useCallback(async () => {
    if (!user) {
      console.error('[PUSH_DEBUG] forceRegister: no user');
      return false;
    }
    
    console.log('[PUSH_DEBUG] forceRegister: called');
    
    try {
      const permResult = await PushNotifications.checkPermissions();
      console.log('[PUSH_DEBUG] forceRegister: current permission:', permResult.receive);
      
      if (permResult.receive !== 'granted') {
        const reqResult = await PushNotifications.requestPermissions();
        console.log('[PUSH_DEBUG] forceRegister: requestPermissions result:', reqResult.receive);
        if (reqResult.receive !== 'granted') {
          setPermission('denied');
          return false;
        }
        setPermission('granted');
      }
      
      console.log('[PUSH_DEBUG] forceRegister: calling PushNotifications.register()');
      await PushNotifications.register();
      console.log('[PUSH_DEBUG] forceRegister: register() done, waiting for registration listener');
      return true;
    } catch (error) {
      console.error('[PUSH_DEBUG] forceRegister error:', error);
      return false;
    }
  }, [user]);

  // Directly invoke the edge function with a stored token (for debug button)
  const forceInvokeWithToken = useCallback(async () => {
    if (!user) {
      console.error('[PUSH_DEBUG] forceInvokeWithToken: no user');
      toast.error('No user logged in');
      return false;
    }
    
    // First try to register to get a fresh token
    console.log('[PUSH_DEBUG] forceInvokeWithToken: calling forceRegister first');
    await forceRegister();
    
    // Wait a moment for the registration listener to fire
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const token = latestToken.current;
    if (!token) {
      console.error('[PUSH_DEBUG] forceInvokeWithToken: no token available after register');
      toast.error('No token received from APNs — check Xcode console');
      return false;
    }
    
    console.log('[PUSH_DEBUG] forceInvokeWithToken: have token, calling saveToken directly');
    const saved = await saveToken(token);
    if (saved) {
      toast.success('Push token registered successfully!');
    } else {
      toast.error('Failed to register push token — check logs');
    }
    return saved;
  }, [user, forceRegister]);

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
      console.error('[PUSH_DEBUG] unsubscribe error:', error);
      return false;
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    forceRegister,
    forceInvokeWithToken,
  };
};

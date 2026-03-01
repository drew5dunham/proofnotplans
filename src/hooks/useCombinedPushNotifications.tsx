import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from './usePushNotifications';
import { useNativePushNotifications } from './useNativePushNotifications';

/**
 * Combined hook that automatically uses the correct push notification implementation
 * based on the platform (web vs native iOS/Android)
 */
export const useCombinedPushNotifications = () => {
  const webPush = usePushNotifications();
  const nativePush = useNativePushNotifications();
  
  // Use native push for native platforms, web push otherwise
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    return {
      ...nativePush,
      isNative: true,
      forceInvokeWithToken: nativePush.forceInvokeWithToken,
    };
  }
  
  return {
    ...webPush,
    isNative: false,
    forceInvokeWithToken: undefined,
  };
};

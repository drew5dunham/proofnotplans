import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useCombinedPushNotifications } from '@/hooks/useCombinedPushNotifications';
import { toast } from 'sonner';

export const PushNotificationPrompt = () => {
  const { isSupported, isSubscribed, permission, subscribe } = useCombinedPushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('push-prompt-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  if (!isSupported || dismissed || isSubscribed || permission === 'denied') {
    return null;
  }

  const handleSubscribe = async () => {
    setLoading(true);
    const success = await subscribe();
    setLoading(false);
    
    if (success) {
      toast.success('Push notifications enabled!');
    } else {
      toast.error('Failed to enable push notifications');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push-prompt-dismissed', 'true');
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-border rounded-lg p-4 shadow-lg z-50">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">Enable Push Notifications</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Get notified when friends encourage you or comment on your goals
          </p>
          <Button 
            onClick={handleSubscribe} 
            size="sm" 
            className="mt-3 w-full"
            disabled={loading}
          >
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        </div>
      </div>
    </div>
  );
};

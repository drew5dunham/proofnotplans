import { Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useReceivedEncouragements, useUnreadEncouragementCount } from '@/hooks/useEncouragements';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  const { data: encouragements, isLoading } = useReceivedEncouragements();
  const { data: unreadCount } = useUnreadEncouragementCount();

  // Combine encouragements with sample notifications
  const sampleNotifications = [
    { id: 'sample-1', text: '🔥 Sarah M. is on a 7-day streak!', time: '2 hours ago' },
    { id: 'sample-2', text: '💪 Jake just completed his workout goal', time: '5 hours ago' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Flame size={18} className="text-orange-500" />
                {(unreadCount || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-3 space-y-3">
                    {/* Real encouragements */}
                    {encouragements && encouragements.map((enc: any) => (
                      <div 
                        key={enc.id} 
                        className={`text-sm p-2 -mx-2 rounded ${!enc.read_at ? 'bg-accent/10' : ''}`}
                      >
                        <p className="font-medium">
                          {enc.emoji && <span className="mr-1">{enc.emoji}</span>}
                          {enc.sender?.name || 'Someone'} sent you encouragement!
                        </p>
                        {enc.message && (
                          <p className="text-muted-foreground mt-0.5">"{enc.message}"</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(enc.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                    
                    {/* Sample notifications */}
                    {sampleNotifications.map((notif) => (
                      <div key={notif.id} className="text-sm">
                        <p className="font-medium">{notif.text}</p>
                        <p className="text-xs text-muted-foreground">{notif.time}</p>
                      </div>
                    ))}

                    {(!encouragements || encouragements.length === 0) && sampleNotifications.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No notifications yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}

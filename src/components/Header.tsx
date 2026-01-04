import { Flame, Loader2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useReceivedEncouragements, useUnreadEncouragementCount } from '@/hooks/useEncouragements';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead } from '@/hooks/useComments';
import { useAcceptFriendRequest, useIgnoreFriendRequest } from '@/hooks/useFriendRequests';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { data: encouragements, isLoading: loadingEncouragements } = useReceivedEncouragements();
  const { data: unreadEncouragementCount } = useUnreadEncouragementCount();
  const { data: notifications, isLoading: loadingNotifications } = useNotifications();
  const { data: unreadNotificationCount } = useUnreadNotificationCount();
  const markNotificationRead = useMarkNotificationRead();
  const acceptFriendRequest = useAcceptFriendRequest();
  const ignoreFriendRequest = useIgnoreFriendRequest();

  const handleNotificationClick = (notif: any) => {
    // Don't navigate for friend requests - they have action buttons
    if (notif.type === 'friend_request') return;
    
    // Mark as read
    if (!notif.read_at) {
      markNotificationRead.mutate(notif.id);
    }
    
    // Navigate based on notification type
    if (notif.reference_id) {
      setPopoverOpen(false);
      if (notif.type === 'group_invite') {
        navigate(`/group/${notif.reference_id}`);
      } else if (notif.type === 'comment' || notif.type === 'like') {
        navigate(`/?post=${notif.reference_id}`);
      }
    }
  };

  const handleAcceptFriend = async (notif: any) => {
    try {
      await acceptFriendRequest.mutateAsync({ 
        senderId: notif.reference_id, 
        notificationId: notif.id 
      });
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error('Failed to accept friend request');
    }
  };

  const handleIgnoreFriend = async (notif: any) => {
    try {
      await ignoreFriendRequest.mutateAsync({ 
        senderId: notif.reference_id, 
        notificationId: notif.id 
      });
      toast.success('Friend request ignored');
    } catch (error) {
      toast.error('Failed to ignore friend request');
    }
  };

  const totalUnread = (unreadEncouragementCount || 0) + (unreadNotificationCount || 0);
  const isLoading = loadingEncouragements || loadingNotifications;

  // Sample notifications for demo
  const sampleNotifications = [
    { id: 'sample-1', text: '🔥 Sarah M. is on a 7-day streak!', time: '2 hours ago' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 relative rounded-full bg-card hover:bg-muted">
                <Flame size={20} className="text-orange-400" />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0 bg-card border-border rounded-2xl">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {/* Real notifications */}
                    {notifications && notifications.map((notif: any) => {
                      const isFriendRequest = notif.type === 'friend_request' && !notif.read_at;
                      const isClickable = !isFriendRequest && notif.reference_id && 
                        (notif.type === 'comment' || notif.type === 'like' || notif.type === 'group_invite');
                      
                      return (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 rounded-xl transition-colors ${
                            isClickable ? 'cursor-pointer hover:bg-muted' : ''
                          } ${!notif.read_at ? 'bg-primary/10' : ''}`}
                        >
                          <p className="font-medium text-sm">{notif.title}</p>
                          {notif.body && !isFriendRequest && (
                            <p className="text-muted-foreground text-sm mt-0.5 truncate">"{notif.body}"</p>
                          )}
                          
                          {/* Friend request action buttons */}
                          {isFriendRequest && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                className="flex-1 gap-1"
                                onClick={(e) => { e.stopPropagation(); handleAcceptFriend(notif); }}
                                disabled={acceptFriendRequest.isPending || ignoreFriendRequest.isPending}
                              >
                                <Check size={14} />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1"
                                onClick={(e) => { e.stopPropagation(); handleIgnoreFriend(notif); }}
                                disabled={acceptFriendRequest.isPending || ignoreFriendRequest.isPending}
                              >
                                <X size={14} />
                                Ignore
                              </Button>
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      );
                    })}

                    {/* Real encouragements */}
                    {encouragements && encouragements.map((enc: any) => (
                      <div 
                        key={enc.id} 
                        onClick={() => {
                          setPopoverOpen(false);
                          navigate('/encourage?tab=received');
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition-colors ${!enc.read_at ? 'bg-primary/10' : 'hover:bg-muted'}`}
                      >
                        <p className="font-medium text-sm">
                          {enc.emoji && <span className="mr-1">{enc.emoji}</span>}
                          {enc.sender?.name || 'Someone'} sent you encouragement!
                        </p>
                        {enc.message && (
                          <p className="text-muted-foreground text-sm mt-0.5">"{enc.message}"</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(enc.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                    
                    {/* Sample notifications */}
                    {sampleNotifications.map((notif) => (
                      <div key={notif.id} className="p-3 rounded-xl hover:bg-muted">
                        <p className="font-medium text-sm">{notif.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                      </div>
                    ))}

                    {(!notifications || notifications.length === 0) && 
                     (!encouragements || encouragements.length === 0) && 
                     sampleNotifications.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No notifications yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}

import { useState } from 'react';
import { Loader2, Send, Inbox, MessageCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Paywall } from '@/components/Paywall';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatDialog } from '@/components/ChatDialog';
import { useAuth } from '@/hooks/useAuth';
import { 
  useFriendsToEncourage, 
  useSendEncouragement, 
  useReceivedEncouragements,
  useUnreadEncouragementCount,
  useMarkEncouragementRead
} from '@/hooks/useEncouragements';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const QUICK_EMOJIS = ['🔥', '💪', '❤️', '⭐', '🚀'];

interface ChatState {
  isOpen: boolean;
  friendId: string;
  friendName: string;
}

export default function Encourage() {
  const { user } = useAuth();
  const { data: friends, isLoading: loadingFriends } = useFriendsToEncourage();
  const { data: receivedEncouragements, isLoading: loadingReceived } = useReceivedEncouragements();
  const { data: unreadCount } = useUnreadEncouragementCount();
  const sendEncouragement = useSendEncouragement();
  const markRead = useMarkEncouragementRead();
  
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chat, setChat] = useState<ChatState>({ isOpen: false, friendId: '', friendName: '' });

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (friends) {
      setSelectedFriends(new Set(friends.map(f => f.id)));
    }
  };

  const deselectAll = () => {
    setSelectedFriends(new Set());
  };

  const handleSend = async () => {
    if (selectedFriends.size === 0) {
      toast({
        title: "Select friends",
        description: "Please select at least one friend to encourage.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedEmoji && !customMessage.trim()) {
      toast({
        title: "Add a message",
        description: "Please select an emoji or write a custom message.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      const promises = Array.from(selectedFriends).map(friendId =>
        sendEncouragement.mutateAsync({
          recipient_id: friendId,
          emoji: selectedEmoji,
          message: customMessage.trim() || null
        })
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Encouragement sent! 🎉",
        description: `Sent to ${selectedFriends.size} friend${selectedFriends.size > 1 ? 's' : ''}.`
      });
      
      // Reset form
      setSelectedFriends(new Set());
      setSelectedEmoji(null);
      setCustomMessage('');
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markRead.mutateAsync(id);
    } catch (error) {
      // Silently fail for sample data
    }
  };

  const allSelected = friends && friends.length > 0 && selectedFriends.size === friends.length;

  // Sample received encouragements for demo
  const sampleReceived = [
    { id: 'sample-r1', sender_id: 'sample-s1', emoji: '🔥', message: 'You got this today!', sender_name: 'Sarah M.', created_at: new Date(Date.now() - 3600000).toISOString(), read_at: null },
    { id: 'sample-r2', sender_id: 'sample-s2', emoji: '💪', message: null, sender_name: 'Jake R.', created_at: new Date(Date.now() - 7200000).toISOString(), read_at: new Date().toISOString() },
    { id: 'sample-r3', sender_id: 'sample-s3', emoji: '❤️', message: 'Crush those goals!', sender_name: 'Morgan L.', created_at: new Date(Date.now() - 86400000).toISOString(), read_at: new Date().toISOString() },
  ];

  const allReceived = [
    ...(receivedEncouragements || []).map((enc: any) => ({
      id: enc.id,
      sender_id: enc.sender_id,
      emoji: enc.emoji,
      message: enc.message,
      sender_name: enc.sender?.name || 'Someone',
      created_at: enc.created_at,
      read_at: enc.read_at
    })),
    ...sampleReceived
  ];

  const openChat = (senderId: string, senderName: string) => {
    setChat({ isOpen: true, friendId: senderId, friendName: senderName });
  };

  const closeChat = () => {
    setChat({ isOpen: false, friendId: '', friendName: '' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Encourage" />
      
      <main className="max-w-md mx-auto px-4">
        <Tabs defaultValue="send" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="send" className="flex-1 gap-1.5">
              <Send size={14} />
              Send
            </TabsTrigger>
            <TabsTrigger value="received" className="flex-1 gap-1.5 relative">
              <Inbox size={14} />
              Received
              {(unreadCount || 0) > 0 && (
                <span className="ml-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send">
            {loadingFriends ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !friends || friends.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">All your friends have posted today! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later to encourage those who need a nudge.
                </p>
              </div>
            ) : (
              <>
                {/* Friends who haven't posted */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">
                      Friends who haven't posted today
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={allSelected ? deselectAll : selectAll}
                      className="text-xs h-7"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {friends.map((friend, index) => (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 bg-card border border-border"
                      >
                        <Checkbox
                          id={friend.id}
                          checked={selectedFriends.has(friend.id)}
                          onCheckedChange={() => toggleFriend(friend.id)}
                        />
                        <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          {friend.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <label 
                          htmlFor={friend.id}
                          className="flex-1 text-sm font-medium cursor-pointer"
                        >
                          {friend.name || 'Anonymous'}
                        </label>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Quick emoji reactions */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Quick emoji
                  </p>
                  <div className="flex gap-2">
                    {QUICK_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setSelectedEmoji(selectedEmoji === emoji ? null : emoji)}
                        className={`w-12 h-12 text-2xl flex items-center justify-center border transition-all ${
                          selectedEmoji === emoji 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border bg-card hover:bg-accent/10'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom message */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Custom message (optional)
                  </p>
                  <Textarea
                    placeholder="You got this! Time to crush it today..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={isSending || selectedFriends.size === 0}
                  className="w-full"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Encouragement
                  {selectedFriends.size > 0 && ` to ${selectedFriends.size}`}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="received">
            {loadingReceived ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allReceived.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No encouragements yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When friends send you encouragement, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allReceived.map((enc, index) => (
                  <motion.div
                    key={enc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      if (!enc.read_at) handleMarkRead(enc.id);
                      openChat(enc.sender_id, enc.sender_name);
                    }}
                    className={`p-4 border cursor-pointer transition-colors hover:bg-accent/5 ${
                      !enc.read_at 
                        ? 'bg-accent/10 border-accent/30' 
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {enc.emoji && (
                        <span className="text-2xl">{enc.emoji}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {enc.sender_name}
                          {!enc.read_at && (
                            <span className="ml-2 text-[10px] font-bold text-accent">NEW</span>
                          )}
                        </p>
                        {enc.message && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            "{enc.message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(enc.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <MessageCircle size={16} className="text-muted-foreground mt-1" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
      <Paywall />

      {/* Chat Dialog */}
      {chat.isOpen && (
        <ChatDialog
          friendId={chat.friendId}
          friendName={chat.friendName}
          onClose={closeChat}
        />
      )}
    </div>
  );
}

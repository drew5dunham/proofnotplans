import { useState } from 'react';
import { Loader2, Send, Inbox, MessageCircle, Target, Plus } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Paywall } from '@/components/Paywall';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportGoalDialog } from '@/components/ReportGoalDialog';
import { UserAvatar } from '@/components/UserAvatar';
import { AddFriendsPrompt } from '@/components/AddFriendsPrompt';
import { SwipeableConversation } from '@/components/SwipeableConversation';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useAuth } from '@/hooks/useAuth';
import { useGoals } from '@/hooks/useGoals';
import { useHasPostedToday } from '@/hooks/useHasPostedToday';
import { 
  useAllFriends, 
  useSendEncouragement
} from '@/hooks/useEncouragements';
import { useConversations, useUnreadConversationCount, useDeleteConversation } from '@/hooks/useConversations';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const QUICK_EMOJIS = ['🔥', '💪', '❤️', '⭐', '🚀'];

export default function Encourage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultTab = searchParams.get('tab') === 'received' ? 'received' : 'send';
  const { user } = useAuth();
  const { goals } = useGoals();
  const { hasPostedToday, isLoading: loadingPosted } = useHasPostedToday();
  const { data: friends, isLoading: loadingFriends } = useAllFriends();
  const { data: conversations, isLoading: loadingConversations } = useConversations();
  const { data: unreadCount } = useUnreadConversationCount();
  const deleteConversation = useDeleteConversation();
  const sendEncouragement = useSendEncouragement();
  
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ friendId: string; friendName: string } | null>(null);

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

  const allSelected = friends && friends.length > 0 && selectedFriends.size === friends.length;

  const openChat = (friendId: string, friendName: string) => {
    const params = new URLSearchParams({ name: friendName });
    navigate(`/chat/${friendId}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
      <Header title="Encourage" />
      
      <main className="max-w-md mx-auto px-4">
        <Tabs defaultValue={defaultTab} className="w-full">
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
            <AddFriendsPrompt />
            
            {/* Gate: Must post today to send encouragements */}
            {!hasPostedToday && !loadingPosted ? (
              <div className="mb-4 p-4 bg-primary/10 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/20 text-primary rounded-xl">
                    <Target size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      Post first to encourage friends
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Report on a goal today to unlock the ability to send encouragements.
                    </p>
                    {goals && goals.length > 0 ? (
                      <ReportGoalDialog 
                        trigger={
                          <Button size="sm" className="mt-3 rounded-full">
                            <Plus size={16} className="mr-1.5" />
                            Report Now
                          </Button>
                        }
                      />
                    ) : (
                      <Button asChild size="sm" className="mt-3 rounded-full">
                        <Link to="/goals?add=true">Add Goals First</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : loadingFriends || loadingPosted ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !friends || friends.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No friends to encourage yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add friends to start sending encouragements.
                </p>
              </div>
            ) : (
              <>
                {/* Friends list */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">
                      Select friends to encourage
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
                        className="flex items-center gap-3 p-4 bg-card rounded-2xl"
                      >
                        <Checkbox
                          id={friend.id}
                          checked={selectedFriends.has(friend.id)}
                          onCheckedChange={() => toggleFriend(friend.id)}
                        />
                        <UserAvatar name={friend.name} avatarUrl={friend.avatar_url} size="md" />
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
                        className={`w-12 h-12 text-2xl flex items-center justify-center rounded-xl transition-all ${
                          selectedEmoji === emoji 
                            ? 'bg-primary/20 ring-2 ring-primary' 
                            : 'bg-card hover:bg-muted'
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
                    className="resize-none rounded-xl"
                    rows={3}
                  />
                </div>

                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={isSending || selectedFriends.size === 0}
                  className="w-full rounded-xl"
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
            {loadingConversations ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When friends send you messages, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv, index) => (
                  <motion.div
                    key={conv.friendId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SwipeableConversation
                      conversation={conv}
                      onTap={() => openChat(conv.friendId, conv.friendName)}
                      onDelete={() => setDeleteTarget({ friendId: conv.friendId, friendName: conv.friendName })}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
      <Paywall />
      
      {/* Delete Conversation Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Conversation"
        description={`Are you sure you want to delete your conversation with ${deleteTarget?.friendName}? This will delete all messages.`}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteConversation.mutateAsync(deleteTarget.friendId);
            toast({
              title: "Conversation deleted",
              description: "All messages have been removed."
            });
          }
        }}
      />
    </div>
  );
}

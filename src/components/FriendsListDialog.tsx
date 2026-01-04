import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, UserPlus, Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { useFriends, useFriendCount } from '@/hooks/useFriends';
import { useSearchUsers, useSendFriendRequest } from '@/hooks/useFriendRequests';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface FriendsListDialogProps {
  userId?: string;
  userName?: string;
}

export function FriendsListDialog({ userId, userName }: FriendsListDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  
  const { data: friends, isLoading } = useFriends(userId);
  const { data: friendCount } = useFriendCount(userId);
  const { data: searchResults, isLoading: searching } = useSearchUsers(searchTerm);
  const sendRequest = useSendFriendRequest();

  const handleFriendClick = (friendId: string) => {
    navigate(`/user/${friendId}`);
  };

  const handleSendRequest = async (friendId: string, friendName: string | null) => {
    try {
      await sendRequest.mutateAsync({ friendId, friendName });
      toast.success(`Friend request sent to ${friendName || 'user'}!`);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  const isOwnProfile = !userId;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { 
      setOpen(isOpen); 
      if (!isOpen) { setShowAddFriend(false); setSearchTerm(''); setSentRequests(new Set()); } 
    }}>
      <DialogTrigger asChild>
        <button className="stat-block w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-1 text-blue-400 mb-1">
            <Users size={18} />
          </div>
          <span className="text-2xl font-bold">{friendCount || 0}</span>
          <span className="text-xs text-muted-foreground">friends</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{userName ? `${userName}'s Friends` : 'Friends'}</DialogTitle>
            {isOwnProfile && !showAddFriend && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAddFriend(true)}
                className="gap-1 text-primary"
              >
                <UserPlus size={16} />
                Add Friends
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
          {showAddFriend ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              
              {searching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchTerm.length < 2 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Type at least 2 characters to search
                </p>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card"
                    >
                      <UserAvatar name={user.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name || 'Anonymous'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={sentRequests.has(user.id) ? "secondary" : "default"}
                        disabled={sentRequests.has(user.id) || sendRequest.isPending}
                        onClick={() => handleSendRequest(user.id, user.name)}
                        className="gap-1"
                      >
                        {sentRequests.has(user.id) ? (
                          <>
                            <Check size={14} />
                            Sent
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            Add
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found
                </p>
              )}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => { setShowAddFriend(false); setSearchTerm(''); }}
              >
                Back to Friends List
              </Button>
            </div>
          ) : isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : friends && friends.length > 0 ? (
            <div className="space-y-2">
              {friends.map((friend, index) => (
                <motion.button
                  key={friend.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleFriendClick(friend.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted transition-colors text-left"
                >
                  <UserAvatar name={friend.name} avatarUrl={friend.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{friend.name || 'Anonymous'}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No friends yet</p>
              {isOwnProfile && (
                <Button 
                  variant="link" 
                  className="mt-2 text-primary"
                  onClick={() => setShowAddFriend(true)}
                >
                  Add your first friend
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

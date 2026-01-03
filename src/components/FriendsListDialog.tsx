import { useNavigate } from 'react-router-dom';
import { Users, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFriends, useFriendCount } from '@/hooks/useFriends';
import { motion } from 'framer-motion';

interface FriendsListDialogProps {
  userId?: string;
  userName?: string;
}

export function FriendsListDialog({ userId, userName }: FriendsListDialogProps) {
  const navigate = useNavigate();
  const { data: friends, isLoading } = useFriends(userId);
  const { data: friendCount } = useFriendCount(userId);

  const handleFriendClick = (friendId: string) => {
    navigate(`/user/${friendId}`);
  };

  return (
    <Dialog>
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
          <DialogTitle>{userName ? `${userName}'s Friends` : 'Friends'}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
          {isLoading ? (
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
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                    {(friend.name || 'U').charAt(0).toUpperCase()}
                  </div>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

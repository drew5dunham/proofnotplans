import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGroups } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface InviteToGroupDialogProps {
  groupId: string;
  groupName: string;
}

interface Friend {
  id: string;
  name: string | null;
}

const PAGE_SIZE = 20;

export function InviteToGroupDialog({ groupId, groupName }: InviteToGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { inviteToGroup } = useGroups();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch accepted friends
  const fetchFriends = async (pageNum: number, append = false) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Get accepted friendships where user is either user_id or friend_id
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      // Extract friend IDs (the other person in each friendship)
      const friendIds = (friendships || []).map((f) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      if (friendIds.length === 0) {
        if (!append) setFriends([]);
        setHasMore(false);
        return;
      }

      // Fetch profiles for friends
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', friendIds);

      if (profileError) throw profileError;

      const newFriends = (profiles || []).map((p) => ({
        id: p.id,
        name: p.name,
      }));

      setFriends((prev) => (append ? [...prev, ...newFriends] : newFriends));
      setHasMore(friendships?.length === PAGE_SIZE);
    } catch (err) {
      toast({ title: 'Failed to load friends', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch existing group members
  const fetchExistingMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    setExistingMemberIds(new Set((data || []).map((m) => m.user_id)));
  };

  useEffect(() => {
    if (open) {
      setPage(0);
      setHasMore(true);
      setFriends([]);
      setInvitedIds(new Set());
      fetchFriends(0, false);
      fetchExistingMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f) => f.name?.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFriends(nextPage, true);
  };

  const handleInvite = (userId: string) => {
    inviteToGroup(
      { groupId, userId },
      {
        onSuccess: () => {
          setInvitedIds((prev) => new Set([...prev, userId]));
        },
      }
    );
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    setFriends([]);
    setInvitedIds(new Set());
    setPage(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus size={14} className="mr-1" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Invite to {groupName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="pl-9"
            />
          </div>

          {/* Friends list */}
          <ScrollArea className="h-[280px] border border-border rounded-md">
            {isLoading && friends.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {friends.length === 0 ? 'No friends yet' : 'No matches'}
              </p>
            ) : (
              <div className="p-2 space-y-1">
                {filteredFriends.map((friend) => {
                  const alreadyMember = existingMemberIds.has(friend.id);
                  const justInvited = invitedIds.has(friend.id);
                  const disabled = alreadyMember || justInvited;

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm truncate">{friend.name || 'Unknown'}</span>
                      <Button
                        size="sm"
                        variant={disabled ? 'ghost' : 'default'}
                        disabled={disabled}
                        onClick={() => handleInvite(friend.id)}
                      >
                        {alreadyMember ? 'Member' : justInvited ? 'Invited' : 'Invite'}
                      </Button>
                    </div>
                  );
                })}

                {hasMore && !searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Load more'}
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

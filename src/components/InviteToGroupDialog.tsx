import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/UserAvatar';
import { useGroups } from '@/hooks/useGroups';
import { useAllFriends } from '@/hooks/useEncouragements';
import { supabase } from '@/integrations/supabase/client';
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

export function InviteToGroupDialog({ groupId, groupName }: InviteToGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const { inviteToGroup } = useGroups();
  const { data: friends, isLoading } = useAllFriends();

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
      setInvitedIds(new Set());
      fetchExistingMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Filter out sample friends (demo data) and apply search query
  const filteredFriends = useMemo(() => {
    if (!friends) return [];
    // Filter out sample IDs - they can't be invited to real groups
    const realFriends = friends.filter((f) => !f.id.startsWith('sample-'));
    if (!searchQuery.trim()) return realFriends;
    const q = searchQuery.toLowerCase();
    return realFriends.filter((f) => f.name?.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const handleInvite = (userId: string) => {
    inviteToGroup(
      { groupId, userId, groupName },
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
    setInvitedIds(new Set());
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
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {(friends?.length ?? 0) === 0 ? 'No friends yet' : 'No matches'}
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
                      <div className="flex items-center gap-2">
                        <UserAvatar name={friend.name} size="xs" />
                        <span className="text-sm truncate">{friend.name || 'Unknown'}</span>
                      </div>
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
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

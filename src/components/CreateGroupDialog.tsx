import { useState } from 'react';
import { Users, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CategoryIcon, getCategoryLabel, CATEGORIES } from '@/components/CategoryIcon';
import { useGroups } from '@/hooks/useGroups';
import { useFriends } from '@/hooks/useFriends';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Category } from '@/types';

interface CreateGroupDialogProps {
  trigger?: React.ReactNode;
}

export function CreateGroupDialog({ trigger }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'details' | 'invite'>('details');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('fitness');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const { createGroupAsync, inviteToGroup, isCreating } = useGroups();
  const { data: friends, isLoading: loadingFriends } = useFriends();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const group = await createGroupAsync({ name: name.trim(), category });
      if (group) {
        setCreatedGroupId(group.id);
        setStep('invite');
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleInviteAndClose = () => {
    if (createdGroupId) {
      selectedFriends.forEach(friendId => {
        inviteToGroup({ groupId: createdGroupId, userId: friendId, groupName: name });
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setStep('details');
    setName('');
    setCategory('fitness');
    setSelectedFriends(new Set());
    setCreatedGroupId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Plus size={16} className="mr-1" />
            New Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} />
            {step === 'details' ? 'Create Group' : 'Invite Friends'}
          </DialogTitle>
        </DialogHeader>

        {step === 'details' ? (
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Group Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Summer Shred 2026"
                maxLength={50}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2 border rounded-lg flex flex-col items-center gap-1 text-xs transition-colors ${
                      category === cat
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:border-foreground/20'
                    }`}
                  >
                    <CategoryIcon category={cat} size={18} />
                    <span className="capitalize">{getCategoryLabel(cat)}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!name.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Next: Invite Friends'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select friends to invite to "{name}"
            </p>

            <ScrollArea className="h-[240px] border border-border rounded-xl">
              {loadingFriends ? (
                <div className="flex items-center justify-center h-full py-8">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : !friends || friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No friends to invite yet</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {friends.map((friend) => {
                    const isSelected = selectedFriends.has(friend.id);
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => toggleFriend(friend.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-xs font-semibold text-white">
                            {(friend.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{friend.name || 'Anonymous'}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check size={12} className="text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
              >
                Skip
              </Button>
              <Button 
                className="flex-1"
                onClick={handleInviteAndClose}
                disabled={selectedFriends.size === 0}
              >
                Invite ({selectedFriends.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

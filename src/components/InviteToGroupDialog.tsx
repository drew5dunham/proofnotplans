import { useState } from 'react';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface SearchResult {
  id: string;
  name: string | null;
}

export function InviteToGroupDialog({ groupId, groupName }: InviteToGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const { inviteToGroup } = useGroups();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .ilike('name', `%${searchQuery}%`)
        .neq('id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
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
    setSearchResults([]);
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
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Invite to {groupName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-2 border border-border"
                >
                  <span className="text-sm">{result.name || 'Unknown'}</span>
                  <Button
                    size="sm"
                    variant={invitedIds.has(result.id) ? 'ghost' : 'default'}
                    disabled={invitedIds.has(result.id)}
                    onClick={() => handleInvite(result.id)}
                  >
                    {invitedIds.has(result.id) ? 'Invited' : 'Invite'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No users found
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

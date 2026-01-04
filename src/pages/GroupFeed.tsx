import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { FeedPost } from '@/components/FeedPost';
import { CategoryIcon, getCategoryLabel } from '@/components/CategoryIcon';
import { UserAvatar } from '@/components/UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InviteToGroupDialog } from '@/components/InviteToGroupDialog';
import type { Category } from '@/types';
import type { DbCompletion } from '@/hooks/useGoals';

export default function GroupFeed() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptInvitation, declineInvitation, isAccepting, isDeclining } = useGroups();
  const [membersOpen, setMembersOpen] = useState(false);

  // Check if user has a pending invitation to this group
  const { data: pendingInvitation } = useQuery({
    queryKey: ['pending-invitation', groupId, user?.id],
    queryFn: async () => {
      if (!groupId || !user) return null;
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!user,
  });

  // Fetch group details
  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch group members
  const { data: members } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('status', 'accepted');

      if (error) throw error;
      return data?.map((m) => m.user_id) || [];
    },
    enabled: !!groupId,
  });

  const { data: memberProfiles } = useQuery({
    queryKey: ['group-member-profiles', groupId, JSON.stringify(members)],
    queryFn: async () => {
      if (!members || members.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', members);

      if (error) throw error;
      return data || [];
    },
    enabled: !!members && members.length > 0,
  });

  // Fetch feed: public goals in the group's category for group members
  const { data: feed, isLoading: loadingFeed } = useQuery({
    queryKey: ['group-feed', groupId, group?.category, JSON.stringify(members)],
    queryFn: async (): Promise<DbCompletion[]> => {
      if (!group || !members || members.length === 0) {
        console.log('GroupFeed: missing deps', { group, members });
        return [];
      }

      console.log('GroupFeed: fetching goals for', { category: group.category, members });

      // First get all public goals in this category for group members
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, user_id, name, category, visibility')
        .in('user_id', members)
        .eq('category', group.category)
        .eq('visibility', 'public');

      console.log('GroupFeed: goals result', { goals, goalsError });

      if (goalsError) throw goalsError;
      if (!goals || goals.length === 0) return [];

      const goalIds = goals.map((g) => g.id);

      // Then get completions for those goals
      const { data: completions, error: completionsError } = await supabase
        .from('goal_completions')
        .select('*, goals(*)')
        .in('goal_id', goalIds)
        .order('completed_at', { ascending: false })
        .limit(50);

      console.log('GroupFeed: completions result', { completions, completionsError });

      if (completionsError) throw completionsError;

      // Fetch user profiles for the completions
      const userIds = [...new Set((completions || []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (completions || []).map((c) => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
      })) as DbCompletion[];
    },
    enabled: !!group && !!members && members.length > 0,
  });

  const isLoading = loadingGroup || loadingFeed;

  if (!group && !loadingGroup) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Group" />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Group not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/profile')}>
            Back to Profile
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={group?.name || 'Group Feed'} />

      <main className="max-w-md mx-auto px-4">
        {/* Pending invitation banner */}
        {pendingInvitation && (
          <div className="mb-4 p-4 bg-primary/10 rounded-2xl border border-primary/20">
            <p className="font-medium text-sm mb-3">
              You've been invited to join this group!
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => groupId && acceptInvitation(groupId)}
                disabled={isAccepting || isDeclining}
                className="flex-1"
              >
                <Check size={16} className="mr-1" />
                {isAccepting ? 'Accepting...' : 'Accept'}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  if (groupId) {
                    declineInvitation(groupId);
                    navigate('/profile');
                  }
                }}
                disabled={isAccepting || isDeclining}
                className="flex-1"
              >
                <X size={16} className="mr-1" />
                {isDeclining ? 'Declining...' : 'Decline'}
              </Button>
            </div>
          </div>
        )}

        {/* Back button & group info */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft size={20} />
          </Button>
          {group && (
            <>
              <div className="flex-1">
                <h1 className="text-lg font-bold">{group.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="category-badge">
                    <CategoryIcon category={group.category as Category} size={12} />
                    <span>{getCategoryLabel(group.category as Category)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMembersOpen(true)}
                    className="text-xs text-primary hover:text-primary/80 underline cursor-pointer transition-colors"
                  >
                    {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
              {/* Invite button - only show for accepted members */}
              {!pendingInvitation && (
                <InviteToGroupDialog groupId={group.id} groupName={group.name} />
              )}
            </>
          )}
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !feed || feed.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-2xl">
            <Users size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete goals in the "{getCategoryLabel(group?.category as Category)}" category to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((post, index) => (
              <FeedPost key={post.id} post={post} index={index} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users size={18} />
              Members
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {(memberProfiles || []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <UserAvatar name={p.name} avatarUrl={p.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

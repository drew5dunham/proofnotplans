import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight, LogOut, Trash2, UserPlus } from 'lucide-react';
import { useGroups, GroupWithMembers } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { CategoryIcon, getCategoryLabel } from '@/components/CategoryIcon';
import { CreateGroupDialog } from '@/components/CreateGroupDialog';
import { InviteToGroupDialog } from '@/components/InviteToGroupDialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Category } from '@/types';

export function GroupsSection() {
  const { groups, isLoading, leaveGroup, deleteGroup } = useGroups();
  const { user } = useAuth();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<GroupWithMembers | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GroupWithMembers | null>(null);

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="h-20 bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users size={16} />
          My Groups
        </h3>
        <CreateGroupDialog />
      </div>

      {groups.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border">
          <Users size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No groups yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a group to track goals with friends
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-border bg-card"
            >
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                className="w-full p-3 flex items-center justify-between text-left"
              >
                <div>
                  <p className="font-semibold text-sm">{group.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="category-badge">
                      <CategoryIcon category={group.category as Category} size={12} />
                      <span>{getCategoryLabel(group.category as Category)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className={`text-muted-foreground transition-transform ${
                    expandedGroup === group.id ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {expandedGroup === group.id && (
                <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Members</p>
                    <div className="flex flex-wrap gap-1">
                      {group.members.map((member) => (
                        <span
                          key={member.user_id}
                          className="px-2 py-1 bg-muted text-xs"
                        >
                          {member.name || 'Unknown'}
                          {member.user_id === group.created_by && (
                            <span className="ml-1 text-accent">•</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <InviteToGroupDialog groupId={group.id} groupName={group.name} />
                    
                    {group.created_by === user?.id ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDelete(group)}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmLeave(group)}
                      >
                        <LogOut size={14} className="mr-1" />
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Leave confirmation */}
      <AlertDialog open={!!confirmLeave} onOpenChange={() => setConfirmLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {confirmLeave?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll no longer see posts from this group in your feed filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmLeave) leaveGroup(confirmLeave.id);
                setConfirmLeave(null);
              }}
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all members and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteGroup(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

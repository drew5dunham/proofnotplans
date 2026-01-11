import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { UserAvatar } from '@/components/UserAvatar';
import { useComments, useAddComment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { useHasPostedToday } from '@/hooks/useHasPostedToday';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  completionId: string;
  postAuthorId: string;
  goalName: string;
}

export function CommentsDrawer({ 
  isOpen, 
  onClose, 
  completionId, 
  postAuthorId,
  goalName 
}: CommentsDrawerProps) {
  const { user } = useAuth();
  const { hasPostedToday } = useHasPostedToday();
  const { data: comments, isLoading } = useComments(isOpen ? completionId : null);
  const addComment = useAddComment();
  const [newComment, setNewComment] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (comments && comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    const content = newComment.trim();
    setNewComment('');

    try {
      await addComment.mutateAsync({
        completion_id: completionId,
        content,
        post_author_id: postAuthorId
      });
    } catch (error) {
      setNewComment(content);
      toast({
        title: "Failed to post comment",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        // Prevent background scroll issues on iOS when keyboard opens.
        document.body.style.overflow = open ? 'hidden' : '';
        if (!open) onClose();
      }}
    >
      <DrawerContent
        className="max-w-md mx-auto flex flex-col"
        style={{
          // Use VisualViewport-aware height to avoid the whole UI jumping off-screen when the keyboard opens.
          maxHeight: 'min(85vh, calc(var(--app-height, 100dvh) - 24px))',
        }}
      >
        <DrawerHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base">Comments</DrawerTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X size={16} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground truncate">{goalName}</p>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <UserAvatar
                      name={comment.profiles?.name}
                      avatarUrl={comment.profiles?.avatar_url}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm">
                          {comment.profiles?.name || 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 break-words">
                        {comment.content}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={commentsEndRef} />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No comments yet</p>
              <p className="text-sm mt-1">Be the first to comment!</p>
            </div>
          )}
        </div>

        {/* Comment input */}
        <div
          className="border-t border-border p-4"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          {!hasPostedToday ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-2">
              <Lock size={14} />
              <span>Post a goal update to comment</span>
              <Link to="/" className="text-primary underline hover:no-underline" onClick={onClose}>
                Report now
              </Link>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
                className="flex-1"
              />
              <Button
                onClick={handleSubmit}
                disabled={!newComment.trim() || addComment.isPending}
                size="icon"
              >
                {addComment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

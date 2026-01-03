import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Check, X, ThumbsUp, Flame, Trash2 } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { CommentsDrawer } from './CommentsDrawer';
import { useCommentCount } from '@/hooks/useComments';
import { formatDistanceToNow } from 'date-fns';
import type { Category } from '@/types';
import type { DbCompletion } from '@/hooks/useGoals';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FeedPostProps {
  post: DbCompletion;
  index: number;
  autoOpenComments?: boolean;
  currentUserId?: string;
  onDelete?: (completionId: string) => void;
  isDeleting?: boolean;
}

export function FeedPost({ post, index, autoOpenComments = false, currentUserId, onDelete, isDeleting = false }: FeedPostProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const postRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { data: commentCount } = useCommentCount(post.id);

  const isOwnPost = currentUserId === post.user_id;

  // Auto-open comments and scroll to post if highlighted
  useEffect(() => {
    if (autoOpenComments) {
      // Scroll to this post
      setTimeout(() => {
        postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      // Open comments drawer
      setTimeout(() => {
        setCommentsOpen(true);
      }, 500);
    }
  }, [autoOpenComments]);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleProfileClick = () => {
    navigate(`/user/${post.user_id}`);
  };

  const handleDelete = () => {
    onDelete?.(post.id);
  };

  const goalName = post.goals?.name || 'Goal';
  const category = (post.goals?.category || 'personal') as Category;
  const userName = post.profiles?.name || 'Anonymous';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <motion.article
      ref={postRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`feed-post ${autoOpenComments ? 'ring-2 ring-primary/50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <button 
          onClick={handleProfileClick}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-sm font-semibold text-white">
            {userInitial}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight hover:underline">{userName}</p>
            <p className="timestamp">
              {formatDistanceToNow(new Date(post.completed_at), { addSuffix: true })}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <div className={post.status === 'missed' ? 'completion-badge-missed' : 'completion-badge'}>
            {post.status === 'missed' ? (
              <>
                <X size={12} strokeWidth={3} />
                <span>Missed</span>
              </>
            ) : (
              <>
                <Check size={12} strokeWidth={3} />
                <span>Done</span>
              </>
            )}
          </div>
          {isOwnPost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
                  <Trash2 size={16} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your post and remove it from the feed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2">
                  <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Goal completed */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground leading-snug mb-2">
          {goalName}
        </h3>
        <div className="category-badge">
          <CategoryIcon category={category} size={12} />
          <span>{getCategoryLabel(category)}</span>
        </div>
      </div>

      {/* Reflections */}
      <div className="space-y-3 mb-4">
        {post.what_went_well && (
          <div className="p-3 bg-success/10 rounded-xl">
            <div className="flex items-center gap-1.5 text-success text-xs font-medium mb-1">
              <ThumbsUp size={12} />
              <span>What went well</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {post.what_went_well}
            </p>
          </div>
        )}
        {post.what_was_hard && (
          <div className="p-3 bg-orange-500/10 rounded-xl">
            <div className="flex items-center gap-1.5 text-orange-400 text-xs font-medium mb-1">
              <Flame size={12} />
              <span>What was hard</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {post.what_was_hard}
            </p>
          </div>
        )}
      </div>

      {/* Photo if exists */}
      {post.media_type === 'photo' && post.media_url && (
        <div className="mb-4 -mx-4">
          <img
            src={post.media_url}
            alt={`Proof for ${goalName}`}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Caption if exists */}
      {post.caption && (
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {post.caption}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/50">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 text-sm py-2 transition-colors ${
            liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 && <span className="font-medium">{likeCount}</span>}
        </button>
        <button 
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <MessageCircle size={18} />
          {(commentCount || 0) > 0 && <span className="font-medium">{commentCount}</span>}
        </button>
      </div>

      {/* Comments Drawer */}
      <CommentsDrawer
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        completionId={post.id}
        postAuthorId={post.user_id}
        goalName={goalName}
      />
    </motion.article>
  );
}

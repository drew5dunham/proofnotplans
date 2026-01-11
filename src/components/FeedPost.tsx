import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Check, X, ThumbsUp, Flame, Trash2, Lock } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { CommentsDrawer } from './CommentsDrawer';
import { UserAvatar } from './UserAvatar';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { useCommentCount } from '@/hooks/useComments';
import { useHasPostedToday } from '@/hooks/useHasPostedToday';
import { formatDistanceToNow } from 'date-fns';
import type { Category } from '@/types';
import type { DbCompletion } from '@/hooks/useGoals';
import { toast } from '@/hooks/use-toast';

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
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const postRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { data: commentCount } = useCommentCount(post.id);
  const { hasPostedToday, isLoggedIn } = useHasPostedToday();

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
    if (!isLoggedIn || !hasPostedToday) {
      toast({
        title: "Post first to interact",
        description: "Report on a goal today to like and comment on posts.",
      });
      return;
    }
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleCommentClick = () => {
    if (!isLoggedIn || !hasPostedToday) {
      toast({
        title: "Post first to interact",
        description: "Report on a goal today to like and comment on posts.",
      });
      return;
    }
    setCommentsOpen(true);
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
  const userAvatarUrl = post.profiles?.avatar_url;

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
          <UserAvatar name={userName} avatarUrl={userAvatarUrl} size="md" />
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
            <button 
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
            >
              <Trash2 size={16} />
            </button>
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
        <>
          <button 
            onClick={() => setImageFullscreen(true)}
            className="mb-4 -mx-4 block w-[calc(100%+2rem)] cursor-pointer"
          >
            <img
              src={post.media_url}
              alt={`Proof for ${goalName}`}
              className="w-full object-contain max-h-[400px]"
            />
          </button>

          {/* Fullscreen image modal */}
          <AnimatePresence>
            {imageFullscreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black flex items-center justify-center"
                onClick={() => setImageFullscreen(false)}
              >
                <button
                  onClick={() => setImageFullscreen(false)}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
                >
                  <X size={28} />
                </button>
                <motion.img
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  src={post.media_url}
                  alt={`Proof for ${goalName}`}
                  className="max-w-full max-h-full object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
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
            !isLoggedIn || !hasPostedToday 
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {!isLoggedIn || !hasPostedToday ? (
            <Lock size={16} />
          ) : (
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          )}
          {likeCount > 0 && <span className="font-medium">{likeCount}</span>}
        </button>
        <button 
          onClick={handleCommentClick}
          className={`flex items-center gap-2 text-sm py-2 transition-colors ${
            !isLoggedIn || !hasPostedToday 
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {!isLoggedIn || !hasPostedToday ? (
            <Lock size={16} />
          ) : (
            <MessageCircle size={18} />
          )}
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

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() => {
          onDelete?.(post.id);
          setConfirmDelete(false);
        }}
        title="Delete this post?"
        description="This action cannot be undone. This will permanently delete your post and remove it from the feed."
        isDeleting={isDeleting}
      />
    </motion.article>
  );
}

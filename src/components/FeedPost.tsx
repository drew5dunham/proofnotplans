import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Check, X, ThumbsUp, Flame } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { CommentsDrawer } from './CommentsDrawer';
import { useCommentCount } from '@/hooks/useComments';
import { formatDistanceToNow } from 'date-fns';
import type { Category } from '@/types';
import type { DbCompletion } from '@/hooks/useGoals';

interface FeedPostProps {
  post: DbCompletion;
  index: number;
}

export function FeedPost({ post, index }: FeedPostProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const navigate = useNavigate();
  const { data: commentCount } = useCommentCount(post.id);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleProfileClick = () => {
    navigate(`/user/${post.user_id}`);
  };

  const goalName = post.goals?.name || 'Goal';
  const category = (post.goals?.category || 'personal') as Category;
  const userName = post.profiles?.name || 'Anonymous';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="feed-post"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <button 
          onClick={handleProfileClick}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            {userInitial}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight hover:underline">{userName}</p>
            <p className="timestamp">
              {formatDistanceToNow(new Date(post.completed_at), { addSuffix: true })}
            </p>
          </div>
        </button>
        <div className={`completion-badge ${post.status === 'missed' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ''}`}>
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
      </div>

      {/* Goal completed */}
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground leading-snug mb-1.5">
          {goalName}
        </h3>
        <div className="category-badge">
          <CategoryIcon category={category} size={12} />
          <span>{getCategoryLabel(category)}</span>
        </div>
      </div>

      {/* Reflections */}
      <div className="space-y-3 mb-3">
        {post.what_went_well && (
          <div className="p-3 bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium mb-1">
              <ThumbsUp size={12} />
              <span>What went well</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {post.what_went_well}
            </p>
          </div>
        )}
        {post.what_was_hard && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-xs font-medium mb-1">
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
        <div className="mb-3 -mx-4">
          <img
            src={post.media_url}
            alt={`Proof for ${goalName}`}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Caption if exists */}
      {post.caption && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {post.caption}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 && <span className="font-medium">{likeCount}</span>}
        </button>
        <button 
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle size={16} />
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

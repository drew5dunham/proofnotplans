import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Check } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
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

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const goalName = post.goals?.name || 'Goal';
  const category = (post.goals?.category || 'personal') as Category;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="feed-post"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            U
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">User</p>
            <p className="timestamp">
              {formatDistanceToNow(new Date(post.completed_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="completion-badge">
          <Check size={12} strokeWidth={3} />
          <span>Done</span>
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
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle size={16} />
        </button>
      </div>
    </motion.article>
  );
}

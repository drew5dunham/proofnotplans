import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '@/hooks/useConversations';

interface SwipeableConversationProps {
  conversation: Conversation;
  onTap: () => void;
  onDelete: () => void;
}

const DELETE_THRESHOLD = -80;
const MAX_SWIPE = -100;

export function SwipeableConversation({ conversation, onTap, onDelete }: SwipeableConversationProps) {
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform x position to delete button opacity and scale
  const deleteOpacity = useTransform(x, [0, DELETE_THRESHOLD], [0, 1]);
  const deleteScale = useTransform(x, [0, DELETE_THRESHOLD], [0.8, 1]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldShowDelete = info.offset.x < DELETE_THRESHOLD;
    
    if (shouldShowDelete) {
      // Snap to show delete button
      setIsDeleteVisible(true);
    } else {
      // Snap back to closed
      setIsDeleteVisible(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setIsDeleteVisible(false);
  };

  const handleTap = () => {
    if (isDeleteVisible) {
      setIsDeleteVisible(false);
    } else {
      onTap();
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Delete button behind */}
      <motion.div 
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-destructive"
        style={{ opacity: deleteOpacity, scale: deleteScale }}
      >
        <button 
          onClick={handleDeleteClick}
          className="flex flex-col items-center justify-center w-full h-full text-destructive-foreground"
        >
          <Trash2 size={20} />
          <span className="text-xs mt-1 font-medium">Delete</span>
        </button>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: MAX_SWIPE, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isDeleteVisible ? MAX_SWIPE : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        style={{ x }}
        onClick={handleTap}
        className={`relative p-4 cursor-pointer transition-colors ${
          conversation.unreadCount > 0 
            ? 'bg-primary/10' 
            : 'bg-card'
        }`}
      >
        <div className="flex items-center gap-3">
          <UserAvatar 
            name={conversation.friendName} 
            avatarUrl={conversation.friendAvatarUrl} 
            size="md" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm truncate">
                {conversation.friendName}
              </p>
              <p className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
              </p>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-sm text-muted-foreground truncate">
                {conversation.isFromMe && <span className="text-muted-foreground/70">You: </span>}
                {conversation.lastMessage}
              </p>
              {conversation.unreadCount > 0 && (
                <span className="ml-2 h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

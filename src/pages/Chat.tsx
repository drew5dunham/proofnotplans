import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/hooks/useMessages';

// Helper to group messages by time (5 min threshold)
function shouldShowTimestamp(currentMsg: { created_at: string }, prevMsg?: { created_at: string }) {
  if (!prevMsg) return true;
  const diff = differenceInMinutes(new Date(currentMsg.created_at), new Date(prevMsg.created_at));
  return diff >= 5;
}

// Helper to format timestamp like iMessage
function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, h:mm a');
  }
}

export default function Chat() {
  const { friendId } = useParams<{ friendId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const friendName = searchParams.get('name') || 'Friend';
  
  const { data: messages, isLoading } = useMessages(friendId || null);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle iOS keyboard - scroll input into view when focused
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      // Small delay to let keyboard animation complete
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    };

    input.addEventListener('focus', handleFocus);
    return () => input.removeEventListener('focus', handleFocus);
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || !friendId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await sendMessage.mutateAsync({
        recipient_id: friendId,
        content: messageContent
      });
    } catch (error) {
      setNewMessage(messageContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBack = () => {
    navigate('/encourage?tab=received');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-background flex flex-col max-w-md mx-auto"
      style={{ 
        height: 'calc(100dvh)',
        minHeight: '-webkit-fill-available'
      }}
    >
      {/* iMessage-style Header - Absolutely fixed at top */}
      <header 
        className="shrink-0 bg-card/80 backdrop-blur-lg border-b border-border px-2 py-2 flex items-center gap-2 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack} 
          className="h-9 px-2 text-primary hover:bg-transparent"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </Button>
        <div className="flex-1 flex flex-col items-center -ml-8">
          <UserAvatar name={friendName} size="sm" />
          <span className="text-xs font-medium mt-0.5">{friendName}</span>
        </div>
      </header>

      {/* Messages Area - Scrollable middle section */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-4 overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <UserAvatar name={friendName} size="lg" />
            <p className="mt-3 font-semibold">{friendName}</p>
            <p className="text-sm text-muted-foreground mt-1">Start a conversation</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isMe = message.sender_id === user?.id;
              const prevMessage = messages[index - 1];
              const nextMessage = messages[index + 1];
              const showTimestamp = shouldShowTimestamp(message, prevMessage);
              
              // Determine if this is the last message in a group from same sender
              const isLastInGroup = !nextMessage || 
                nextMessage.sender_id !== message.sender_id ||
                shouldShowTimestamp(nextMessage, message);
              
              // Determine if this is the first message in a group from same sender
              const isFirstInGroup = !prevMessage || 
                prevMessage.sender_id !== message.sender_id ||
                showTimestamp;

              return (
                <div key={message.id}>
                  {/* Timestamp */}
                  {showTimestamp && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center my-3"
                    >
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </motion.div>
                  )}
                  
                  {/* Message Bubble */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${
                      isLastInGroup ? 'mb-2' : 'mb-0.5'
                    }`}
                  >
                    <div className="relative max-w-[75%]">
                      {/* Bubble */}
                      <div
                        className={`px-3 py-2 ${
                          isMe
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        } ${
                          // Rounded corners based on position in group
                          isMe
                            ? `rounded-2xl ${isLastInGroup ? 'rounded-br-sm' : ''} ${isFirstInGroup ? '' : 'rounded-tr-lg'}`
                            : `rounded-2xl ${isLastInGroup ? 'rounded-bl-sm' : ''} ${isFirstInGroup ? '' : 'rounded-tl-lg'}`
                        }`}
                      >
                        {/* Message content */}
                        <p className="text-[15px] leading-snug break-words">
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Bubble tail for last message in group */}
                      {isLastInGroup && (
                        <div
                          className={`absolute bottom-0 w-3 h-3 ${
                            isMe
                              ? 'right-0 translate-x-1/2'
                              : 'left-0 -translate-x-1/2'
                          }`}
                        >
                          <svg
                            viewBox="0 0 12 12"
                            className={`w-full h-full ${
                              isMe ? 'text-primary' : 'text-muted'
                            }`}
                            style={{
                              transform: isMe ? 'scaleX(-1)' : 'none'
                            }}
                          >
                            <path
                              fill="currentColor"
                              d="M12 0C12 0 9 0 6 4C3 8 0 12 0 12L12 12L12 0Z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* iMessage-style Input - Fixed at bottom, uses env() for keyboard */}
      <div 
        className="shrink-0 bg-card/80 backdrop-blur-lg border-t border-border p-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-1">
          <Input
            ref={inputRef}
            placeholder="iMessage"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-2 text-[16px] placeholder:text-muted-foreground"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            size="icon"
            className={`h-8 w-8 rounded-full shrink-0 transition-all ${
              newMessage.trim() 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-transparent text-muted-foreground'
            }`}
            variant="ghost"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

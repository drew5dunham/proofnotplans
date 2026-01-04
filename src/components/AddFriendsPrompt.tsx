import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFriendCount } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';

export function AddFriendsPrompt() {
  const { user } = useAuth();
  const { data: friendCount } = useFriendCount();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('friendsPromptDismissed') === 'true';
  });

  const dismiss = () => {
    sessionStorage.setItem('friendsPromptDismissed', 'true');
    setDismissed(true);
  };

  const hasFriends = (friendCount || 0) > 0;

  if (!user || hasFriends || dismissed) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-blue-500/10 rounded-2xl relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
          <Users size={20} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">
            Add friends to see their posts
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect with friends to see their goal progress in your feed.
          </p>
          <Button asChild size="sm" className="mt-3 rounded-full">
            <Link to="/profile?friends=true">
              <UserPlus size={16} className="mr-1.5" />
              Add Friends
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

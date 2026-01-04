import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PostFirstPromptProps {
  message?: string;
}

export function PostFirstPrompt({ message = "Post a goal update to unlock this feature" }: PostFirstPromptProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Lock size={14} />
      <span>{message}</span>
      <Link to="/" className="text-primary underline hover:no-underline">
        Report now
      </Link>
    </div>
  );
}

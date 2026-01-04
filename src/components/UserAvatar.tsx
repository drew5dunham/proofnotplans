import { User } from 'lucide-react';

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-20 h-20 text-3xl',
};

export function UserAvatar({ name, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
  const initial = (name || 'U').charAt(0).toUpperCase();
  
  return (
    <div 
      className={`${sizeClasses[size]} bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center font-semibold text-white overflow-hidden flex-shrink-0 ${className}`}
    >
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={name || 'User'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initial on image load error
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.classList.add('show-initial');
          }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

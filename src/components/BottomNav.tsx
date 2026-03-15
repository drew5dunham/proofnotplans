import { Users, Target, User, Trophy, Heart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { icon: Users, path: '/' },
  { icon: Heart, path: '/encourage' },
  { icon: Target, path: '/goals' },
  { icon: Trophy, path: '/leaderboard' },
  { icon: User, path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();

  const handleNavClick = (e: React.MouseEvent, path: string, isActive: boolean) => {
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-40" 
        style={{ 
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'none'
        }} 
      />
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30" 
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'hsl(0 0% 5% / 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          {navItems.map(({ icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={(e) => handleNavClick(e, path, isActive)}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

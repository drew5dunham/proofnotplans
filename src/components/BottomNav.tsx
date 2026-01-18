import { Users, Target, User, Trophy, Heart } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { icon: Users, label: 'Feed', path: '/' },
  { icon: Heart, label: 'Encourage', path: '/encourage' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: Trophy, label: 'Board', path: '/leaderboard' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent, path: string, isActive: boolean) => {
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Spacer to prevent content from appearing behind the nav */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-card z-40" 
        style={{ 
          height: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'none'
        }} 
      />
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 z-50" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-md mx-auto flex">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={(e) => handleNavClick(e, path, isActive)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-primary/20' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

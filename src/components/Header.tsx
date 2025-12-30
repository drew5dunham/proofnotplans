import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Flame size={18} className="text-orange-500" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="p-3 space-y-3">
                <div className="text-sm">
                  <p className="font-medium">🔥 Sarah M. is on a 7-day streak!</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">💪 Jake just completed his workout goal</p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">🎉 You're on a 3-day streak!</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}

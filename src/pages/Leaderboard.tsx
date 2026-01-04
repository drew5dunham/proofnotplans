import { motion } from 'framer-motion';
import { TrendingUp, Zap, Users } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Paywall } from '@/components/Paywall';
import { UserAvatar } from '@/components/UserAvatar';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardItem {
  userId: string;
  name: string;
  score: string;
  subtitle: string;
  isYou: boolean;
  avatarUrl?: string | null;
}

interface LeaderboardSectionProps {
  title: string;
  icon: typeof TrendingUp;
  data: LeaderboardItem[];
  isLoading: boolean;
}

function LeaderboardSection({ title, icon: Icon, data, isLoading }: LeaderboardSectionProps) {
  if (isLoading) {
    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-4">
          <Icon size={16} className="text-primary" />
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        <div className="space-y-2 px-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-4">
          <Icon size={16} className="text-primary" />
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        <div className="px-4">
          <div className="bg-card rounded-xl p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Add friends to see the leaderboard!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-4">
        <Icon size={16} className="text-primary" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>

      <div className="space-y-2 px-4">
        {data.map((item, index) => (
          <motion.div
            key={item.userId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              item.isYou ? 'bg-primary/10 border border-primary/30' : 'bg-card'
            }`}
          >
            <span className="w-6 text-sm font-medium text-muted-foreground">
              {index + 1}
            </span>
            <UserAvatar name={item.name} avatarUrl={item.avatarUrl} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <span className="font-semibold text-sm text-primary">{item.score}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function Leaderboard() {
  const { data, isLoading } = useLeaderboard();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="This Week" />

      <main className="max-w-md mx-auto py-4">
        <LeaderboardSection
          title="Most Consistent"
          icon={TrendingUp}
          data={data?.mostConsistent || []}
          isLoading={isLoading}
        />

        <LeaderboardSection
          title="Most Improved"
          icon={Zap}
          data={data?.mostImproved || []}
          isLoading={isLoading}
        />

        <p className="text-xs text-center text-muted-foreground mt-6 px-4">
          Rankings reset every Sunday at midnight.
        </p>
      </main>

      <BottomNav />
      <Paywall />
    </div>
  );
}

import { motion } from 'framer-motion';
import { TrendingUp, Zap } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Paywall } from '@/components/Paywall';

const leaderboardData = {
  mostConsistent: [
    { name: 'Elena', score: '100%', subtitle: '12/12 completed' },
    { name: 'Marcus', score: '92%', subtitle: '11/12 completed' },
    { name: 'Jordan', score: '83%', subtitle: '10/12 completed' },
    { name: 'Sam', score: '75%', subtitle: '9/12 completed' },
    { name: 'You', score: '78%', subtitle: '7/9 completed', isYou: true },
  ],
  mostImproved: [
    { name: 'Jordan', score: '+40%', subtitle: 'vs last week' },
    { name: 'Sam', score: '+25%', subtitle: 'vs last week' },
    { name: 'Marcus', score: '+15%', subtitle: 'vs last week' },
    { name: 'You', score: '+12%', subtitle: 'vs last week', isYou: true },
    { name: 'Elena', score: '+5%', subtitle: 'vs last week' },
  ],
};

interface LeaderboardSectionProps {
  title: string;
  icon: typeof TrendingUp;
  data: typeof leaderboardData.mostConsistent;
}

function LeaderboardSection({ title, icon: Icon, data }: LeaderboardSectionProps) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-4">
        <Icon size={16} className="text-accent" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>

      <div className="space-y-1">
        {data.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 px-4 py-3 ${
              item.isYou ? 'bg-accent/10 border-l-2 border-accent' : ''
            }`}
          >
            <span className="w-6 text-sm font-medium text-muted-foreground">
              {index + 1}
            </span>
            <div className="w-8 h-8 bg-muted flex items-center justify-center text-sm font-semibold">
              {item.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <span className="font-semibold text-sm">{item.score}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="This Week" />

      <main className="max-w-md mx-auto py-4">
        <LeaderboardSection
          title="Most Consistent"
          icon={TrendingUp}
          data={leaderboardData.mostConsistent}
        />

        <LeaderboardSection
          title="Most Improved"
          icon={Zap}
          data={leaderboardData.mostImproved}
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

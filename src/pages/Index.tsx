import { useAppStore } from '@/lib/store';
import Onboarding from './Onboarding';
import Feed from './Feed';

const Index = () => {
  const { hasCompletedOnboarding, _hasHydrated } = useAppStore();

  // Wait for store hydration before rendering router-dependent components
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hasCompletedOnboarding) {
    return <Onboarding />;
  }

  return <Feed />;
};

export default Index;

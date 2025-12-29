import { useAppStore } from '@/lib/store';
import Onboarding from './Onboarding';
import Feed from './Feed';

const Index = () => {
  const { hasCompletedOnboarding } = useAppStore();

  if (!hasCompletedOnboarding) {
    return <Onboarding />;
  }

  return <Feed />;
};

export default Index;

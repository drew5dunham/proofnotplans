import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Infinity, BellOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function Paywall() {
  const { showPaywall, setShowPaywall, upgradeToPremium } = useAppStore();

  if (!showPaywall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/80 z-50 flex items-end justify-center p-4"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-background w-full max-w-md p-6 space-y-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Go Unlimited</h2>
              <p className="text-sm text-muted-foreground mt-1">
                3 active goals is the free limit.
              </p>
            </div>
            <button
              onClick={() => setShowPaywall(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted">
              <div className="w-8 h-8 bg-accent text-accent-foreground flex items-center justify-center">
                <Infinity size={18} />
              </div>
              <div>
                <p className="font-medium text-sm">Unlimited goals</p>
                <p className="text-xs text-muted-foreground">No limit on active goals</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted">
              <div className="w-8 h-8 bg-accent text-accent-foreground flex items-center justify-center">
                <BellOff size={18} />
              </div>
              <div>
                <p className="font-medium text-sm">No ads, ever</p>
                <p className="text-xs text-muted-foreground">Clean, focused experience</p>
              </div>
            </div>
          </div>

          <div className="text-center py-4 border-y border-border">
            <span className="text-3xl font-bold">$3.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>

          <Button onClick={upgradeToPremium} className="w-full" size="lg">
            <Check size={18} className="mr-2" />
            Upgrade Now
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. No questions asked.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

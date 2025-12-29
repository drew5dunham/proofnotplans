import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Shield, Target } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

const slides = [
  {
    icon: Shield,
    title: 'Only completions. Nothing else.',
    description: 'This app has one rule: you cannot post intentions, plans, or motivation. You can only share what you have already done.',
  },
  {
    icon: Target,
    title: 'Set goals. Complete them. Post.',
    description: 'Create up to 3 active goals. When you finish one, mark it complete. That unlocks your ability to post.',
  },
  {
    icon: Check,
    title: 'Accountability through action.',
    description: 'Your feed shows real work from real people. No filters. No excuses. Just proof.',
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setOnboardingComplete } = useAppStore();

  const isLastSlide = currentSlide === slides.length - 1;
  const CurrentIcon = slides[currentSlide].icon;

  const handleNext = () => {
    if (isLastSlide) {
      setOnboardingComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="w-16 h-16 bg-primary text-primary-foreground flex items-center justify-center">
              <CurrentIcon size={28} strokeWidth={2} />
            </div>

            <div className="space-y-4">
              <h1 className="text-2xl font-bold leading-tight text-balance">
                {slides[currentSlide].title}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-12 space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 transition-all duration-300 ${
                i === currentSlide ? 'w-6 bg-foreground' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <Button onClick={handleNext} className="w-full" size="lg">
          {isLastSlide ? (
            <>
              Get Started
              <Check size={18} className="ml-2" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={18} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

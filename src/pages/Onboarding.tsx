import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Shield, Target, Camera, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOnboardingComplete } = useAppStore();

  const isLastSlide = currentSlide === slides.length - 1;
  const CurrentIcon = slides[currentSlide]?.icon;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBuster })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBuster);
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (isLastSlide) {
      setShowProfileSetup(true);
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleFinish = () => {
    setOnboardingComplete();
  };

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 text-center"
          >
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Add a profile photo</h1>
              <p className="text-muted-foreground">
                Help your friends recognize you
              </p>
            </div>

            <div className="flex justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-5xl font-bold text-white overflow-hidden group transition-transform hover:scale-105"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={40} />
                ) : avatarUrl ? (
                  <>
                    <img 
                      src={avatarUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={28} className="text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="group-hover:opacity-0 transition-opacity">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={28} className="text-white" />
                    </div>
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Tap to {avatarUrl ? 'change' : 'add'} your photo
            </p>
          </motion.div>
        </div>

        <div className="px-6 pb-12 space-y-3">
          <Button onClick={handleFinish} className="w-full" size="lg">
            {avatarUrl ? 'Continue' : 'Skip for now'}
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

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
              {CurrentIcon && <CurrentIcon size={28} strokeWidth={2} />}
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
              Set up profile
              <ArrowRight size={18} className="ml-2" />
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

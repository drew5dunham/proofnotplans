import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Camera, Type, Loader2 } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { supabase } from '@/integrations/supabase/client';
import { useGoals, DbGoal, GoalWithStats } from '@/hooks/useGoals';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Category } from '@/types';

interface GoalCardProps {
  goal: DbGoal | GoalWithStats;
  showStats?: boolean;
}

export function GoalCard({ goal, showStats = false }: GoalCardProps) {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [addCaption, setAddCaption] = useState(false);
  const [addPhoto, setAddPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { removeGoal, completeGoal } = useGoals();
  const { toast } = useToast();

  const goalWithStats = goal as GoalWithStats;
  const hasStats = 'completionCount' in goal;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAddPhoto(true);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    setAddPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${goal.id}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('goal-proofs')
      .upload(fileName, photoFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('goal-proofs')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleComplete = async () => {
    setIsUploading(true);

    try {
      let mediaUrl: string | undefined;
      let mediaType: 'photo' | 'text' | undefined;

      if (photoFile) {
        mediaUrl = (await uploadPhoto()) ?? undefined;
        mediaType = 'photo';
      } else if (addCaption && caption) {
        mediaType = 'text';
      }

      completeGoal({
        goalId: goal.id,
        mediaType,
        caption: addCaption && caption ? caption : undefined,
        mediaUrl,
      });

      setShowCompleteModal(false);
      setCaption('');
      setAddCaption(false);
      clearPhoto();
    } catch (error) {
      console.error('Error completing goal:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload photo. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      clearPhoto();
      setCaption('');
      setAddCaption(false);
    }
    setShowCompleteModal(open);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="goal-card"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground leading-snug mb-1">{goal.name}</h3>
            <div className="category-badge">
              <CategoryIcon category={goal.category as Category} size={12} />
              <span>{getCategoryLabel(goal.category as Category)}</span>
            </div>
          </div>
          <button
            onClick={() => removeGoal(goal.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {showStats && hasStats && (
          <div className="flex gap-4 text-xs text-muted-foreground mt-2 mb-3">
            <span>{goalWithStats.completionCount} completions</span>
            {goalWithStats.lastCompleted && (
              <span>
                Last: {new Date(goalWithStats.lastCompleted).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        <Button
          onClick={() => setShowCompleteModal(true)}
          className="w-full mt-3"
          variant="default"
        >
          <Check size={16} className="mr-2" />
          Mark Complete
        </Button>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      <Dialog open={showCompleteModal} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-left">Complete Goal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted">
              <p className="font-semibold">{goal.name}</p>
              <div className="category-badge mt-1">
                <CategoryIcon category={goal.category as Category} size={12} />
                <span>{getCategoryLabel(goal.category as Category)}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Add proof? (optional)
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAddCaption(!addCaption);
                }}
                className={`flex-1 p-3 border transition-colors flex flex-col items-center gap-1 ${
                  addCaption ? 'border-accent bg-accent/10' : 'border-border hover:border-foreground/20'
                }`}
              >
                <Type size={20} />
                <span className="text-xs">Caption</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 p-3 border transition-colors flex flex-col items-center gap-1 ${
                  addPhoto ? 'border-accent bg-accent/10' : 'border-border hover:border-foreground/20'
                }`}
              >
                <Camera size={20} />
                <span className="text-xs">Photo</span>
              </button>
            </div>

            {photoPreview && (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Proof preview"
                  className="w-full h-40 object-cover border border-border"
                />
                <button
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 p-1 bg-background/80 hover:bg-background border border-border"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {addCaption && (
              <Textarea
                placeholder="What did you accomplish?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="resize-none"
                rows={2}
              />
            )}

            <Button 
              onClick={handleComplete} 
              className="w-full" 
              size="lg"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check size={18} className="mr-2" />
                  Post Completion
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

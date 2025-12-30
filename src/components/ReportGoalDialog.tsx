import { useState, useRef } from 'react';
import { Check, X, Camera, Type, Loader2, ChevronRight } from 'lucide-react';
import { CategoryIcon, getCategoryLabel } from './CategoryIcon';
import { supabase } from '@/integrations/supabase/client';
import { useGoals, DbGoal } from '@/hooks/useGoals';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Category } from '@/types';

interface ReportGoalDialogProps {
  trigger: React.ReactNode;
}

type Step = 'select-goal' | 'select-mode' | 'report';

export function ReportGoalDialog({ trigger }: ReportGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('select-goal');
  const [selectedGoal, setSelectedGoal] = useState<DbGoal | null>(null);
  const [modalMode, setModalMode] = useState<'completed' | 'missed'>('completed');
  const [caption, setCaption] = useState('');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatWasHard, setWhatWasHard] = useState('');
  const [addCaption, setAddCaption] = useState(false);
  const [addPhoto, setAddPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { goals, completeGoal } = useGoals();
  const { toast } = useToast();

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
    if (!photoFile || !selectedGoal) return null;

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${selectedGoal.id}-${Date.now()}.${fileExt}`;

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

  const handleSubmit = async () => {
    if (!selectedGoal) return;

    // For "Done", require what went well
    if (modalMode === 'completed' && !whatWentWell.trim()) {
      toast({
        title: 'Reflection required',
        description: 'Please share what went well.',
        variant: 'destructive',
      });
      return;
    }
    
    // For "Not Today", require what was hard
    if (modalMode === 'missed' && !whatWasHard.trim()) {
      toast({
        title: 'Reflection required',
        description: 'Please share what was hard or why you missed it.',
        variant: 'destructive',
      });
      return;
    }

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
        goalId: selectedGoal.id,
        mediaType,
        caption: addCaption && caption ? caption : undefined,
        mediaUrl,
        whatWentWell: whatWentWell.trim() || undefined,
        whatWasHard: whatWasHard.trim() || undefined,
        status: modalMode,
      });

      handleClose();
    } catch (error) {
      console.error('Error posting:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload photo. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setCaption('');
    setWhatWentWell('');
    setWhatWasHard('');
    setAddCaption(false);
    clearPhoto();
    setSelectedGoal(null);
    setStep('select-goal');
    setModalMode('completed');
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  const selectGoal = (goal: DbGoal) => {
    setSelectedGoal(goal);
    setStep('select-mode');
  };

  const selectMode = (mode: 'completed' | 'missed') => {
    setModalMode(mode);
    setStep('report');
  };

  const goBack = () => {
    if (step === 'report') {
      setStep('select-mode');
    } else if (step === 'select-mode') {
      setStep('select-goal');
      setSelectedGoal(null);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-left">
              {step === 'select-goal' && 'Select a Goal'}
              {step === 'select-mode' && 'How did it go?'}
              {step === 'report' && (modalMode === 'completed' ? 'Report: Done' : 'Report: Not Today')}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Select Goal */}
          {step === 'select-goal' && (
            <div className="space-y-2">
              {goals && goals.length > 0 ? (
                goals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => selectGoal(goal)}
                    className="w-full p-3 border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-sm">{goal.name}</p>
                      <div className="category-badge mt-1">
                        <CategoryIcon category={goal.category as Category} size={12} />
                        <span>{getCategoryLabel(goal.category as Category)}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No goals yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add goals first to report on them.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Mode */}
          {step === 'select-mode' && selectedGoal && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 border border-border">
                <p className="font-semibold">{selectedGoal.name}</p>
                <div className="category-badge mt-1">
                  <CategoryIcon category={selectedGoal.category as Category} size={12} />
                  <span>{getCategoryLabel(selectedGoal.category as Category)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => selectMode('completed')}
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                >
                  <Check size={20} className="mr-3 text-green-500" />
                  <div className="text-left">
                    <p className="font-semibold">Done</p>
                    <p className="text-xs text-muted-foreground font-normal">I completed this goal today</p>
                  </div>
                </Button>
                <Button
                  onClick={() => selectMode('missed')}
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                >
                  <X size={20} className="mr-3 text-red-500" />
                  <div className="text-left">
                    <p className="font-semibold">Not Today</p>
                    <p className="text-xs text-muted-foreground font-normal">I couldn't complete it today</p>
                  </div>
                </Button>
              </div>

              <Button variant="ghost" onClick={goBack} className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* Step 3: Report Form */}
          {step === 'report' && selectedGoal && (
            <div className="space-y-4">
              <div className={`p-3 ${modalMode === 'completed' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <p className="font-semibold">{selectedGoal.name}</p>
                <div className="category-badge mt-1">
                  <CategoryIcon category={selectedGoal.category as Category} size={12} />
                  <span>{getCategoryLabel(selectedGoal.category as Category)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {modalMode === 'completed' ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        What went well? *
                      </label>
                      <Textarea
                        placeholder="Share a win or progress..."
                        value={whatWentWell}
                        onChange={(e) => setWhatWentWell(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        What was hard? (optional)
                      </label>
                      <Textarea
                        placeholder="Share a challenge or obstacle..."
                        value={whatWasHard}
                        onChange={(e) => setWhatWasHard(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        What happened? *
                      </label>
                      <Textarea
                        placeholder="Share why you couldn't complete it today..."
                        value={whatWasHard}
                        onChange={(e) => setWhatWasHard(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Any silver lining? (optional)
                      </label>
                      <Textarea
                        placeholder="Did anything still go well?"
                        value={whatWentWell}
                        onChange={(e) => setWhatWentWell(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Add more? (optional)
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
                  placeholder="Add any extra thoughts..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={goBack} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1" 
                  size="lg"
                  disabled={isUploading}
                  variant="default"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      {modalMode === 'completed' ? <Check size={18} className="mr-2" /> : <X size={18} className="mr-2" />}
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

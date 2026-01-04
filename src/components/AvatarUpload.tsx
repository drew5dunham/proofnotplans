import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onUploadComplete?: (url: string) => void;
  editable?: boolean;
}

const sizeClasses = {
  sm: 'w-12 h-12 text-lg',
  md: 'w-20 h-20 text-3xl',
  lg: 'w-28 h-28 text-4xl',
};

export function AvatarUpload({ 
  currentAvatarUrl, 
  size = 'md', 
  onUploadComplete,
  editable = true 
}: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'U';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create a unique file path using user ID
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster to force refresh
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBuster })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBuster);
      onUploadComplete?.(urlWithCacheBuster);
      toast.success('Profile photo updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    setUploading(true);

    try {
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`]);

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(null);
      onUploadComplete?.('');
      toast.success('Profile photo removed');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  const avatarContent = (
    <div className={`relative ${sizeClasses[size]} bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center font-bold text-white overflow-hidden`}>
      {uploading ? (
        <Loader2 className="animate-spin" size={size === 'lg' ? 32 : size === 'md' ? 24 : 16} />
      ) : avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt="Profile" 
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{userName.charAt(0).toUpperCase()}</span>
      )}
      
      {editable && !uploading && (
        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
          <Camera size={size === 'lg' ? 24 : size === 'md' ? 20 : 14} className="text-white" />
        </div>
      )}
    </div>
  );

  if (!editable) {
    return avatarContent;
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={uploading}>
          {avatarContent}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            {avatarUrl ? 'Change photo' : 'Add photo'}
          </DropdownMenuItem>
          {avatarUrl && (
            <DropdownMenuItem onClick={handleRemovePhoto} className="text-destructive">
              <User className="mr-2 h-4 w-4" />
              Remove photo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

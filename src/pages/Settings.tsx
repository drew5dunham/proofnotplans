import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Target, 
  ChevronRight,
  Loader2,
  Mail,
  Lock,
  Trash2,
  Clock,
  Users,
  Eye,
  Archive,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSettings } from '@/hooks/useSettings';
import { useGoals } from '@/hooks/useGoals';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type SettingsSection = 'main' | 'account' | 'notifications' | 'privacy' | 'goals';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, updatePassword, resetPasswordForEmail } = useAuth();
  const { profile, updateProfile, isUpdating: isUpdatingProfile } = useProfile();
  const { settings, updateSettings, isLoading: settingsLoading, isUpdating: isUpdatingSettings } = useSettings();
  const { archiveAllGoals, isArchivingAll } = useGoals();
  
  const [section, setSection] = useState<SettingsSection>('main');
  
  // Account dialogs
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editEmailOpen, setEditEmailOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [archiveAllOpen, setArchiveAllOpen] = useState(false);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const isLoading = settingsLoading;

  const handleBack = () => {
    if (section === 'main') {
      navigate('/profile');
    } else {
      setSection('main');
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    updateProfile({ name: newName.trim() });
    setEditNameOpen(false);
    setNewName('');
    toast.success('Name updated');
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Please enter an email');
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditEmailOpen(false);
    setNewEmail('');
    toast.success('Confirmation email sent to your new address');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (error) {
      toast.error(error.message);
      return;
    }
    setChangePasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    // For now, we'll sign out and show a message about contacting support
    // Full account deletion requires a server-side function with service role
    toast.info('Please contact support to complete account deletion');
    await signOut();
  };

  const handleArchiveAll = async () => {
    await archiveAllGoals();
    setArchiveAllOpen(false);
    toast.success('All goals archived');
  };

  const renderMainMenu = () => (
    <div className="space-y-2">
      {[
        { id: 'account', label: 'Account', icon: User, description: 'Name, email, password' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Push notifications, reminders' },
        { id: 'privacy', label: 'Privacy', icon: Shield, description: 'Profile visibility, friend requests' },
        { id: 'goals', label: 'Goals', icon: Target, description: 'Default visibility, archive' },
        { id: 'support', label: 'Support', icon: HelpCircle, description: 'Get help, contact us' },
      ].map((item, index) => (
        <motion.button
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => {
            if (item.id === 'support') {
              navigate('/support');
            } else {
              setSection(item.id as SettingsSection);
            }
          }}
          className="w-full flex items-center justify-between p-4 bg-card rounded-xl hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <item.icon size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-muted-foreground" />
        </motion.button>
      ))}
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-4">
      <div className="bg-card rounded-xl divide-y divide-border">
        <button
          onClick={() => {
            setNewName(profile?.name || '');
            setEditNameOpen(true);
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <User size={20} className="text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Display Name</p>
              <p className="font-medium">{profile?.name || 'Not set'}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>

        <button
          onClick={() => {
            setNewEmail(user?.email || '');
            setEditEmailOpen(true);
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Mail size={20} className="text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>

        <button
          onClick={() => setChangePasswordOpen(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">Change Password</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>
      </div>

      <button
        onClick={() => setDeleteAccountOpen(true)}
        className="w-full flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
      >
        <Trash2 size={20} />
        <span className="font-medium">Delete Account</span>
      </button>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-4">
      <div className="bg-card rounded-xl divide-y divide-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-muted-foreground" />
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
            </div>
          </div>
          <Switch
            checked={settings?.push_notifications_enabled ?? true}
            onCheckedChange={(checked) => updateSettings({ push_notifications_enabled: checked })}
            disabled={isUpdatingSettings}
          />
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Clock size={20} className="text-muted-foreground" />
            <div>
              <p className="font-medium">Daily Reminder Time</p>
              <p className="text-sm text-muted-foreground">When to remind you about goals</p>
            </div>
          </div>
          <Input
            type="time"
            value={settings?.daily_reminder_time?.slice(0, 5) || '09:00'}
            onChange={(e) => updateSettings({ daily_reminder_time: e.target.value + ':00' })}
            className="w-32"
            disabled={isUpdatingSettings}
          />
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-muted-foreground" />
            <div>
              <p className="font-medium">Friend Activity</p>
              <p className="text-sm text-muted-foreground">When friends complete goals</p>
            </div>
          </div>
          <Switch
            checked={settings?.friend_activity_notifications ?? true}
            onCheckedChange={(checked) => updateSettings({ friend_activity_notifications: checked })}
            disabled={isUpdatingSettings}
          />
        </div>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-4">
      <div className="bg-card rounded-xl divide-y divide-border">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Eye size={20} className="text-muted-foreground" />
            <div>
              <p className="font-medium">Profile Visibility</p>
              <p className="text-sm text-muted-foreground">Who can see your profile</p>
            </div>
          </div>
          <Select
            value={settings?.profile_visibility || 'friends_and_groups'}
            onValueChange={(value: 'public' | 'friends_and_groups' | 'private') => 
              updateSettings({ profile_visibility: value })
            }
            disabled={isUpdatingSettings}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Everyone</SelectItem>
              <SelectItem value="friends_and_groups">Friends & Group Members</SelectItem>
              <SelectItem value="private">Only Me</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-muted-foreground" />
            <div>
              <p className="font-medium">Friend Requests</p>
              <p className="text-sm text-muted-foreground">Anyone can send you friend requests</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGoalsSection = () => (
    <div className="space-y-4">
      <div className="bg-card rounded-xl divide-y divide-border">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Eye size={20} className="text-muted-foreground" />
            <div>
              <p className="font-medium">Default Goal Visibility</p>
              <p className="text-sm text-muted-foreground">Visibility for new goals</p>
            </div>
          </div>
          <Select
            value={settings?.default_goal_visibility || 'public'}
            onValueChange={(value: 'public' | 'private') => 
              updateSettings({ default_goal_visibility: value })
            }
            disabled={isUpdatingSettings}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <button
        onClick={() => setArchiveAllOpen(true)}
        className="w-full flex items-center gap-3 p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
      >
        <Archive size={20} className="text-muted-foreground" />
        <div className="text-left">
          <p className="font-medium">Archive All Goals</p>
          <p className="text-sm text-muted-foreground">Move all active goals to archive</p>
        </div>
      </button>
    </div>
  );

  const getSectionTitle = () => {
    switch (section) {
      case 'account': return 'Account';
      case 'notifications': return 'Notifications';
      case 'privacy': return 'Privacy';
      case 'goals': return 'Goals';
      default: return 'Settings';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">{getSectionTitle()}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {section === 'main' && renderMainMenu()}
            {section === 'account' && renderAccountSection()}
            {section === 'notifications' && renderNotificationsSection()}
            {section === 'privacy' && renderPrivacySection()}
            {section === 'goals' && renderGoalsSection()}
          </>
        )}
      </main>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Display Name</DialogTitle>
            <DialogDescription>Enter your new display name</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Your name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateName} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog open={editEmailOpen} onOpenChange={setEditEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>A confirmation will be sent to your new email</DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@email.com"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateEmail}>Send Confirmation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your new password</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
              Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive All Goals Dialog */}
      <AlertDialog open={archiveAllOpen} onOpenChange={setArchiveAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive All Goals</AlertDialogTitle>
            <AlertDialogDescription>
              This will move all your active goals to the archive. You can view them in Past Goals on your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveAll} disabled={isArchivingAll}>
              {isArchivingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Archive All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

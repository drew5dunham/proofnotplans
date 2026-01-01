import { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryIcon, getCategoryLabel, CATEGORIES } from '@/components/CategoryIcon';
import { useGroups } from '@/hooks/useGroups';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Category } from '@/types';

interface CreateGroupDialogProps {
  trigger?: React.ReactNode;
}

export function CreateGroupDialog({ trigger }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('fitness');
  const { createGroup, isCreating } = useGroups();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGroup(
      { name: name.trim(), category },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setCategory('fitness');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Plus size={16} className="mr-1" />
            New Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} />
            Create Group
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Group Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Shred 2026"
              maxLength={50}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-2 border flex flex-col items-center gap-1 text-xs transition-colors ${
                    category === cat
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-foreground/20'
                  }`}
                >
                  <CategoryIcon category={cat} size={18} />
                  <span className="capitalize">{getCategoryLabel(cat)}</span>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!name.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Create Group'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

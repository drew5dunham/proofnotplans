import { Users, Globe } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { CategoryIcon } from '@/components/CategoryIcon';
import type { Category } from '@/types';

interface GroupFilterProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
}

export function GroupFilter({ selectedGroupId, onSelectGroup }: GroupFilterProps) {
  const { groups } = useGroups();

  if (groups.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelectGroup(null)}
        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium whitespace-nowrap rounded-full transition-colors ${
          selectedGroupId === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-card hover:bg-muted text-muted-foreground'
        }`}
      >
        <Globe size={14} />
        All
      </button>
      
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onSelectGroup(group.id)}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium whitespace-nowrap rounded-full transition-colors ${
            selectedGroupId === group.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-card hover:bg-muted text-muted-foreground'
          }`}
        >
          <CategoryIcon category={group.category as Category} size={14} />
          {group.name}
        </button>
      ))}
    </div>
  );
}

import React from 'react';
import { NoonStoreManagement } from '@/components/NoonStoreManagement';
import { NoonStore } from '@/hooks/useNoonStores';
import { Store } from 'lucide-react';

interface NoonStoresTabProps {
  stores: NoonStore[];
  selectedStoreId: string;
  onStoreChange: (id: string) => void;
}

export function NoonStoresTab({ stores, selectedStoreId, onStoreChange }: NoonStoresTabProps) {
  const activeCount = stores.filter(s => s.is_active).length;
  const inactiveCount = stores.length - activeCount;

  return (
    <div className="space-y-4">
      {/* Stat Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Total Stores</span>
          <span className="text-sm font-semibold text-foreground">{stores.length}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Active</span>
          <span className="text-sm font-semibold text-foreground">{activeCount}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="text-xs text-muted-foreground">Inactive</span>
          <span className="text-sm font-semibold text-foreground">{inactiveCount}</span>
        </div>
      </div>

      {/* Store Management */}
      <div className="rounded-xl bg-card border border-border p-4">
        <NoonStoreManagement selectedStoreId={selectedStoreId} onStoreChange={onStoreChange} />
      </div>
    </div>
  );
}

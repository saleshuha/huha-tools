import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';

export function CountrySwitcher() {
  const { profile, loading } = useUserProfile();

  // Always show with UAE as default while loading
  const country = profile?.country || 'UAE';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Country:</span>
      <Badge variant="outline" className="font-medium">
        {country}
      </Badge>
    </div>
  );
}
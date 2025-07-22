import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';

export function CountrySwitcher() {
  const { profile, loading } = useUserProfile();

  console.log('CountrySwitcher: profile=', profile, 'loading=', loading);

  if (loading) {
    console.log('CountrySwitcher: Still loading...');
    return null;
  }
  
  if (!profile) {
    console.log('CountrySwitcher: No profile found');
    return null;
  }

  console.log('CountrySwitcher: Rendering with country:', profile.country);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Country:</span>
      <Badge variant="outline" className="font-medium">
        {profile.country}
      </Badge>
    </div>
  );
}
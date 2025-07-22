import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const countries = [
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦' }
];

export function CountrySwitcher() {
  const [selectedCountry, setSelectedCountry] = useState('UAE');

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-foreground">Country:</span>
      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
        <SelectTrigger className="w-[180px] h-10 bg-background border-2 border-border hover:border-primary transition-colors">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-lg">{countries.find(c => c.code === selectedCountry)?.flag}</span>
              <span className="font-medium">{selectedCountry}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {countries.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span className="font-medium">{country.code}</span>
                <span className="text-sm text-muted-foreground">({country.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
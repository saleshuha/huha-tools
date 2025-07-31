import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountry } from '@/contexts/CountryContext';

const countries = [
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦' }
];

export function CountrySwitcher() {
  const { selectedCountry, setSelectedCountry } = useCountry();

  return (
    <div className="flex items-center gap-3 bg-primary/5 px-3 py-2 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2">
        <span className="text-lg">🌍</span>
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Country:</span>
      </div>
      <Select value={selectedCountry} onValueChange={(value: 'UAE' | 'KSA') => setSelectedCountry(value)}>
        <SelectTrigger className="w-[140px] h-10 bg-background border border-primary/30 hover:border-primary transition-colors">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-lg">{countries.find(c => c.code === selectedCountry)?.flag}</span>
              <span className="font-semibold text-sm text-primary">{selectedCountry}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[140px] z-50">
          {countries.map((country) => (
            <SelectItem key={country.code} value={country.code} className="h-10">
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span className="font-semibold text-sm">{country.code}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, ChevronDown, ChevronUp, Save } from 'lucide-react';

interface VendorInfo {
  name: string;
  email: string;
}

interface VendorInfoFormProps {
  linkToken: string;
  onSave?: (info: VendorInfo) => void;
}

const STORAGE_KEY_PREFIX = 'purchase_link_vendor_';

export function VendorInfoForm({ linkToken, onSave }: VendorInfoFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({ name: '', email: '' });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${linkToken}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setVendorInfo(parsed);
        setIsSaved(true);
      } catch {
        // Ignore parse errors
      }
    }
  }, [linkToken]);

  const handleSave = () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${linkToken}`, JSON.stringify(vendorInfo));
    setIsSaved(true);
    onSave?.(vendorInfo);
  };

  const hasChanges = !isSaved || (
    vendorInfo.name !== '' || vendorInfo.email !== ''
  );

  return (
    <Card className="p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Your Information</span>
              {isSaved && vendorInfo.name && (
                <span className="text-sm text-muted-foreground">({vendorInfo.name})</span>
              )}
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Optionally provide your information so we know who made the updates.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Your Name</Label>
              <Input
                id="vendor-name"
                placeholder="John Doe"
                value={vendorInfo.name}
                onChange={(e) => {
                  setVendorInfo(prev => ({ ...prev, name: e.target.value }));
                  setIsSaved(false);
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendor-email">Email (optional)</Label>
              <Input
                id="vendor-email"
                type="email"
                placeholder="john@example.com"
                value={vendorInfo.email}
                onChange={(e) => {
                  setVendorInfo(prev => ({ ...prev, email: e.target.value }));
                  setIsSaved(false);
                }}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={!vendorInfo.name || isSaved}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaved ? 'Saved' : 'Save Information'}
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function getStoredVendorInfo(linkToken: string): VendorInfo | null {
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${linkToken}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

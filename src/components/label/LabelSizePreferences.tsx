import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Printer } from 'lucide-react';
import { toast } from 'sonner';

export const LabelSizePreferences: React.FC = () => {
  const [labelSize, setLabelSize] = useState<string>('4x3');
  const [dpi, setDpi] = useState<string>('203');
  const [autoSize, setAutoSize] = useState<boolean>(true);

  useEffect(() => {
    // Load saved preferences
    const savedLabelSize = localStorage.getItem('preferredLabelSize') || '4x3';
    const savedDPI = localStorage.getItem('preferredDPI') || '203';
    const savedAutoSize = localStorage.getItem('autoSizeEnabled') === 'true';
    
    setLabelSize(savedLabelSize);
    setDpi(savedDPI);
    setAutoSize(savedAutoSize);
  }, []);

  const handleSave = () => {
    localStorage.setItem('preferredLabelSize', labelSize);
    localStorage.setItem('preferredDPI', dpi);
    localStorage.setItem('autoSizeEnabled', autoSize.toString());
    
    toast.success('Label preferences saved successfully!');
  };

  const labelSizeOptions = [
    { value: '4x6', label: '4" × 6" (Shipping Labels)' },
    { value: '4x3', label: '4" × 3" (Standard)' },
    { value: '3x2', label: '3" × 2" (Medium)' },
    { value: '2x1', label: '2" × 1" (Small)' }
  ];

  const dpiOptions = [
    { value: '203', label: '203 DPI (Standard)' },
    { value: '300', label: '300 DPI (High Quality)' }
  ];

  return (
    <Card className="border-2 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Label Size Preferences
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure default label sizes and printing preferences for inventory labels
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-size-toggle" className="text-sm font-medium">
                Auto-size from Template
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically determine label size based on template dimensions
              </p>
            </div>
            <Switch
              id="auto-size-toggle"
              checked={autoSize}
              onCheckedChange={setAutoSize}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="label-size" className="text-sm font-medium">
              Default Label Size
            </Label>
            <Select value={labelSize} onValueChange={setLabelSize} disabled={autoSize}>
              <SelectTrigger>
                <SelectValue placeholder="Select label size" />
              </SelectTrigger>
              <SelectContent>
                {labelSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {autoSize && (
              <p className="text-xs text-muted-foreground">
                Auto-sizing is enabled. Label size will be determined from template dimensions.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dpi" className="text-sm font-medium">
              Print Resolution (DPI)
            </Label>
            <Select value={dpi} onValueChange={setDpi}>
              <SelectTrigger>
                <SelectValue placeholder="Select DPI" />
              </SelectTrigger>
              <SelectContent>
                {dpiOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Higher DPI provides better quality but may print slower
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Save Label Preferences
          </Button>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Current Settings Preview</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Label Size:</span>{' '}
              {autoSize ? 'Auto (from template)' : labelSizeOptions.find(o => o.value === labelSize)?.label}
            </div>
            <div>
              <span className="text-muted-foreground">Resolution:</span>{' '}
              {dpiOptions.find(o => o.value === dpi)?.label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
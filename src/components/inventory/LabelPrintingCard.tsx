import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Zap, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabelPrintingCardProps {
  availableTemplates: any[];
  selectedTemplate: string | null;
  onTemplateChange: (templateId: string) => void;
  printDarkness: number;
  onDarknessChange: (value: number) => void;
  selectedItemsCount: number;
  qzConnected: boolean;
  onPrint: () => void;
}

export function LabelPrintingCard({
  availableTemplates,
  selectedTemplate,
  onTemplateChange,
  printDarkness,
  onDarknessChange,
  selectedItemsCount,
  qzConnected,
  onPrint
}: LabelPrintingCardProps) {
  const canPrint = qzConnected && selectedTemplate && selectedItemsCount > 0;

  return (
    <Card className={cn(
      'border-l-4 border-l-purple-500 overflow-hidden',
      'bg-gradient-to-r from-purple-500/5 to-transparent',
      'hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300'
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Printer className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-wide">LABEL PRINTING</h3>
            <p className="text-xs text-muted-foreground">
              {qzConnected ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <Zap className="w-3 h-3" />
                  QZ Tray Connected
                </span>
              ) : (
                <span className="text-orange-500">QZ Tray Not Connected</span>
              )}
            </p>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Settings2 className="w-3 h-3" />
              Template
            </Label>
            <Select value={selectedTemplate || ''} onValueChange={onTemplateChange}>
              <SelectTrigger className="h-10 bg-background border-border/60">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg">
                {availableTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Darkness Control */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Print Darkness
            </Label>
            <div className="bg-background rounded-lg p-3 border border-border/60">
              <Slider
                value={[printDarkness]}
                onValueChange={(value) => onDarknessChange(value[0])}
                max={30}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="text-muted-foreground">Light</span>
                <Badge variant="secondary" className="font-mono font-bold px-2 py-0.5">
                  {printDarkness}
                </Badge>
                <span className="text-muted-foreground">Dark</span>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground opacity-0">Action</Label>
            <Button
              onClick={onPrint}
              disabled={!canPrint}
              className={cn(
                'w-full h-10 font-semibold transition-all duration-300',
                selectedItemsCount > 0 
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20' 
                  : 'bg-muted'
              )}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Selected
              {selectedItemsCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-white/20 text-white"
                >
                  {selectedItemsCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

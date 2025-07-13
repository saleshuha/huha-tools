import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileSpreadsheet } from 'lucide-react';

interface SheetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSheet: (sheetName: string) => void;
  sheetNames: string[];
  fileName: string;
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({
  isOpen,
  onClose,
  onSelectSheet,
  sheetNames,
  fileName
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <span>Select Sheet</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The file <span className="font-medium">{fileName}</span> contains multiple sheets. 
            Please select which sheet to use for column mapping:
          </p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sheetNames.map((sheetName, index) => (
              <Card 
                key={sheetName} 
                className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSelectSheet(sheetName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <span className="font-medium">{sheetName}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    Select
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, ArrowLeft } from 'lucide-react';

interface SheetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSheet: (sheetName: string, headerRow: number) => void;
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
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState<number>(1);

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
  };

  const handleConfirm = () => {
    if (selectedSheet) {
      onSelectSheet(selectedSheet, headerRow);
      // Reset state
      setSelectedSheet(null);
      setHeaderRow(1);
    }
  };

  const handleBack = () => {
    setSelectedSheet(null);
  };

  const handleClose = () => {
    setSelectedSheet(null);
    setHeaderRow(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {selectedSheet && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="p-1 mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <span>{selectedSheet ? 'Select Header Row' : 'Select Sheet'}</span>
          </DialogTitle>
        </DialogHeader>
        
        {!selectedSheet ? (
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
                  onClick={() => handleSheetSelect(sheetName)}
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
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selected sheet: <span className="font-medium">{selectedSheet}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Please specify which row contains the column headers:
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="headerRow">Header Row Number</Label>
              <Input
                id="headerRow"
                type="number"
                min="1"
                value={headerRow}
                onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
                placeholder="Enter row number (e.g., 1)"
              />
              <p className="text-xs text-muted-foreground">
                Row 1 is the first row in the spreadsheet
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirm
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
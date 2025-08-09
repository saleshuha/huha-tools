import React from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkProcessingSettings } from '@/types/file-upload';

interface BulkProcessingSettingsProps {
  settings: BulkProcessingSettings;
  onSettingsChange: (settings: BulkProcessingSettings) => void;
  selectedCountry: string;
}

export const BulkProcessingSettingsPanel: React.FC<BulkProcessingSettingsProps> = ({
  settings,
  onSettingsChange,
  selectedCountry
}) => {
  const updateSetting = (key: keyof BulkProcessingSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="text-sm font-medium">Thread Count</label>
          <Select
            value={settings.threadCount.toString()}
            onValueChange={(value) => updateSetting('threadCount', parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Threads</SelectItem>
              <SelectItem value="4">4 Threads</SelectItem>
              <SelectItem value="6">6 Threads</SelectItem>
              <SelectItem value="8">8 Threads</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Batch Size</label>
          <Select
            value={settings.batchSize.toString()}
            onValueChange={(value) => updateSetting('batchSize', parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="500">500 rows</SelectItem>
              <SelectItem value="1000">1,000 rows</SelectItem>
              <SelectItem value="2000">2,000 rows</SelectItem>
              <SelectItem value="5000">5,000 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Duplicate Handling</label>
          <Select
            value={settings.duplicateHandling}
            onValueChange={(value: 'skip' | 'update' | 'error') => 
              updateSetting('duplicateHandling', value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Skip Duplicates</SelectItem>
              <SelectItem value="update">Update Existing</SelectItem>
              <SelectItem value="error">Error on Duplicate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Validation Level</label>
          <Select
            value={settings.validationLevel}
            onValueChange={(value: 'basic' | 'strict') => 
              updateSetting('validationLevel', value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic Validation</SelectItem>
              <SelectItem value="strict">Strict Validation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Country</label>
          <Select value={selectedCountry} disabled>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UAE">UAE</SelectItem>
              <SelectItem value="KSA">KSA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};
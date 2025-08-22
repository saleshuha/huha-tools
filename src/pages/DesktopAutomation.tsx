import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationSettings } from '@/components/automation/AutomationSettings';
import { SingleUpload } from '@/components/automation/SingleUpload';
import { BulkUploadQueue } from '@/components/automation/BulkUploadQueue';
import { UploadProgress } from '@/components/automation/UploadProgress';
import { UploadLogs } from '@/components/automation/UploadLogs';
import { SelectorPicker } from '@/components/automation/SelectorPicker';
import { Bot, Settings, Upload, FileStack, BarChart3, FileText, MousePointer } from 'lucide-react';

export const DesktopAutomation = () => {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Desktop Automation</h1>
          <p className="text-muted-foreground">
            Automated file upload system for Noon Partners platform
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="picker" className="flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            Selector Picker
          </TabsTrigger>
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Single Upload
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            Bulk Queue
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Configuration</CardTitle>
              <CardDescription>
                Configure login credentials, selectors, and automation settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutomationSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="picker" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Element Selector Picker</CardTitle>
              <CardDescription>
                Capture selectors from live webpages and map them to automation fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SelectorPicker />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Single File Upload</CardTitle>
              <CardDescription>
                Upload one file at a time with immediate processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SingleUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Queue</CardTitle>
              <CardDescription>
                Manage multiple files in a sequential upload queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkUploadQueue />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Progress</CardTitle>
              <CardDescription>
                Real-time tracking of upload status and queue progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadProgress />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Logs</CardTitle>
              <CardDescription>
                View detailed logs of all upload attempts and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadLogs />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
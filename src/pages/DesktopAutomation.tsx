import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationSettings } from '@/components/automation/AutomationSettings';
import { SelectorPicker } from '@/components/automation/SelectorPicker';
import { AutomationActivity } from '@/components/automation/AutomationActivity';
import { Bot, Settings, MousePointer, Activity } from 'lucide-react';

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="picker" className="flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            Selector Picker
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Configuration</CardTitle>
              <CardDescription>
                Configure site-specific selectors and automation settings using the companion browser extension
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
                Install the companion browser extension to capture accurate element selectors from live webpages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SelectorPicker />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Activity</CardTitle>
              <CardDescription>
                Monitor real-time automation runs, captured elements, and system activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutomationActivity />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
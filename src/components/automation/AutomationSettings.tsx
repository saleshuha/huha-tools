import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Globe, Lock, Code, Bell, Save } from 'lucide-react';

interface AutomationConfig {
  credentials: {
    username: string;
    password: string;
    saveCredentials: boolean;
  };
  selectors: {
    loginButton: string;
    usernameField: string;
    passwordField: string;
    uploadButton: string;
    fileInput: string;
    errorMessage: string;
    successMessage: string;
  };
  settings: {
    retryInterval: number;
    maxRetries: number;
    cleanupDelay: number;
    enableNotifications: boolean;
    enableLogs: boolean;
  };
}

const defaultConfig: AutomationConfig = {
  credentials: {
    username: '',
    password: '',
    saveCredentials: false,
  },
  selectors: {
    loginButton: 'button[type="submit"]',
    usernameField: 'input[type="email"], input[name="username"]',
    passwordField: 'input[type="password"]',
    uploadButton: 'button[data-upload], .upload-button',
    fileInput: 'input[type="file"]',
    errorMessage: '.error, .alert-error, [role="alert"]',
    successMessage: '.success, .alert-success',
  },
  settings: {
    retryInterval: 5,
    maxRetries: 5,
    cleanupDelay: 60,
    enableNotifications: true,
    enableLogs: true,
  },
};

export const AutomationSettings = () => {
  const [config, setConfig] = useState<AutomationConfig>(defaultConfig);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('automation-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved config:', error);
      }
    }
  }, []);

  const saveConfig = () => {
    try {
      localStorage.setItem('automation-config', JSON.stringify(config));
      toast({
        title: "Settings Saved",
        description: "Automation configuration has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    toast({
      title: "Testing Connection",
      description: "This feature will be implemented in the desktop version.",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="selectors" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Selectors
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Login Credentials</CardTitle>
              <CardDescription>
                Configure your Noon Partners login credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username/Email</Label>
                <Input
                  id="username"
                  type="email"
                  value={config.credentials.username}
                  onChange={(e) => setConfig({
                    ...config,
                    credentials: { ...config.credentials, username: e.target.value }
                  })}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={config.credentials.password}
                  onChange={(e) => setConfig({
                    ...config,
                    credentials: { ...config.credentials, password: e.target.value }
                  })}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="save-credentials"
                  checked={config.credentials.saveCredentials}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    credentials: { ...config.credentials, saveCredentials: checked }
                  })}
                />
                <Label htmlFor="save-credentials">Save credentials locally</Label>
              </div>
              <Button onClick={testConnection} className="w-full">
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="selectors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSS/XPath Selectors</CardTitle>
              <CardDescription>
                Configure selectors for page elements to ensure compatibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username-field">Username Field</Label>
                  <Input
                    id="username-field"
                    value={config.selectors.usernameField}
                    onChange={(e) => setConfig({
                      ...config,
                      selectors: { ...config.selectors, usernameField: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-field">Password Field</Label>
                  <Input
                    id="password-field"
                    value={config.selectors.passwordField}
                    onChange={(e) => setConfig({
                      ...config,
                      selectors: { ...config.selectors, passwordField: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-button">Login Button</Label>
                  <Input
                    id="login-button"
                    value={config.selectors.loginButton}
                    onChange={(e) => setConfig({
                      ...config,
                      selectors: { ...config.selectors, loginButton: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-button">Upload Button</Label>
                  <Input
                    id="upload-button"
                    value={config.selectors.uploadButton}
                    onChange={(e) => setConfig({
                      ...config,
                      selectors: { ...config.selectors, uploadButton: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file-input">File Input</Label>
                  <Input
                    id="file-input"
                    value={config.selectors.fileInput}
                    onChange={(e) => setConfig({
                      ...config,
                      selectors: { ...config.selectors, fileInput: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="error-message">Error Message</Label>
                  <Input
                    id="error-message"
                    value={config.selectors.errorMessage}
                    onChange={(e) => setConfig({
                      ...config,
                      selectors: { ...config.selectors, errorMessage: e.target.value }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>
                Configure retry logic and timing settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retry-interval">Retry Interval (minutes)</Label>
                  <Input
                    id="retry-interval"
                    type="number"
                    min="1"
                    max="60"
                    value={config.settings.retryInterval}
                    onChange={(e) => setConfig({
                      ...config,
                      settings: { ...config.settings, retryInterval: parseInt(e.target.value) || 5 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-retries">Max Retries</Label>
                  <Input
                    id="max-retries"
                    type="number"
                    min="1"
                    max="20"
                    value={config.settings.maxRetries}
                    onChange={(e) => setConfig({
                      ...config,
                      settings: { ...config.settings, maxRetries: parseInt(e.target.value) || 5 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cleanup-delay">Cleanup Delay (minutes)</Label>
                  <Input
                    id="cleanup-delay"
                    type="number"
                    min="1"
                    max="1440"
                    value={config.settings.cleanupDelay}
                    onChange={(e) => setConfig({
                      ...config,
                      settings: { ...config.settings, cleanupDelay: parseInt(e.target.value) || 60 }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-notifications"
                  checked={config.settings.enableNotifications}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    settings: { ...config.settings, enableNotifications: checked }
                  })}
                />
                <Label htmlFor="enable-notifications">Enable desktop notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-logs"
                  checked={config.settings.enableLogs}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    settings: { ...config.settings, enableLogs: checked }
                  })}
                />
                <Label htmlFor="enable-logs">Enable detailed logging</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveConfig} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
};